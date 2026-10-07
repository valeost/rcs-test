import { provideZonelessChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding, withRouterConfig } from '@angular/router';

import { App } from './app/app';
import { routes } from './app/routes';

bootstrapApplication(App, {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(
      routes,
      // Route `data` is bound to component inputs, which is how `MfeOutlet`
      // receives its remote definition without reading the snapshot by hand.
      withComponentInputBinding(),
      // A microfrontend may ask to navigate to the URL it is already on, for
      // example to re-assert state. Dropping that silently would break the
      // request/echo model both sides rely on.
      withRouterConfig({ onSameUrlNavigation: 'reload' }),
    ),
  ],
}).catch((error: unknown) => console.error(error));
