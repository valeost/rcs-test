import {
  withNativeFederation,
  shareAll,
  autoShareScope,
} from '@angular-architects/native-federation-v4/config';

export default withNativeFederation({
  name: 'session-view',

  shareScope: autoShareScope({ level: 'major' }),

  // Paths in `exposes` are resolved from the workspace root, not the project
  // root, because one angular.json drives every project in the monorepo.
  exposes: {
    './Component': {
      file: './projects/session-view/src/bootstrap.ts',
      element: 'rcs-session-view',
    },
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
