import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { LEGAL_ENTITY, LegalSection, SUPPORT_EMAIL, SUPPORT_PHONES } from './content';

/**
 * The layout shared by the Privacy Policy and the Terms & Conditions.
 *
 * Both are the same shape — a dated preamble, a numbered run of sections, and
 * a way to reach a human at the bottom — and both are read the same way, which
 * is by someone looking for one specific paragraph. So they get a contents list
 * that jumps, numbered anchors that survive being linked to, and a measured
 * line length, rather than a wall of text at whatever width the window is.
 */
@Component({
  selector: 'app-legal-shell',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="container page legal">
      <header>
        <h1>{{ heading() }}</h1>
        <p class="updated">
          Last updated: <strong>{{ lastUpdated() }}</strong>
        </p>
        <p class="intro">{{ intro() }}</p>

        <!-- Said once, plainly, at the top. A policy that quietly implies it
             was drafted by a lawyer when it was not is the more misleading of
             the two options. -->
        <p class="small subtle draft">
          This document describes how {{ entity }} works today. It is written to be understood rather
          than to be exhaustive, and it is not legal advice. Where it is unclear, ask us — the
          contact details are at the end.
        </p>
      </header>

      <nav class="contents" aria-label="Contents">
        <p class="label">On this page</p>
        <ol>
          @for (section of sections(); track section.heading; let i = $index) {
            <li><a [href]="'#s' + (i + 1)">{{ section.heading }}</a></li>
          }
        </ol>
      </nav>

      @for (section of sections(); track section.heading; let i = $index) {
        <section [id]="'s' + (i + 1)">
          <h2>
            <span class="num">{{ i + 1 }}.</span>
            {{ section.heading }}
          </h2>

          @for (paragraph of section.body ?? []; track paragraph) {
            <p>{{ paragraph }}</p>
          }

          @if (section.list?.length) {
            <ul>
              @for (item of section.list ?? []; track item) {
                <li>{{ item }}</li>
              }
            </ul>
          }

          @if (section.callout) {
            <p class="callout">{{ section.callout }}</p>
          }
        </section>
      }

      <section class="contact" id="contact">
        <h2>Contact us</h2>
        <p>Questions about this document, or about the information we hold on you:</p>
        <p class="mb-1">
          <strong>Email</strong><br />
          <a [href]="'mailto:' + supportEmail">{{ supportEmail }}</a>
        </p>
        <p>
          <strong>Phone</strong><br />
          @for (phone of supportPhones; track phone) {
            <a [href]="telHref(phone)">{{ phone }}</a>
            <br />
          }
        </p>
        <p class="small muted">
          You can also <a routerLink="/support">raise a support request</a>, which gives you a
          reference to quote and keeps the reply in one place.
        </p>
      </section>
    </div>
  `,
  styles: [
    `
      /* Long-form reading. A measured column rather than the full container
         width — 90 characters of policy per line is how a paragraph gets
         skipped. */
      .legal {
        max-width: 74ch;
      }

      h1 {
        margin-bottom: 0.35rem;
      }

      .updated {
        color: var(--text-muted);
        font-size: 0.9rem;
        margin-bottom: 1.1rem;
      }

      .intro {
        font-size: 1.05rem;
      }

      .draft {
        border-left: 3px solid var(--border);
        padding-left: 0.85rem;
        margin: 1.25rem 0 0;
      }

      .contents {
        margin: 2rem 0 2.5rem;
        padding: 1.05rem 1.2rem;
        background: var(--surface-alt);
        border: 1px solid var(--border);
        border-radius: var(--radius);
      }

      .contents .label {
        font-size: 0.8rem;
        font-weight: 650;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--text-subtle);
        margin: 0 0 0.6rem;
      }

      .contents ol {
        margin: 0;
        padding-left: 1.2rem;
        columns: 2;
        column-gap: 1.75rem;
        font-size: 0.9rem;
      }

      .contents li {
        margin-bottom: 0.3rem;
        break-inside: avoid;
      }

      @media (max-width: 620px) {
        .contents ol {
          columns: 1;
        }
      }

      section {
        margin-bottom: 2.15rem;
        /* Anchored headings sit under the sticky header without it. */
        scroll-margin-top: calc(var(--header-height) + 1rem);
      }

      h2 {
        font-size: 1.12rem;
        margin-bottom: 0.7rem;
      }

      .num {
        color: var(--text-subtle);
        font-weight: 600;
        margin-right: 0.15rem;
      }

      p,
      li {
        line-height: 1.68;
      }

      ul {
        padding-left: 1.15rem;
      }

      li {
        margin-bottom: 0.3rem;
      }

      .callout {
        background: var(--surface-alt);
        border-left: 3px solid var(--brand);
        border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
        padding: 0.75rem 0.95rem;
        margin-top: 0.9rem;
        font-size: 0.94rem;
      }

      .contact {
        border-top: 1px solid var(--border);
        padding-top: 1.5rem;
      }
    `,
  ],
})
export class LegalShellComponent {
  readonly heading = input.required<string>();
  readonly intro = input.required<string>();
  readonly lastUpdated = input.required<string>();
  readonly sections = input.required<LegalSection[]>();

  readonly entity = LEGAL_ENTITY;
  readonly supportEmail = SUPPORT_EMAIL;
  readonly supportPhones = SUPPORT_PHONES;

  /** `tel:` cannot carry the spaces the number is displayed with. */
  telHref(phone: string): string {
    return `tel:${phone.replace(/\s+/g, '')}`;
  }
}
