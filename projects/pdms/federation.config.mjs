import {
  withNativeFederation,
  shareAll,
  autoShareScope,
} from '@angular-architects/native-federation-v4/config';

export default withNativeFederation({
  name: 'pdms',

  /**
   * The share scope is derived from this project's own Angular major, so two
   * microfrontends built against different majors can coexist on one page
   * instead of fighting over a single `@angular/core` singleton.
   */
  shareScope: autoShareScope({ level: 'major' }),

  /**
   * A single entry point, exposed as a custom element. The Shell never imports
   * an Angular symbol from here — it only creates `<rcs-pdms>` — which is what
   * keeps the integration framework-neutral.
   */
  // Paths in `exposes` are resolved from the workspace root, not the project
  // root, because one angular.json drives every project in the monorepo.
  exposes: {
    './Component': { file: './projects/pdms/src/bootstrap.ts', element: 'rcs-pdms' },
  },

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
