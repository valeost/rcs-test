/**
 * @rcs/shared-features
 *
 * Shared feature package consumed by every project in the Renal Care Suite
 * monorepo through the `@rcs/shared-features` tsconfig path mapping.
 *
 * It holds the three things that must look identical in the Shell, PDMS and
 * Session View:
 *   - the cross-project contracts (attributes, channels, message shapes),
 *   - the runtime bus used for MFE -> Shell and MFE -> MFE messaging,
 *   - the shared presentational components.
 *
 * It is deliberately bundled into each project rather than shared as a
 * federated singleton: it contains pure functions, frozen constants and
 * stateless components, so a per-project copy is equivalent and it avoids a
 * bootstrapping dependency on the import map being committed first.
 */

export * from './lib/contracts';
export * from './lib/mfe-bus.service';
export * from './lib/mfe-failure-reporting';
export * from './lib/ui/rcs-card';
export * from './lib/ui/rcs-status-pill';
