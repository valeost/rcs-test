import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type RcsStatusTone = 'neutral' | 'ok' | 'warning' | 'danger';

/** Small shared status indicator, used by both microfrontends. */
@Component({
  selector: 'rcs-status-pill',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="pill" [attr.data-tone]="tone()">{{ label() }}</span>`,
  styles: `
    .pill {
      display: inline-block;
      padding: 0.125rem 0.5rem;
      border-radius: 999px;
      font-size: 0.6875rem;
      font-weight: 600;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      background: var(--rcs-page, #eef1f4);
      color: var(--rcs-muted, #5a6572);
      border: 1px solid var(--rcs-border, #d7dbe0);
    }

    .pill[data-tone='ok'] {
      background: #e6f4ea;
      color: #1b6b36;
      border-color: #b7dfc4;
    }

    .pill[data-tone='warning'] {
      background: #fff4e0;
      color: #8a5300;
      border-color: #f2d9a8;
    }

    .pill[data-tone='danger'] {
      background: #fdeaea;
      color: var(--rcs-danger, #c92a2a);
      border-color: #f3bfbf;
    }
  `,
})
export class RcsStatusPill {
  readonly label = input.required<string>();
  readonly tone = input<RcsStatusTone>('neutral');
}
