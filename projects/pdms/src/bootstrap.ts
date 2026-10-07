/**
 * The federated entry point of the PDMS microfrontend.
 *
 * It registers exactly one custom element and nothing else. Importing this
 * module is the entire integration contract: whoever imports it gets
 * `<rcs-pdms>` defined, and can then use it from any framework, or none.
 */
import { createApplication } from '@angular/platform-browser';
import { createCustomElement } from '@angular/elements';
import { dispatchMfeFailure, mfeFailure } from '@rcs/shared-features';

import { appConfig } from './app/app.config';
import { App } from './app/app';

const TAG = 'rcs-pdms';

if (!customElements.get(TAG)) {
  createApplication(appConfig)
    .then(({ injector }) => {
      // Re-checked: two concurrent loads of the same remote would otherwise
      // race here and the second `define` would throw.
      if (!customElements.get(TAG)) {
        customElements.define(TAG, createCustomElement(App, { injector }));
      }
    })
    .catch((error: unknown) => {
      dispatchMfeFailure(
        mfeFailure({
          source: 'pdms',
          scenario: 'bootstrap',
          policy: 'quarantine',
          message: error instanceof Error ? error.message : String(error),
        }),
      );
      console.error('[pdms] bootstrap failed', error);
    });
}
