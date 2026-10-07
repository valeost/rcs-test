import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { loadRemoteModule } from '@angular-architects/native-federation-v4';
import { RCS_HOST_CONTEXT_PROPERTY } from '@rcs/shared-features';

import { FailureRegistry } from '../platform/failure-registry';
import { ShellState } from '../platform/shell-state';
import type { RemoteDefinition } from '../platform/remotes';

type OutletState = 'loading' | 'ready' | 'failed' | 'quarantined';

/**
 * The single point at which a microfrontend becomes part of the page.
 *
 * The Shell never imports an Angular symbol from a remote. It imports the
 * remote's entry module purely for the side effect of registering a custom
 * element, then creates that element by tag name. Everything after that is
 * platform API — attributes in, DOM events out — which is why a remote could
 * be rewritten in another framework without this file changing.
 */
@Component({
  selector: 'rcs-mfe-outlet',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (state()) {
      @case ('loading') {
        <p class="status">Loading {{ remote().title }}…</p>
      }
      @case ('failed') {
        <div class="status failure">
          <strong>{{ remote().title }} is unavailable</strong>
          <p>{{ error() }}</p>
          <button type="button" (click)="retry()">Retry</button>
        </div>
      }
      @case ('quarantined') {
        <div class="status failure">
          <strong>{{ remote().title }} has been quarantined</strong>
          <p>It reported an unrecoverable error and will not be remounted in this session.</p>
        </div>
      }
    }

    <!-- Always present: the remote element is appended here imperatively. -->
    <div #host class="host"></div>
  `,
  styles: `
    :host {
      display: block;
    }

    .status {
      border: 1px dashed var(--rcs-border);
      border-radius: var(--rcs-radius);
      padding: 1rem 1.25rem;
      color: var(--rcs-muted);
      font-size: 0.875rem;
    }

    .failure {
      border-style: solid;
      border-color: var(--rcs-danger);
      color: var(--rcs-text);
    }

    .failure p {
      margin: 0.375rem 0 0.75rem;
      color: var(--rcs-muted);
    }

    .failure button {
      font: inherit;
      font-size: 0.8125rem;
      padding: 0.3rem 0.7rem;
      border-radius: 999px;
      border: 1px solid var(--rcs-border);
      background: var(--rcs-surface);
      cursor: pointer;
    }
  `,
})
export class MfeOutlet {
  /** Bound from the route's `data` by `withComponentInputBinding()`. */
  readonly remote = input.required<RemoteDefinition>();

  // Angular queries cannot live on ES `#private` members, so this one is only
  // TypeScript-private.
  private readonly hostRef = viewChild.required<ElementRef<HTMLElement>>('host');
  readonly #failures = inject(FailureRegistry);
  readonly #shell = inject(ShellState);
  readonly #route = inject(ActivatedRoute);

  readonly #element = signal<HTMLElement | null>(null);
  readonly #attempt = signal(0);

  readonly state = signal<OutletState>('loading');
  readonly error = signal('');

  /** The part of the URL the Shell does not interpret and hands to the remote. */
  readonly #routeTail = toSignal(
    this.#route.url.pipe(map((segments) => segments.map((segment) => segment.path).join('/'))),
    { initialValue: '' },
  );

  readonly #quarantined = computed(() => this.#failures.isQuarantined(this.remote().remoteName));

  constructor() {
    // Mount / unmount. `untracked` keeps the body out of the dependency graph:
    // without it, writing `#element` inside the effect would retrigger the
    // effect, whose cleanup would unmount what it had just mounted.
    effect((onCleanup) => {
      const remote = this.remote();
      const quarantined = this.#quarantined();
      this.#attempt();

      untracked(() => {
        if (quarantined) {
          this.#unmount();
          this.state.set('quarantined');
          return;
        }
        void this.#mount(remote);
      });

      onCleanup(() => untracked(() => this.#unmount()));
    });

    // Attribute sync. Shell-side state is the source of truth, so every
    // attribute is rewritten wholesale on any change rather than diffed.
    effect(() => {
      const element = this.#element();
      if (element === null) {
        return;
      }

      element.setAttribute('mfe-id', this.remote().remoteName);
      element.setAttribute('route', this.#routeTail());
      element.setAttribute('locale', this.#shell.locale());
      element.setAttribute('patient-id', this.#shell.patientId());
      element.setAttribute('api-base-url', this.#shell.apiBaseUrl());

      // Anything that is not a string goes through a DOM property instead of
      // an attribute, which keeps the attribute contract free of JSON blobs.
      (element as HTMLElement & Record<string, unknown>)[RCS_HOST_CONTEXT_PROPERTY] =
        this.#shell.hostContext();
    });
  }

  retry(): void {
    this.error.set('');
    this.#attempt.update((value) => value + 1);
  }

  async #mount(remote: RemoteDefinition): Promise<void> {
    if (this.#element() !== null) {
      return;
    }

    this.state.set('loading');

    try {
      // Imported for the side effect only: this is what defines the tag.
      await loadRemoteModule(remote.remoteName, remote.exposedModule);
      await customElements.whenDefined(remote.elementTag);

      const container = this.hostRef().nativeElement;
      const element = document.createElement(remote.elementTag);
      container.appendChild(element);

      this.#element.set(element);
      this.state.set('ready');
    } catch (error: unknown) {
      // Containment: a remote that cannot be loaded degrades its own slot and
      // leaves the rest of the suite running.
      this.error.set(error instanceof Error ? error.message : String(error));
      this.state.set('failed');
      console.error(`[shell] failed to mount ${remote.remoteName}`, error);
    }
  }

  #unmount(): void {
    this.#element()?.remove();
    this.#element.set(null);
  }
}
