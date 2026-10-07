/**
 * Shell boot sequence. The order is not negotiable:
 *
 *   1. initFederation(...) — commits the import map
 *   2. import('./bootstrap') — starts Angular
 *
 * Angular cannot be bootstrapped first, because a shared bare specifier is
 * only resolvable after the import map exists, and `initFederation` is what
 * creates it.
 *
 * The manifest is an asset rather than a build-time import, so the remotes'
 * URLs can change between deployments without rebuilding the Shell. Swapping
 * the URL below for a registry endpoint is all that separates this from fully
 * dynamic discovery.
 */
import { initFederation } from '@angular-architects/native-federation-v4';

initFederation('./federation.manifest.json', {
  hostRemoteEntry: { url: './remoteEntry.json' },
})
  .catch((error: unknown) => {
    // Survivable: the Shell's own chrome and routing depend on no remote, so
    // it still starts and each outlet degrades to a placeholder.
    console.error('[shell] initFederation failed', error);
  })
  .then(() => import('./bootstrap'))
  .catch((error: unknown) => {
    // Last resort: Angular itself failed to start, so there is no framework
    // left to render an error with. Write plain DOM.
    console.error('[shell] fatal bootstrap failure', error);
    const root = document.querySelector('rcs-root') ?? document.body;
    root.textContent = `Shell failed to start: ${
      error instanceof Error ? error.message : String(error)
    }`;
  });
