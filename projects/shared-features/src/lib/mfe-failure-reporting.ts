import { ErrorHandler, type Provider } from '@angular/core';

import { dispatchMfeFailure, mfeFailure, type RcsMfeId } from './contracts';

/**
 * Failure containment, microfrontend side.
 *
 * Any error Angular cannot recover from is converted into a platform failure
 * report and handed to the Shell, which decides what the user sees. The
 * microfrontend deliberately does not decide that itself: only the Shell knows
 * what else is on the page and therefore what "contained" means.
 *
 * `placeholder` is the default policy because a single broken panel must not
 * take the rest of the suite down with it.
 */
export function provideMfeFailureReporting(source: RcsMfeId): Provider {
  return {
    provide: ErrorHandler,
    useValue: {
      handleError(error: unknown): void {
        dispatchMfeFailure(
          mfeFailure({
            source,
            scenario: 'render',
            policy: 'placeholder',
            message: error instanceof Error ? error.message : String(error),
          }),
        );
        console.error(`[${source}]`, error);
      },
    } satisfies ErrorHandler,
  };
}
