/**
 * Standalone entry point, used only when Session View runs on its own at :4202.
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
