import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  VERSION,
  ViewEncapsulation,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import {
  RCS_HOST_CONTEXT_PROPERTY,
  RcsBus,
  RcsCard,
  RcsStatusPill,
  navigationRequest,
  noticeRequest,
  patientSelected,
  type RcsHostContext,
  type RcsStatusTone,
} from '@rcs/shared-features';

interface Prescription {
  readonly id: string;
  readonly therapy: string;
  readonly schedule: string;
  readonly dialysate: string;
  readonly status: 'active' | 'draft' | 'stopped';
  readonly updatedAt: string;
}

const PATIENTS: ReadonlyArray<{ id: string; name: string }> = [
  { id: 'P-1001', name: 'A. Fernández' },
  { id: 'P-1002', name: 'M. Keller' },
  { id: 'P-1003', name: 'J. Okonkwo' },
];

/** Stand-in for the PDMS backend; a real deployment would fetch `apiBaseUrl`. */
const PRESCRIPTIONS: Readonly<Record<string, readonly Prescription[]>> = {
  'P-1001': [
    {
      id: 'RX-4410',
      therapy: 'HDF post-dilution',
      schedule: 'Mon / Wed / Fri · 240 min',
      dialysate: 'K 2.0 · Ca 1.5 · Bic 32',
      status: 'active',
      updatedAt: '2026-09-28T08:15:00Z',
    },
    {
      id: 'RX-4388',
      therapy: 'Haemodialysis',
      schedule: 'Mon / Wed / Fri · 210 min',
      dialysate: 'K 3.0 · Ca 1.25 · Bic 34',
      status: 'stopped',
      updatedAt: '2026-06-02T10:40:00Z',
    },
  ],
  'P-1002': [
    {
      id: 'RX-5120',
      therapy: 'Haemodialysis',
      schedule: 'Tue / Thu / Sat · 180 min',
      dialysate: 'K 2.0 · Ca 1.5 · Bic 32',
      status: 'active',
      updatedAt: '2026-10-01T06:05:00Z',
    },
    {
      id: 'RX-5121',
      therapy: 'HDF pre-dilution',
      schedule: 'Tue / Thu / Sat · 200 min',
      dialysate: 'K 2.0 · Ca 1.25 · Bic 32',
      status: 'draft',
      updatedAt: '2026-10-04T14:22:00Z',
    },
  ],
  'P-1003': [],
};

const STATUS_TONE: Readonly<Record<Prescription['status'], RcsStatusTone>> = {
  active: 'ok',
  draft: 'warning',
  stopped: 'neutral',
};

/**
 * PDMS microfrontend root.
 *
 * Shadow DOM encapsulation is not cosmetic: it is what guarantees that neither
 * the Shell nor a sibling microfrontend can restyle this subtree by accident.
 * Theming still works, because the `--rcs-*` custom properties the Shell sets
 * inherit through the Shadow Root.
 */
@Component({
  selector: 'pdms-root',
  standalone: true,
  imports: [RcsCard, RcsStatusPill],
  encapsulation: ViewEncapsulation.ShadowDom,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  /* Shell-owned inputs. Angular Elements maps these to the dash-cased
     attributes `route`, `locale`, `patient-id`, `api-base-url`, `mfe-id`. */
  readonly route = input('');
  readonly locale = input('en');
  readonly patientId = input('');
  readonly apiBaseUrl = input('');
  readonly mfeId = input('pdms');

  readonly angularVersion = VERSION.full;
  readonly patients = PATIENTS;

  readonly #bus = inject(RcsBus);
  readonly #host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement &
    Record<string, unknown>;

  readonly selectedPrescriptionId = signal<string | null>(null);
  readonly lastAction = signal('');

  readonly prescriptions = computed<readonly Prescription[]>(
    () => PRESCRIPTIONS[this.patientId()] ?? [],
  );

  readonly patientName = computed(
    () => PATIENTS.find((patient) => patient.id === this.patientId())?.name ?? 'No patient selected',
  );

  readonly hostContext = computed<RcsHostContext | undefined>(
    () => this.#host[RCS_HOST_CONTEXT_PROPERTY] as RcsHostContext | undefined,
  );

  tone(status: Prescription['status']): RcsStatusTone {
    return STATUS_TONE[status];
  }

  formatDate(iso: string): string {
    return new Intl.DateTimeFormat(this.locale() || 'en', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  }

  select(prescription: Prescription): void {
    this.selectedPrescriptionId.set(prescription.id);
    this.lastAction.set(`Selected ${prescription.id}`);
  }

  /** MFE -> MFE: Session View listens for this and follows along. */
  announcePatient(id: string): void {
    const name = PATIENTS.find((patient) => patient.id === id)?.name ?? id;
    this.#bus.publish(patientSelected('pdms', id, name));
    this.lastAction.set(`Broadcast patient ${id}`);
  }

  /** MFE -> Shell: the Shell owns the URL, so navigation is a request. */
  openSessionView(): void {
    const id = this.patientId();
    this.#bus.publish(navigationRequest('pdms', id ? `/session-view/${id}` : '/session-view'));
  }

  /** MFE -> Shell: user-facing messaging is Shell chrome, not MFE chrome. */
  notifyShell(): void {
    this.#bus.publish(
      noticeRequest('pdms', `PDMS has ${this.prescriptions().length} prescription(s) loaded.`),
    );
  }

  /** Demonstrates failure containment: the Shell quarantines only this panel. */
  simulateFailure(): void {
    throw new Error('Simulated PDMS failure (prescription service unreachable)');
  }
}
