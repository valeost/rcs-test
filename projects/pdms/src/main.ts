/**
 * Standalone entry point.
 *
 * Only used when PDMS runs on its own at :4201. When the Shell loads it, the
 * Shell's own `initFederation` has already committed the import map and
 * `./bootstrap` is reached through the exposed `./Component` instead.
 */
import { initFederation } from '@angular-architects/native-federation-v4';

initFederation(
  {},
  {
    hostRemoteEntry: { url: './remoteEntry.json' },
  },
)
  .catch((err) => console.error(err))
  .then(() => import('./bootstrap'))
  .catch((err) => console.error(err));
