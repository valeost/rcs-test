import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import {
  RcsBus,
  type NoticeRequest,
  type RcsHostContext,
  RCS_PROTOCOL_VERSION,
} from '@rcs/shared-features';

const PATIENT_IN_URL = /\/(P-\d+)(?:\/|$)/;

/**
 * Shell-owned state.
 *
 * Everything a microfrontend receives as an attribute originates here. That is
 * deliberate: locale, selected patient and API base URL are page-level facts,
 * and if each microfrontend owned its own copy they would drift apart the
 * moment one of them was reloaded.
 *
 * The URL is the source of truth for the patient, not this service — the
 * service only mirrors it, so a deep link and an in-app navigation produce the
 * same state.
 */
@Injectable({ providedIn: 'root' })
export class ShellState {
  readonly #router = inject(Router);
  readonly #bus = inject(RcsBus);
  readonly #destroyRef = inject(DestroyRef);

  readonly locale = signal('en');
  readonly patientId = signal('P-1001');
  readonly apiBaseUrl = signal('http://localhost:4200/api');
  readonly notice = signal<NoticeRequest | null>(null);

  readonly supportedLocales = ['en', 'de', 'es'] as const;

  readonly buildId = `shell-${Date.now().toString(36)}`;

  readonly hostContext = computed<RcsHostContext>(() => ({
    shellBuildId: this.buildId,
    protocol: RCS_PROTOCOL_VERSION,
    features: { showFailureControls: true },
  }));

  /** Wired from the root component so the subscriptions live as long as the app. */
  start(): void {
    const navigation = this.#router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        const match = PATIENT_IN_URL.exec(event.urlAfterRedirects);
        if (match?.[1]) {
          this.patientId.set(match[1]);
        }
      });

    // MFE -> Shell: the Shell owns the URL, so a microfrontend can only ask.
    const navigationRequests = this.#bus.on('navigation-request').subscribe((message) => {
      void this.#router.navigateByUrl(message.path);
    });

    // MFE -> MFE event the Shell also cares about, because it drives the
    // `patient-id` attribute it writes to every other microfrontend.
    const patientSelections = this.#bus.on('patient-selected').subscribe((message) => {
      this.patientId.set(message.patientId);
    });

    const notices = this.#bus.on('notice-request').subscribe((message) => {
      this.notice.set(message);
    });

    this.#destroyRef.onDestroy(() => {
      navigation.unsubscribe();
      navigationRequests.unsubscribe();
      patientSelections.unsubscribe();
      notices.unsubscribe();
    });
  }

  setLocale(locale: string): void {
    this.locale.set(locale);
  }

  dismissNotice(): void {
    this.notice.set(null);
  }
}
