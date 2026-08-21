import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from './auth.service';

/**
 * Guest-to-customer conversion (Guest Browsing §5, §7, §28, §29).
 *
 * The website is public-first: a guest is never redirected to a login screen
 * for browsing. Authentication is only asked for at the moment they reach for
 * something account-specific, and it is asked for *in place* - a modal over the
 * page they were already on, so the offer they were looking at is still behind
 * it when they decide.
 *
 * The second half of §7 is the part that is easy to get wrong: after signing in
 * the customer must land back on the action they started, with the action
 * already carried out. That is what `pendingIntent` is for. The component that
 * raised the prompt hands over a closure; the login/register screens replay it
 * once the session exists.
 *
 *   Guest clicks Save -> prompt -> login -> offer is saved, no second click
 */

/** Account-specific actions a guest can start (§6, §19). */
export type AuthIntentKind =
  | 'save-offer'
  | 'save-service'
  | 'follow-shop'
  | 'follow-category'
  | 'claim-offer'
  | 'book-service'
  | 'enquire-service'
  | 'review'
  | 'notifications'
  | 'profile'
  | 'generic';

export interface AuthIntent {
  kind: AuthIntentKind;
  /** Replayed verbatim after a successful login or registration (§7). */
  resume?: () => void;
  /**
   * Where to land afterwards, when that differs from the current url.
   *
   * Used when the action cannot be replayed by a closure because it is a piece
   * of *page* state rather than an API call - a booking form that should be
   * open on arrival. The component that no longer exists cannot be told to open
   * it, but the url can carry the instruction to its replacement.
   */
  returnTo?: string;
  /** Overrides the default copy when the context deserves something specific. */
  title?: string;
  message?: string;
}

interface PromptCopy {
  icon: string;
  title: string;
  message: string;
}

/**
 * §28: the prompt states what signing in buys *for this action*, rather than
 * the same generic "you must log in" every time.
 */
const COPY: Record<AuthIntentKind, PromptCopy> = {
  'save-offer': {
    icon: '✨',
    title: 'Save this offer',
    message: 'Login or create a free account to save offers and get expiry reminders.',
  },
  'save-service': {
    icon: '✨',
    title: 'Save this service',
    message: 'Login or create a free account to save services and hear when they go on offer.',
  },
  'follow-shop': {
    icon: '🏬',
    title: 'Follow this shop',
    message: 'Login to follow shops and be first to see their new offers.',
  },
  'follow-category': {
    icon: '🏷️',
    title: 'Follow this category',
    message: 'Login to follow categories and get offers that match what you like.',
  },
  'claim-offer': {
    icon: '🎟️',
    title: 'Claim this deal',
    message: 'Login to save and claim the offer, and to track your redemptions.',
  },
  'book-service': {
    icon: '📅',
    title: 'Book this service',
    message: 'Login to book, then manage your bookings from your profile.',
  },
  'enquire-service': {
    icon: '💬',
    title: 'Send an enquiry',
    message: 'Login so the shop can reply to you and you can track your enquiry.',
  },
  review: {
    icon: '⭐',
    title: 'Leave a review',
    message: 'Login to rate this offer and help other customers decide.',
  },
  notifications: {
    icon: '🔔',
    title: 'Turn on notifications',
    message: 'Login to get expiry reminders for the offers you save.',
  },
  profile: {
    icon: '👤',
    title: 'Welcome to OffersOffer',
    message: 'Login or create a free account to see your profile, saved offers and rewards.',
  },
  generic: {
    icon: '✨',
    title: 'Make OffersOffer personal',
    message: 'Login or create a free account to save offers, follow shops and get expiry alerts.',
  },
};

@Injectable({ providedIn: 'root' })
export class AuthPromptService {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  private readonly intent = signal<AuthIntent | null>(null);
  private pending: AuthIntent | null = null;

  /** Non-null while the prompt is on screen. */
  readonly current = this.intent.asReadonly();

  copyFor(intent: AuthIntent): PromptCopy {
    const base = COPY[intent.kind] ?? COPY.generic;
    return { ...base, title: intent.title ?? base.title, message: intent.message ?? base.message };
  }

  /**
   * The single entry point for every account-required action (§19).
   *
   * Returns true when the caller may proceed immediately. Returns false after
   * raising the prompt - the caller does nothing more, because `resume` is what
   * runs on the far side of the login.
   */
  require(kind: AuthIntentKind, resume?: () => void, copy?: Partial<AuthIntent>): boolean {
    if (this.auth.isAuthenticated()) return true;
    this.intent.set({ kind, resume, ...copy });
    return false;
  }

  /** Opens the prompt unconditionally, e.g. from a "Create free account" CTA. */
  open(kind: AuthIntentKind = 'generic', copy?: Partial<AuthIntent>): void {
    this.intent.set({ kind, ...copy });
  }

  dismiss(): void {
    this.intent.set(null);
  }

  /**
   * Sends the visitor to login or register, holding on to the intent so it can
   * be replayed. The return url is the page they were already on, so §29's
   * "original action completes" lands them exactly where they left off.
   */
  proceed(to: 'login' | 'register'): void {
    const intent = this.intent();
    this.pending = intent;
    this.intent.set(null);
    void this.router.navigate([`/auth/${to}`], {
      queryParams: { returnUrl: intent?.returnTo ?? this.router.url },
    });
  }

  /**
   * Replays the held action. Called by the auth screens once a session exists,
   * and deliberately *before* they navigate back.
   *
   * Ordering matters: the component that captured the closure was destroyed
   * when the visitor left for the login screen, so its optimistic UI update
   * lands nowhere. Running the call first means the save is already recorded by
   * the time the destination page fetches, and the page renders as saved on its
   * first paint rather than flickering to it a moment later.
   *
   * The intent is cleared before running so a failed resume cannot re-fire on
   * the next login, and it is dropped on logout for the same reason.
   */
  resumePending(): void {
    const pending = this.pending;
    this.pending = null;
    if (pending?.resume && this.auth.isAuthenticated()) pending.resume();
  }

  /** True when a held action is waiting - lets the login screen say so. */
  get hasPending(): boolean {
    return this.pending !== null;
  }

  pendingCopy(): PromptCopy | null {
    return this.pending ? this.copyFor(this.pending) : null;
  }

  clearPending(): void {
    this.pending = null;
  }
}
