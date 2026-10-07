/**
 * Cross-project contracts for the Renal Care Suite platform.
 *
 * Every value here is framework-neutral and dependency-free so the Shell and
 * both microfrontends agree on the exact same wire format, attribute names and
 * channel names without any build-time coupling between them.
 */

/** Bumped on every breaking change to the shapes in this file. */
export const RCS_PROTOCOL_VERSION = '1.0.0' as const;

/** Stable identifiers of the microfrontends that can join the suite. */
export const RCS_MFE_IDS = ['pdms', 'session-view'] as const;
export type RcsMfeId = (typeof RCS_MFE_IDS)[number];

/** BroadcastChannel names. Centralised so no project can typo one into silence. */
export const RCS_CHANNEL = {
  /** MFE -> Shell requests and MFE <-> MFE domain events. */
  platform: 'rcs_platform_channel',
} as const;

/** DOM CustomEvent names dispatched on the microfrontend host element. */
export const RCS_DOM_EVENT = {
  /** MFE -> Shell runtime failure report. Bubbles and is composed. */
  failure: 'rcs:mfe-failure',
  /** Shell -> MFE imperative command. Dispatched directly on the host element. */
  command: 'rcs:mfe-command',
} as const;

/**
 * Attributes the Shell writes onto every microfrontend host element.
 *
 * The Shell owns all of this state; a microfrontend must treat these as
 * read-only inputs and re-render whenever they change.
 */
export const RCS_COMMON_ATTRIBUTES = [
  'mfe-id',
  'route',
  'locale',
  'patient-id',
  'api-base-url',
] as const;

export interface RcsHostContext {
  readonly shellBuildId: string;
  readonly protocol: string;
  readonly features: Readonly<Record<string, boolean>>;
}

/** DOM property through which the Shell hands richer context to an MFE. */
export const RCS_HOST_CONTEXT_PROPERTY = 'rcsHostContext' as const;

/* ------------------------------------------------------------------ */
/* Messages                                                            */
/* ------------------------------------------------------------------ */

interface RcsEnvelope {
  readonly protocol: string;
  readonly source: RcsMfeId | 'shell';
  readonly at: string;
}

/** MFE -> Shell: "please navigate the browser here". */
export interface NavigationRequest extends RcsEnvelope {
  readonly type: 'navigation-request';
  readonly path: string;
}

/** MFE -> MFE: "the user selected this patient". */
export interface PatientSelected extends RcsEnvelope {
  readonly type: 'patient-selected';
  readonly patientId: string;
  readonly label: string;
}

/** MFE -> Shell: "show this to the user". */
export interface NoticeRequest extends RcsEnvelope {
  readonly type: 'notice-request';
  readonly message: string;
  readonly severity: 'info' | 'warning' | 'error';
}

export type RcsMessage = NavigationRequest | PatientSelected | NoticeRequest;

const MESSAGE_TYPES: ReadonlySet<string> = new Set([
  'navigation-request',
  'patient-selected',
  'notice-request',
]);

function envelope(source: RcsMfeId | 'shell'): RcsEnvelope {
  return { protocol: RCS_PROTOCOL_VERSION, source, at: new Date().toISOString() };
}

export function navigationRequest(source: RcsMfeId | 'shell', path: string): NavigationRequest {
  return { ...envelope(source), type: 'navigation-request', path };
}

export function patientSelected(
  source: RcsMfeId | 'shell',
  patientId: string,
  label: string,
): PatientSelected {
  return { ...envelope(source), type: 'patient-selected', patientId, label };
}

export function noticeRequest(
  source: RcsMfeId | 'shell',
  message: string,
  severity: NoticeRequest['severity'] = 'info',
): NoticeRequest {
  return { ...envelope(source), type: 'notice-request', message, severity };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Structural validation of anything arriving on the bus.
 *
 * Never throws: a malformed message from a misbehaving (or out-of-date)
 * microfrontend must not be able to take down the receiver.
 */
export function parseRcsMessage(raw: unknown): RcsMessage | null {
  if (!isRecord(raw)) {
    return null;
  }

  const protocol = raw['protocol'];
  if (typeof protocol !== 'string') {
    return null;
  }
  // Major-version compatibility only: 1.x accepts 1.y.
  if (protocol.split('.')[0] !== RCS_PROTOCOL_VERSION.split('.')[0]) {
    return null;
  }

  const type = raw['type'];
  if (typeof type !== 'string' || !MESSAGE_TYPES.has(type)) {
    return null;
  }

  switch (type) {
    case 'navigation-request':
      return typeof raw['path'] === 'string' ? (raw as unknown as NavigationRequest) : null;
    case 'patient-selected':
      return typeof raw['patientId'] === 'string' && typeof raw['label'] === 'string'
        ? (raw as unknown as PatientSelected)
        : null;
    case 'notice-request':
      return typeof raw['message'] === 'string' ? (raw as unknown as NoticeRequest) : null;
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/* Failure reporting                                                   */
/* ------------------------------------------------------------------ */

export const RCS_CONTAINMENT_POLICIES = ['placeholder', 'quarantine', 'blocking'] as const;
export type RcsContainmentPolicy = (typeof RCS_CONTAINMENT_POLICIES)[number];

export interface RcsMfeFailure {
  readonly protocol: string;
  readonly source: RcsMfeId;
  readonly policy: RcsContainmentPolicy;
  readonly scenario: 'bootstrap' | 'render' | 'handler' | 'data';
  readonly message: string;
  readonly at: string;
}

export function mfeFailure(input: {
  source: RcsMfeId;
  policy: RcsContainmentPolicy;
  scenario: RcsMfeFailure['scenario'];
  message: string;
}): RcsMfeFailure {
  return { protocol: RCS_PROTOCOL_VERSION, at: new Date().toISOString(), ...input };
}

/**
 * MFE -> Shell failure report.
 *
 * A bubbling, composed CustomEvent is used rather than the bus because it
 * escapes a Shadow Root and reaches the Shell even when the microfrontend
 * failed before it could construct anything of its own.
 */
export function dispatchMfeFailure(failure: RcsMfeFailure, target: EventTarget = document): void {
  target.dispatchEvent(
    new CustomEvent<RcsMfeFailure>(RCS_DOM_EVENT.failure, {
      detail: failure,
      bubbles: true,
      composed: true,
    }),
  );
}

export function parseMfeFailure(raw: unknown): RcsMfeFailure | null {
  if (!isRecord(raw)) {
    return null;
  }
  const source = raw['source'];
  const policy = raw['policy'];
  const message = raw['message'];
  const isKnownId = typeof source === 'string' && RCS_MFE_IDS.includes(source as RcsMfeId);
  const isKnownPolicy =
    typeof policy === 'string' && RCS_CONTAINMENT_POLICIES.includes(policy as RcsContainmentPolicy);

  return isKnownId && isKnownPolicy && typeof message === 'string'
    ? (raw as unknown as RcsMfeFailure)
    : null;
}
