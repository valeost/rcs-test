import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideMfeFailureReporting } from '@rcs/shared-features';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideMfeFailureReporting('session-view'),
  ],
};
