import {
  ChangeDetectionStrategy,
  Component,
  VERSION,
  ViewEncapsulation,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  RcsBus,
  RcsCard,
  RcsStatusPill,
  navigationRequest,
  noticeRequest,
  type RcsStatusTone,
} from '@rcs/shared-features';

interface SessionReading {
  readonly label: string;
  readonly value: string;
  readonly tone: RcsStatusTone;
}

interface TreatmentSession {
  readonly id: string;
  readonly startedAt: string;
  readonly machine: string;
  readonly state: 'running' | 'completed' | 'alarm';
  readonly readings: readonly SessionReading[];
}

/** Stand-in for the session backend; a real deployment would fetch `apiBaseUrl`. */
const SESSIONS: Readonly<Record<string, readonly TreatmentSession[]>> = {
  'P-1001': [
    {
      id: 'S-88120',
      startedAt: '2026-10-06T07:05:00Z',
      machine: 'Dialog iQ #12',
      state: 'running',
      readings: [
        { label: 'Blood flow', value: '320 ml/min', tone: 'ok' },
        { label: 'UF rate', value: '640 ml/h', tone: 'ok' },
        { label: 'Arterial pressure', value: '-180 mmHg', tone: 'warning' },
        { label: 'Kt/V (online)', value: '1.42', tone: 'ok' },
      ],
    },
    {
      id: 'S-88004',
      startedAt: '2026-10-04T07:02:00Z',
      machine: 'Dialog iQ #12',
      state: 'completed',
      readings: [
        { label: 'Blood flow', value: '310 ml/min', tone: 'neutral' },
        { label: 'UF total', value: '2.4 l', tone: 'neutral' },
        { label: 'Kt/V (online)', value: '1.38', tone: 'neutral' },
      ],
    },
  ],
  'P-1002': [
    {
      id: 'S-90233',
      startedAt: '2026-10-06T12:30:00Z',
      machine: 'Dialog iQ #4',
      state: 'alarm',
      readings: [
        { label: 'Venous pressure', value: '260 mmHg', tone: 'danger' },
        { label: 'Blood flow', value: '180 ml/min', tone: 'warning' },
        { label: 'UF rate', value: '0 ml/h', tone: 'danger' },
      ],
    },
  ],
  'P-1003': [],
};

const STATE_TONE: Readonly<Record<TreatmentSession['state'], RcsStatusTone>> = {
  running: 'ok',
  completed: 'neutral',
  alarm: 'danger',
};

/**
 * Session View microfrontend root.
 *
 * It takes the patient from the Shell-owned `patient-id` attribute, but also
 * follows `patient-selected` events published by a sibling microfrontend. That
 * is the MFE-to-MFE path: PDMS and Session View coordinate without either of
 * them importing the other, and without the Shell mediating domain events.
 */
@Component({
  selector: 'session-view-root',
  standalone: true,
  imports: [RcsCard, RcsStatusPill],
  encapsulation: ViewEncapsulation.ShadowDom,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly route = input('');
  readonly locale = input('en');
  readonly patientId = input('');
  readonly apiBaseUrl = input('');
  readonly mfeId = input('session-view');

  readonly angularVersion = VERSION.full;

  readonly #bus = inject(RcsBus);

  /** Last patient announced on the bus, if any. */
  readonly #followed = signal<{ id: string; label: string } | null>(null);

  readonly followedLabel = computed(() => this.#followed()?.label ?? '');

  /** The bus wins over the attribute: it is the more recent user intent. */
  readonly effectivePatientId = computed(() => this.#followed()?.id || this.patientId());

  readonly sessions = computed<readonly TreatmentSession[]>(
    () => SESSIONS[this.effectivePatientId()] ?? [],
  );

  readonly expandedId = signal<string | null>(null);

  constructor() {
    this.#bus
      .on('patient-selected')
      .pipe(takeUntilDestroyed())
      .subscribe((message) => {
        this.#followed.set({ id: message.patientId, label: message.label });
        this.expandedId.set(null);
      });
  }

  tone(state: TreatmentSession['state']): RcsStatusTone {
    return STATE_TONE[state];
  }

  formatDate(iso: string): string {
    return new Intl.DateTimeFormat(this.locale() || 'en', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  }

  toggle(session: TreatmentSession): void {
    this.expandedId.update((current) => (current === session.id ? null : session.id));
  }

  backToPdms(): void {
    const id = this.effectivePatientId();
    this.#bus.publish(navigationRequest('session-view', id ? `/pdms/${id}` : '/pdms'));
  }

  raiseAlarmNotice(): void {
    const alarms = this.sessions().filter((session) => session.state === 'alarm').length;
    this.#bus.publish(
      noticeRequest(
        'session-view',
        alarms > 0 ? `${alarms} session(s) in alarm state.` : 'No active alarms.',
        alarms > 0 ? 'warning' : 'info',
      ),
    );
  }

  simulateFailure(): void {
    throw new Error('Simulated Session View failure (telemetry stream lost)');
  }
}
