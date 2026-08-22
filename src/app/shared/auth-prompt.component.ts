import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';

import { AuthPromptService } from '../core/auth-prompt.service';
import { IconComponent } from './icon.component';

/**
 * The login overlay from Guest Browsing §7.
 *
 * Mounted once in the app shell so any component can raise it through
 * `AuthPromptService` without owning a dialog of its own. It is an overlay
 * rather than a route so the page behind it stays loaded - the guest can
 * dismiss it and carry on browsing, which is the whole point of §5.
 */
@Component({
  selector: 'app-auth-prompt',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    @if (prompt.current(); as intent) {
      <div class="backdrop" (click)="prompt.dismiss()">
        <div
          class="sheet card"
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="copy(intent).title"
          (click)="$event.stopPropagation()"
        >
          <div class="card-body">
            <button type="button" class="close" (click)="prompt.dismiss()" aria-label="Close"><app-icon name="close-outline" [size]="16" /></button>

            <span class="icon"><app-icon [name]="copy(intent).icon" [size]="26" /></span>
            <h3>{{ copy(intent).title }}</h3>
            <p class="muted">{{ copy(intent).message }}</p>

            <div class="actions">
              <button type="button" class="btn" (click)="prompt.proceed('login')">Login</button>
              <button type="button" class="btn btn-secondary" (click)="prompt.proceed('register')">
                Sign Up
              </button>
            </div>

            <button type="button" class="link-btn" (click)="prompt.dismiss()">
              Continue browsing as guest
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .backdrop {
        position: fixed;
        inset: 0;
        background: rgba(20, 22, 31, 0.5);
        display: grid;
        place-items: center;
        z-index: 950;
        padding: 1rem;
        animation: fade-in var(--fast) var(--ease);
      }

      @supports (backdrop-filter: blur(4px)) {
        .backdrop {
          backdrop-filter: blur(5px);
          -webkit-backdrop-filter: blur(5px);
        }
      }

      .sheet {
        position: relative;
        width: 100%;
        max-width: 400px;
        box-shadow: var(--shadow-lg);
        animation: sheet-in 300ms var(--ease-spring);
        text-align: center;
      }

      /* A tinted disc behind the glyph, so the sheet opens on something with
         presence rather than a lone hairline drawing. */
      .icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 52px;
        height: 52px;
        margin-bottom: 0.6rem;
        border-radius: 50%;
        background: var(--brand-tint, var(--surface-alt));
        color: var(--brand);
      }

      h3 {
        margin: 0 0 0.35rem;
      }

      .actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.5rem;
        margin-top: 1.25rem;
      }

      .actions .btn {
        width: 100%;
        justify-content: center;
      }

      .link-btn {
        margin-top: 0.75rem;
        background: none;
        border: 0;
        padding: 0.25rem;
        color: var(--text-muted);
        font: inherit;
        font-size: 0.85rem;
        cursor: pointer;
      }

      .link-btn:hover {
        color: var(--text);
        text-decoration: underline;
      }

      .close {
        position: absolute;
        top: 0.4rem;
        right: 0.6rem;
        background: none;
        border: 0;
        font-size: 1.5rem;
        line-height: 1;
        color: var(--text-muted);
        cursor: pointer;
      }

      /* On a phone the overlay reads better as the bottom sheet §7 allows. */
      @media (max-width: 560px) {
        .backdrop {
          place-items: end center;
          padding: 0;
        }

        .sheet {
          max-width: none;
          border-bottom-left-radius: 0;
          border-bottom-right-radius: 0;
          animation: sheet-up 280ms var(--ease-spring);
        }
      }

      @keyframes sheet-in {
        from {
          opacity: 0;
          transform: scale(0.92) translateY(16px);
        }
      }

      @keyframes sheet-up {
        from {
          transform: translateY(100%);
        }
      }
    `,
  ],
})
export class AuthPromptComponent {
  readonly prompt = inject(AuthPromptService);
  readonly copy = this.prompt.copyFor.bind(this.prompt);
}
