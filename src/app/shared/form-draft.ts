import { DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup } from '@angular/forms';
import { debounceTime } from 'rxjs';

/**
 * Keeps a long form's unsaved work through a crash, a reload or a closed tab
 * (§36: "preserve unsaved form data where practical"; §61: "unsaved forms are
 * protected where practical").
 *
 * The failure this exists for is specific and, for a merchant, infuriating:
 * they fill in a twenty-field offer on a phone, the connection drops as they
 * tap Publish, and the tab is reloaded. Without this, everything is gone. §36
 * is careful to add "where practical", and the practical limit here is real -
 * a `File` cannot be serialised, so the *images* cannot be preserved, only
 * the fields. What is saved is said plainly on screen rather than implied.
 *
 * Only the merchant's own drafts are held, only in this browser, and only
 * until the form is submitted. A draft is discarded on a successful save, so
 * this can never resurrect a stale version over a newer published one.
 */

const PREFIX = 'offers.draft.';
/** Old drafts are noise. A week is far longer than anyone returns to one. */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
/** How long to wait after a change before writing. */
const DEBOUNCE_MS = 800;

interface StoredDraft {
  savedAt: number;
  value: Record<string, unknown>;
}

export class FormDraft<T extends Record<string, unknown>> {
  private readonly destroyRef = inject(DestroyRef);

  /** True once a draft has been restored, so the form can say so. */
  readonly restored = signal(false);
  readonly savedAt = signal<Date | null>(null);

  private readonly key: string;
  private armed = false;

  /**
   * @param scope Identifies the form, e.g. `offer-new` or `offer-42`. Editing
   *   an existing listing gets its own slot, so a half-finished edit of one
   *   offer can never bleed into another.
   */
  constructor(scope: string) {
    this.key = `${PREFIX}${scope}`;
  }

  /**
   * Starts saving on every change, after a pause.
   *
   * Call this *after* the form has been populated - from a loaded offer, or
   * from a restored draft - otherwise the first `valueChanges` from that
   * population writes over what is stored.
   */
  watch(form: FormGroup): void {
    this.armed = true;
    form.valueChanges
      .pipe(debounceTime(DEBOUNCE_MS), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        // Only what the user actually touched is worth keeping.
        //
        // `dirty` is the right gate rather than a timer: a form is pristine
        // after `reset()`, after `patchValue` from a loaded offer, and after
        // an AI pre-fill, and none of those are unsaved work. It only turns
        // dirty when someone types. That also solves the awkward case on its
        // own - discarding a draft resets the form, and the reset's own
        // `valueChanges` would otherwise write a blank draft straight back
        // over the one just deleted.
        if (!form.dirty) return;
        this.save(form.getRawValue() as T);
      });
  }

  /** The stored draft, if there is a recent one. */
  read(): T | null {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return null;

      const draft = JSON.parse(raw) as StoredDraft;
      if (!draft?.value || Date.now() - draft.savedAt > MAX_AGE_MS) {
        this.clear();
        return null;
      }
      this.savedAt.set(new Date(draft.savedAt));
      return draft.value as T;
    } catch {
      // A corrupt draft is worth exactly nothing and must not break the form
      // it was meant to protect.
      this.clear();
      return null;
    }
  }

  /**
   * Restores into `form` if a draft exists, and reports whether it did.
   * The caller decides what a draft means for its own screen.
   */
  restoreInto(form: FormGroup): boolean {
    const value = this.read();
    if (!value) return false;
    form.patchValue(value);
    // Restored work *is* unsaved work, so the form is dirty by definition -
    // and marking it so is what keeps the autosave running as the merchant
    // carries on from where they left off.
    form.markAsDirty();
    this.restored.set(true);
    return true;
  }

  /** Throws the draft away - on a successful save, or when the user says so. */
  clear(): void {
    this.restored.set(false);
    this.savedAt.set(null);
    try {
      localStorage.removeItem(this.key);
    } catch {
      // A storage quota error on a *delete* is not worth surfacing.
    }
  }

  private save(value: T): void {
    if (!this.armed) return;
    try {
      const draft: StoredDraft = { savedAt: Date.now(), value };
      localStorage.setItem(this.key, JSON.stringify(draft));
      this.savedAt.set(new Date(draft.savedAt));
    } catch {
      // Private browsing, or a full quota. Losing the safety net is not a
      // reason to interrupt someone who is in the middle of typing.
    }
  }
}
