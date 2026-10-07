import {
  withNativeFederation,
  shareAll,
  autoShareScope,
} from '@angular-architects/native-federation-v4/config';

export default withNativeFederation({
  name: 'shell',

  /**
   * Derived from the Shell's own Angular major. Remotes built on the same
   * major negotiate into the same scope and genuinely share one
   * `@angular/core`; a remote on a different major gets its own scope instead
   * of failing a strict-version check. That is what makes version plurality
   * possible without the Shell knowing who is coming.
   */
  shareScope: autoShareScope({ level: 'major' }),

  /** The Shell is a host only — it exposes nothing. */
  shared: {
    ...shareAll(
      { singleton: true, strictVersion: true, requiredVersion: 'auto', build: 'package' },
      {
        overrides: {
          '@angular/core': {
            singleton: true,
            strictVersion: true,
            requiredVersion: 'auto',
            build: 'package',
            includeSecondaries: { keepAll: true },
          },
        },
      },
    ),
  },

  skip: ['rxjs/ajax', 'rxjs/fetch', 'rxjs/testing', 'rxjs/webSocket'],

  features: {
    denseChunking: true,
  },
});
