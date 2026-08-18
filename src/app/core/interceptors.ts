import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, catchError, filter, switchMap, take, throwError } from 'rxjs';

import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';

const isApiRequest = (request: HttpRequest<unknown>) => request.url.startsWith(environment.apiUrl);
const isAuthEndpoint = (request: HttpRequest<unknown>) =>
  request.url.includes('/auth/login') ||
  request.url.includes('/auth/register') ||
  request.url.includes('/auth/refresh-token');

/** Attaches the bearer token to API calls and sends cookies for the refresh flow. */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const token = auth.accessToken;

  if (!isApiRequest(request)) return next(request);

  const withCredentials = request.url.includes('/auth/');
  if (!token) {
    return next(withCredentials ? request.clone({ withCredentials: true }) : request);
  }

  return next(
    request.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
      withCredentials,
    }),
  );
};

// A single refresh is shared by every request that 401s while it is in flight,
// so a burst of parallel calls does not trigger a burst of refreshes.
let refreshInFlight = false;
const refreshed$ = new BehaviorSubject<string | null>(null);

/** Transparently refreshes an expired access token and replays the request. */
export const refreshInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return next(request).pipe(
    catchError((error: unknown) => {
      // A 401 on a non-auth API call is worth one silent refresh: a customer
      // should never meet the login screen because an access token aged out
      // (§20). The refresh cookie can outlive the access token, so a missing
      // token is not on its own a reason to skip the attempt - but there must
      // be *some* sign of a session, or an anonymous visitor's 401 would end in
      // a spurious logout and redirect to the login page.
      const isExpired =
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        isApiRequest(request) &&
        !isAuthEndpoint(request) &&
        (Boolean(auth.accessToken) || auth.hasSession);

      if (!isExpired) return throwError(() => error);

      if (refreshInFlight) {
        return refreshed$.pipe(
          filter((token): token is string => token !== null),
          take(1),
          switchMap((token) =>
            next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })),
          ),
        );
      }

      refreshInFlight = true;
      refreshed$.next(null);

      return auth.refreshSession().pipe(
        switchMap((session) => {
          refreshInFlight = false;
          refreshed$.next(session.accessToken);
          return next(request.clone({ setHeaders: { Authorization: `Bearer ${session.accessToken}` } }));
        }),
        catchError((refreshError: unknown) => {
          refreshInFlight = false;
          // The refresh token is gone or revoked - start over.
          auth.logout();
          void router.navigate(['/auth/login'], {
            queryParams: { returnUrl: router.url },
          });
          return throwError(() => refreshError);
        }),
      ) as Observable<never>;
    }),
  );
};

/**
 * Surfaces server errors as toasts. Validation errors (422) are left to the
 * form that raised them, which shows them field by field.
 *
 * Plan gates (403 PLAN_UPGRADE_REQUIRED) are also left alone: they are an
 * expected answer rather than a failure, and the page that asked already
 * renders the contextual upgrade prompt from §31. Toasting them as well just
 * repeats the same sentence over the top of it.
 */
export const errorInterceptor: HttpInterceptorFn = (request, next) => {
  const toast = inject(ToastService);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && isApiRequest(request)) {
        const message = error.error?.error?.message;
        const code = error.error?.error?.code;

        if (code === 'PLAN_UPGRADE_REQUIRED') {
          return throwError(() => error);
        }

        if (error.status === 0) {
          toast.error('Cannot reach the server. Check your connection and try again.');
        } else if (error.status === 403) {
          toast.error(message ?? 'You do not have permission to do that.');
        } else if (error.status === 429) {
          toast.error(message ?? 'Too many requests. Please slow down.');
        } else if (error.status >= 500) {
          toast.error(message ?? 'Something went wrong on our side. Please try again.');
        } else if (error.status !== 422 && error.status !== 401 && message) {
          toast.error(message);
        }
      }
      return throwError(() => error);
    }),
  );
};
