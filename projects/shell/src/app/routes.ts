import type { Routes } from '@angular/router';

import { MfeOutlet } from './mfe-outlet/mfe-outlet';
import { DEFAULT_SEGMENT, REMOTES } from './platform/remotes';

/**
 * The route table is derived from the remote catalogue rather than written out
 * by hand, so adding a microfrontend is a data change, not a routing change.
 *
 * Each segment ends in a `**` child: the Shell owns the first segment and
 * hands everything after it to the microfrontend as an opaque `route`
 * attribute. Neither side needs to know the other's URL grammar.
 */
export const routes: Routes = [
  ...REMOTES.map((remote) => ({
    path: remote.segment,
    children: [{ path: '**', component: MfeOutlet, data: { remote } }],
  })),
  { path: '', pathMatch: 'full' as const, redirectTo: DEFAULT_SEGMENT },
  { path: '**', redirectTo: DEFAULT_SEGMENT },
];
