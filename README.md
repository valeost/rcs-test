# Renal Care Suite

Angular monorepo skeleton for a microfrontend suite: one **shell**, two
**microfrontends** (PDMS and Session View) and one **shared features package**
consumed by all three.

Integration uses [`@angular-architects/native-federation-v4`](https://www.npmjs.com/package/@angular-architects/native-federation-v4),
with each microfrontend exposed as a **custom element** rather than an Angular
symbol. The shell therefore never imports an Angular type from a remote, which
is what keeps the integration framework-neutral and lets each microfrontend be
developed, built, deployed and versioned on its own.

## Layout

```
renal-care-suite/
├── angular.json                 one workspace, three buildable projects
├── tsconfig.json                `@rcs/shared-features` path mapping
├── dev.sh                       starts both remotes + the shell
└── projects/
    ├── shared-features/         shared package (contracts, bus, UI)
    │   └── src/
    │       ├── public-api.ts
    │       └── lib/
    │           ├── contracts.ts              messages, attributes, channels
    │           ├── mfe-bus.service.ts        BroadcastChannel bus
    │           ├── mfe-failure-reporting.ts  MFE-side ErrorHandler
    │           └── ui/                       shared presentational components
    ├── pdms/                    microfrontend → <rcs-pdms>        :4201
    ├── session-view/            microfrontend → <rcs-session-view> :4202
    └── shell/                   host application                   :4200
```

## Getting started

```bash
npm install
./dev.sh          # or: npm start
```

Then open <http://localhost:4200/pdms>.

Each project also runs on its own, against the same contract it gets from the
shell (see each `src/index.html`):

```bash
npm run start:pdms           # http://localhost:4201
npm run start:session-view   # http://localhost:4202
npm run start:shell          # http://localhost:4200
```

Production builds:

```bash
npm run build                # remotes first, then the shell
```

## How the pieces fit together

### Remote discovery

The shell reads `projects/shell/public/federation.manifest.json` at runtime:

```json
{
  "pdms": "http://localhost:4201/remoteEntry.json",
  "session-view": "http://localhost:4202/remoteEntry.json"
}
```

Because it is an asset and not a build-time import, a remote can be redeployed
to a different origin without rebuilding the shell. Replacing that URL with a
registry endpoint is the only change needed to make discovery fully dynamic.

The *shape* of each remote (element tag, exposed module, route segment) lives
in `projects/shell/src/app/platform/remotes.ts`, and the route table is derived
from it — adding a microfrontend is a data change, not a routing change.

### Shell → microfrontend

`MfeOutlet` imports the remote entry purely for the side effect of registering
its custom element, creates the element by tag name, and writes the shell-owned
state onto it as attributes:

| attribute      | meaning                          |
| -------------- | -------------------------------- |
| `mfe-id`       | identity of the mounted remote    |
| `route`        | the URL tail the shell does not interpret |
| `locale`       | active locale                     |
| `patient-id`   | selected patient                  |
| `api-base-url` | backend base URL                  |

Non-string context is passed through the `rcsHostContext` DOM property so the
attribute contract stays free of JSON blobs.

### Microfrontend → shell, and microfrontend → microfrontend

Both directions go over a `BroadcastChannel` (`RcsBus`). It is a browser
primitive, so no module instance has to be shared and no side can reach into
another's object graph:

- `navigation-request` — the shell owns the URL, so a microfrontend can only ask.
- `patient-selected` — a domain event; Session View follows PDMS without either importing the other.
- `notice-request` — user-facing messaging is shell chrome, not microfrontend chrome.

Every message is validated structurally with `parseRcsMessage`, which never
throws: a malformed or out-of-date message must not break the receiver.

### Failure containment

A microfrontend reports failures as a bubbling, composed `rcs:mfe-failure`
CustomEvent, which escapes the Shadow Root and reaches the shell even when the
remote failed before it could construct anything of its own. The shell's
`FailureRegistry` applies the policy:

| policy        | effect                                                      |
| ------------- | ----------------------------------------------------------- |
| `placeholder` | fallback in that slot only, everything else keeps running    |
| `quarantine`  | unmounted and not remounted for the rest of the session      |
| `blocking`    | the user is told before continuing                           |

Use the **Simulate failure** buttons in either microfrontend to see it.

### Styling and isolation

Each microfrontend root uses `ViewEncapsulation.ShadowDom`, so neither the
shell nor a sibling can restyle it by accident. Theming still works because the
`--rcs-*` custom properties declared by the shell inherit through a Shadow
Root — one theming contract, zero CSS coupling.

### Version plurality

Every project uses `autoShareScope({ level: 'major' })`. Remotes on the same
Angular major negotiate into the same scope and genuinely share one
`@angular/core`; a remote on a different major gets its own scope instead of
failing a strict-version check. Microfrontends can therefore upgrade Angular
independently.

## Shared features package

`@rcs/shared-features` is mapped in `tsconfig.json` and bundled into each
project rather than shared as a federated singleton. That is deliberate: it
contains pure functions, frozen constants and stateless components, so a
per-project copy is equivalent, and it avoids a bootstrapping dependency on the
import map being committed first.

Add shared code under `projects/shared-features/src/lib/` and re-export it from
`public-api.ts`.

## Adding a microfrontend

1. Copy `projects/pdms` to `projects/<name>`.
2. Set `name`, `exposes` and the element tag in `federation.config.mjs`.
3. Add a project entry to `angular.json` with a free port.
4. Add the remote to `federation.manifest.json` and to `REMOTES`.
