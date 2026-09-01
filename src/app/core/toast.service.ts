import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  kind: 'success' | 'error' | 'info';
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  readonly toasts = signal<Toast[]>([]);

  success(message: string) {
    this.push('success', message);
  }

  error(message: string) {
    this.push('error', message);
  }

  info(message: string) {
    this.push('info', message);
  }

  dismiss(id: number) {
    this.toasts.update((list) => list.filter((toast) => toast.id !== id));
  }

  private push(kind: Toast['kind'], message: string) {
    // One cause, one toast. A page load fires six or seven API calls at once,
    // so anything that fails the request rather than the request's contents -
    // the API being down, a session expiring, a rate limit - fails all of them
    // and used to stack six identical toasts down the screen. Repeating the
    // sentence does not tell the reader anything the first one did not, and it
    // buries whatever else is on screen.
    //
    // Matching on the visible text is deliberate: two failures that would
    // print the same sentence are the same news to the person reading it,
    // whatever their separate causes were.
    if (this.toasts().some((toast) => toast.kind === kind && toast.message === message)) return;

    const id = this.nextId++;
    this.toasts.update((list) => [...list, { id, kind, message }]);
    setTimeout(() => this.dismiss(id), kind === 'error' ? 6000 : 3500);
  }
}
