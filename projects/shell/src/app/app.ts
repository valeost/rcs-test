import { ChangeDetectionStrategy, Component, VERSION, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { FailureRegistry } from './platform/failure-registry';
import { REMOTES } from './platform/remotes';
import { ShellState } from './platform/shell-state';

/**
 * Shell chrome.
 *
 * Everything here is Shell-owned: navigation, locale, user-facing notices and
 * the failure surface. A microfrontend renders none of it, which is what keeps
 * the suite looking like one application rather than three.
 */
@Component({
  selector: 'rcs-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly remotes = REMOTES;
  readonly angularVersion = VERSION.full;

  readonly shell = inject(ShellState);
  readonly failures = inject(FailureRegistry);

  constructor() {
    this.shell.start();
  }

  onLocaleChange(event: Event): void {
    this.shell.setLocale((event.target as HTMLSelectElement).value);
  }

  reload(): void {
    window.location.reload();
  }
}
