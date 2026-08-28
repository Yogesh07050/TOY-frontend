import { DestroyRef, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ApiService, UploadFolder } from '../core/api.service';

/**
 * Image uploads that survive a failure (§48, §54).
 *
 * §48 asks for four things, and the fourth is the one that is easy to get
 * wrong: show a clear message, offer Retry, offer Choose Another Image, and
 * "if multiple images are involved, do not unnecessarily re-upload successful
 * files".
 *
 * That last rule is why the failed files are kept as `File` handles rather than
 * the whole selection being remembered. A retry re-sends exactly the ones that
 * did not make it - a merchant who picked eight photos on a train and lost one
 * to a tunnel should not have to wait for the other seven again, and on a
 * metered connection they should not have to pay for them again either.
 *
 * §48's "do not clear the rest of the form" is satisfied by construction: this
 * holds only the images, and the form's own fields are never touched by an
 * upload failing.
 */

export interface UploadedImage {
  url: string;
  thumbnailUrl: string | null;
}

export interface FailedUpload {
  file: File;
  /** What the server said, already in customer-facing words (§49). */
  message: string;
}

export class ImageUploader {
  private readonly api = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly images = signal<UploadedImage[]>([]);
  readonly uploading = signal(false);
  readonly failed = signal<FailedUpload[]>([]);

  constructor(
    private readonly folder: UploadFolder,
    /** Most forms cap the gallery; a single-image field passes 1. */
    private readonly max = 8,
  ) {}

  get room(): number {
    return this.max - this.images().length;
  }

  /** Uploads a picked selection, keeping whatever fails for a later retry. */
  add(files: File[]): void {
    const accepted = files.slice(0, Math.max(this.room, 0));
    if (!accepted.length) return;

    // A new pick clears the previous failures: the merchant has moved on, and
    // a stale "couldn't upload IMG_204" next to a fresh selection is noise.
    this.failed.set([]);
    this.send(accepted);
  }

  /** §48's [Retry]: re-sends only the files that failed. */
  retryFailed(): void {
    const pending = this.failed().map((entry) => entry.file);
    if (!pending.length) return;
    this.failed.set([]);
    this.send(pending);
  }

  /** §48's [Choose Another Image]: drop the failures and start over. */
  dismissFailures(): void {
    this.failed.set([]);
  }

  remove(index: number): void {
    this.images.update((list) => list.filter((_, position) => position !== index));
  }

  move(index: number, direction: -1 | 1): void {
    const target = index + direction;
    this.images.update((list) => {
      if (target < 0 || target >= list.length) return list;
      const next = [...list];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  set(images: UploadedImage[]): void {
    this.images.set(images);
  }

  private send(files: File[]): void {
    this.uploading.set(true);
    let remaining = files.length;

    const settle = () => {
      if (--remaining === 0) this.uploading.set(false);
    };

    for (const file of files) {
      this.api
        .uploadImage(this.folder, file)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (result) => {
            this.images.update((list) => [
              ...list,
              { url: result.url, thumbnailUrl: result.thumbnailUrl },
            ]);
            settle();
          },
          error: (error: HttpErrorResponse) => {
            this.failed.update((list) => [...list, { file, message: messageFor(error) }]);
            settle();
          },
        });
    }
  }
}

/**
 * The sentence to show for a failed upload.
 *
 * A 4xx means the file itself is the problem and the server has already
 * explained it in §49's terms, so that message is used as-is - "please try
 * again" would be advice to repeat something that cannot work. Anything else is
 * transient, and gets §48's wording.
 */
function messageFor(error: HttpErrorResponse): string {
  if (error.status === 0) {
    return 'You’re offline, so this image couldn’t be uploaded. It will need sending again once you reconnect.';
  }
  const serverMessage = error.error?.error?.message;
  if (error.status >= 400 && error.status < 500 && serverMessage) return serverMessage;
  return 'We couldn’t upload this image. Please try again.';
}
