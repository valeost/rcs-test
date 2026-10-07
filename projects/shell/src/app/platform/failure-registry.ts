import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import {
  RCS_DOM_EVENT,
  parseMfeFailure,
  type RcsMfeFailure,
  type RcsMfeId,
} from '@rcs/shared-features';

/**
 * Failure containment, Shell side.
 *
 * The Shell is the only party that can decide what a microfrontend failure
 * means for the page, because it is the only party that knows what else is on
 * it. The policy carried in the report is an input to that decision, not the
 * decision itself.
 *
 *   placeholder — show a fallback in that slot, leave everything else alone
 *   quarantine  — unmount it and do not remount it for the rest of the session
 *   blocking    — the user must be told before continuing
 */
@Injectable({ providedIn: 'root' })
export class FailureRegistry {
  readonly #records = signal<readonly RcsMfeFailure[]>([]);

  readonly records = this.#records.asReadonly();

  readonly quarantined = computed(
    () =>
      new Set(
        this.#records()
          .filter((record) => record.policy === 'quarantine')
          .map((record) => record.source),
      ),
  );

  readonly blocking = computed(
    () => this.#records().find((record) => record.policy === 'blocking') ?? null,
  );

  constructor() {
    const listener = (event: Event) => {
      const failure = parseMfeFailure((event as CustomEvent<unknown>).detail);
      if (failure === null) {
        console.warn('[shell] dropped malformed failure report', event);
        return;
      }
      this.record(failure);
    };

    // `composed: true` events cross the Shadow Root boundary and reach here
    // even though the Shell can see nothing else inside a microfrontend.
    document.addEventListener(RCS_DOM_EVENT.failure, listener);
    inject(DestroyRef).onDestroy(() => document.removeEventListener(RCS_DOM_EVENT.failure, listener));
  }

  record(failure: RcsMfeFailure): void {
    this.#records.update((records) => [...records, failure]);
    console.warn(`[shell] ${failure.source} reported ${failure.scenario}: ${failure.message}`);
  }

  isQuarantined(id: string): boolean {
    return this.quarantined().has(id as RcsMfeId);
  }

  clear(): void {
    this.#records.set([]);
  }
}
