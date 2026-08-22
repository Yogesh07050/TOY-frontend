import { Injectable, effect, signal } from '@angular/core';
import { IconName } from '../shared/icons';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'offers.theme';

/**
 * Theme handling (§25): light, dark or follow the system.
 *
 * The resolved theme is written to `data-theme` on <html> and every colour in
 * the app comes from a token that is redefined under `[data-theme='dark']`, so
 * nothing needs a per-component dark variant.
 *
 * The preference persists across sessions, and 'system' keeps tracking the OS
 * setting live rather than only reading it once at startup.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly media = window.matchMedia('(prefers-color-scheme: dark)');

  readonly preference = signal<ThemePreference>(this.readStored());
  readonly resolved = signal<ResolvedTheme>('light');

  constructor() {
    this.apply();

    // Only relevant while the preference is 'system'; the check is inside the
    // listener so switching back to 'system' resumes tracking without re-binding.
    this.media.addEventListener('change', () => {
      if (this.preference() === 'system') this.apply();
    });

    effect(() => {
      // Re-run whenever the preference changes.
      this.preference();
      this.apply();
    });
  }

  set(preference: ThemePreference): void {
    this.preference.set(preference);
    localStorage.setItem(STORAGE_KEY, preference);
  }

  /** Cycles light → dark → system, for the header toggle. */
  cycle(): void {
    const order: ThemePreference[] = ['light', 'dark', 'system'];
    const next = order[(order.indexOf(this.preference()) + 1) % order.length];
    this.set(next);
  }

  label(preference = this.preference()): string {
    return { light: 'Light', dark: 'Dark', system: 'System' }[preference];
  }

  icon(preference = this.preference()): IconName {
    return { light: 'sunny-outline', dark: 'moon-outline', system: 'desktop-outline' }[
      preference
    ] as IconName;
  }

  private apply(): void {
    const preference = this.preference();
    const resolved: ResolvedTheme =
      preference === 'system' ? (this.media.matches ? 'dark' : 'light') : preference;

    this.resolved.set(resolved);
    document.documentElement.setAttribute('data-theme', resolved);
    // Keeps form controls, scrollbars and the browser chrome in step.
    document.documentElement.style.colorScheme = resolved;
  }

  private readStored(): ThemePreference {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
  }
}
