import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Shared surface used by every feature panel in the suite.
 *
 * It is styled exclusively through the `--rcs-*` custom properties declared by
 * the Shell. Custom properties inherit through a Shadow Root, so the Shell can
 * theme microfrontends it never imported, with no CSS coupling in either
 * direction.
 */
@Component({
  selector: 'rcs-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card">
      <header>
        <h2>{{ heading() }}</h2>
        <ng-content select="[card-actions]" />
      </header>
      @if (subheading()) {
        <p class="sub">{{ subheading() }}</p>
      }
      <div class="body">
        <ng-content />
      </div>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }

    .card {
      background: var(--rcs-surface, #fff);
      border: 1px solid var(--rcs-border, #d7dbe0);
      border-radius: var(--rcs-radius, 10px);
      padding: 1rem 1.25rem;
      font-family: var(--rcs-font, system-ui, sans-serif);
      color: var(--rcs-text, #1b1f23);
    }

    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
    }

    h2 {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
    }

    .sub {
      margin: 0.25rem 0 0;
      color: var(--rcs-muted, #5a6572);
      font-size: 0.8125rem;
    }

    .body {
      margin-top: 0.875rem;
    }
  `,
})
export class RcsCard {
  readonly heading = input.required<string>();
  readonly subheading = input<string>('');
}
