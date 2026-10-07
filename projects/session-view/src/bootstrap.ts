/**
 * The federated entry point of the Session View microfrontend.
 * Importing this module defines `<rcs-session-view>` and nothing else.
 */
import { createApplication } from '@angular/platform-browser';
import { createCustomElement } from '@angular/elements';
import { dispatchMfeFailure, mfeFailure } from '@rcs/shared-features';

import { appConfig } from './app/app.config';
import { App } from './app/app';

const TAG = 'rcs-session-view';

if (!customElements.get(TAG)) {
  createApplication(appConfig)
    .then(({ injector }) => {
      if (!customElements.get(TAG)) {
        customElements.define(TAG, createCustomElement(App, { injector }));
      }
    })
    .catch((error: unknown) => {
      dispatchMfeFailure(
        mfeFailure({
          source: 'session-view',
          scenario: 'bootstrap',
          policy: 'quarantine',
          message: error instanceof Error ? error.message : String(error),
        }),
      );
      console.error('[session-view] bootstrap failed', error);
    });
}
