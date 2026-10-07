/**
 * The remote catalogue.
 *
 * Only the *shape* of each microfrontend lives here — its element tag, its
 * exposed module and where it mounts. The URLs do not: those come from
 * `federation.manifest.json`, which is an asset resolved at runtime, so a
 * remote can be redeployed to a different origin without rebuilding the Shell.
 *
 * Replacing this constant with a fetch against a registry service is the only
 * change needed to make discovery fully dynamic.
 */
export interface RemoteDefinition {
  /** Matches the key in `federation.manifest.json` and the remote's `name`. */
  readonly remoteName: string;
  readonly exposedModule: string;
  /** The custom element the remote registers when its module is imported. */
  readonly elementTag: string;
  /** Top-level route segment the Shell mounts it on. */
  readonly segment: string;
  readonly title: string;
}

export const REMOTES: readonly RemoteDefinition[] = [
  {
    remoteName: 'pdms',
    exposedModule: './Component',
    elementTag: 'rcs-pdms',
    segment: 'pdms',
    title: 'PDMS',
  },
  {
    remoteName: 'session-view',
    exposedModule: './Component',
    elementTag: 'rcs-session-view',
    segment: 'session-view',
    title: 'Session View',
  },
];

export const DEFAULT_SEGMENT = REMOTES[0]?.segment ?? 'pdms';
