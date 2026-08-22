import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { ICON_PATHS, IconName } from './icons';

/**
 * The one way this app draws an icon.
 *
 *   <app-icon name="heart-outline" />
 *   <app-icon name="location-outline" [size]="14" />
 *   <app-icon name="star" label="Rated 4 out of 5" />
 *
 * Inline SVG rather than an icon font: a font needs a network round trip before
 * anything renders, shows the wrong glyph while it loads, and cannot be given a
 * two-tone treatment later. Inline paths are in the bundle, paint with the first
 * frame, and inherit `currentColor` - which is what keeps icons legible in both
 * themes without a single theme-specific rule.
 *
 * Icons are decorative by default and hidden from screen readers, because they
 * almost always sit beside the text that already says what they mean. Passing a
 * `label` is what turns one into content, for the few that stand alone.
 */
@Component({
  selector: 'app-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      viewBox="0 0 512 512"
      [attr.width]="size()"
      [attr.height]="size()"
      [attr.aria-hidden]="label() ? null : true"
      [attr.role]="label() ? 'img' : null"
      [attr.aria-label]="label() || null"
      [innerHTML]="markup()"
      focusable="false"
    ></svg>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        /* Keeps an icon aligned with the text it sits beside rather than
           riding the baseline. */
        vertical-align: -0.125em;
        flex-shrink: 0;
        color: inherit;
      }

      svg {
        display: block;
        /* Every path is drawn in the current text colour. Only fill needs
           saying here: the stroke is already currentColor in the path data. */
        fill: currentColor;
      }
    `,
  ],
})
export class IconComponent {
  private readonly sanitizer = inject(DomSanitizer);

  readonly name = input.required<IconName>();

  /** Edge length in pixels. Icons are square. */
  readonly size = input(18);

  /** Set only when the icon carries meaning no nearby text already gives. */
  readonly label = input('');

  /**
   * The artwork is ours, from a compile-time constant keyed by a union type -
   * there is no path by which caller input reaches this, so bypassing
   * sanitisation cannot be turned into an injection point.
   */
  protected readonly markup = computed<SafeHtml>(() =>
    this.sanitizer.bypassSecurityTrustHtml(ICON_PATHS[this.name()] ?? ''),
  );
}
