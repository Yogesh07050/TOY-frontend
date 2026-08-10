import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap, of, catchError, map } from 'rxjs';

import { environment } from '../../environments/environment';
import { ApiEnvelope, AuthSession, CurrentUser, PreferredLocation } from './models';
import { PermissionName } from './permissions';

const ACCESS_TOKEN_KEY = 'offers.accessToken';
const REFRESH_TOKEN_KEY = 'offers.refreshToken';

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone?: string;
  acceptedTerms: true;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly base = `${environment.apiUrl}/auth`;

  private readonly currentUser = signal<CurrentUser | null>(null);
  private readonly initialised = signal(false);

  /** The signed-in user, or null. */
  readonly user = this.currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUser() !== null);
  readonly isReady = this.initialised.asReadonly();
  readonly unreadCount = signal(0);

  get accessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  get refreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  /**
   * Restores the session on app start. Resolves either way - a failure just
   * means the visitor browses anonymously, which is a supported state.
   */
  restore(): Observable<CurrentUser | null> {
    if (!this.accessToken) {
      this.initialised.set(true);
      return of(null);
    }
    return this.http.get<ApiEnvelope<CurrentUser>>(`${this.base}/me`).pipe(
      map((response) => response.data),
      tap((user) => {
        this.currentUser.set(user);
        this.unreadCount.set(user.unreadNotifications ?? 0);
        this.initialised.set(true);
      }),
      catchError(() => {
        this.clearTokens();
        this.initialised.set(true);
        return of(null);
      }),
    );
  }

  login(email: string, password: string, rememberMe = false): Observable<CurrentUser> {
    return this.http
      .post<ApiEnvelope<AuthSession>>(`${this.base}/login`, { email, password, rememberMe })
      .pipe(map((response) => this.acceptSession(response.data)));
  }

  register(payload: RegisterPayload): Observable<CurrentUser> {
    return this.http
      .post<ApiEnvelope<AuthSession>>(`${this.base}/register`, payload)
      .pipe(map((response) => this.acceptSession(response.data)));
  }

  logout(redirectTo = '/auth/login'): void {
    this.http.post(`${this.base}/logout`, {}).subscribe({
      complete: () => undefined,
      error: () => undefined,
    });
    this.clearTokens();
    this.currentUser.set(null);
    this.unreadCount.set(0);
    void this.router.navigateByUrl(redirectTo);
  }

  forgotPassword(email: string) {
    return this.http.post<ApiEnvelope<{ message: string }>>(`${this.base}/forgot-password`, { email });
  }

  resetPassword(token: string, password: string, confirmPassword: string) {
    return this.http.post<ApiEnvelope<{ message: string }>>(`${this.base}/reset-password`, {
      token,
      password,
      confirmPassword,
    });
  }

  verifyEmail(token: string) {
    return this.http.post<ApiEnvelope<{ message: string }>>(`${this.base}/verify-email`, { token });
  }

  resendVerification(email: string) {
    return this.http.post<ApiEnvelope<{ message: string }>>(`${this.base}/resend-verification`, { email });
  }

  changePassword(currentPassword: string, password: string, confirmPassword: string) {
    return this.http.post<ApiEnvelope<{ message: string }>>(`${this.base}/change-password`, {
      currentPassword,
      password,
      confirmPassword,
    });
  }

  /** Used by the HTTP interceptor when an access token expires mid-session. */
  refreshSession(): Observable<AuthSession> {
    return this.http
      .post<ApiEnvelope<AuthSession>>(
        `${this.base}/refresh-token`,
        this.refreshToken ? { refreshToken: this.refreshToken } : {},
        { withCredentials: true },
      )
      .pipe(
        map((response) => response.data),
        tap((session) => this.acceptSession(session)),
      );
  }

  /** Refreshes the cached user, e.g. after a profile or role change. */
  reload(): Observable<CurrentUser | null> {
    return this.restore();
  }

  patchUser(changes: Partial<CurrentUser>): void {
    const current = this.currentUser();
    if (current) this.currentUser.set({ ...current, ...changes });
  }

  setPreferredLocation(location: PreferredLocation | null): void {
    this.patchUser({ preferredLocation: location });
  }

  // ---- Permission helpers (UI hints only) ---------------------------------

  has(permission: PermissionName): boolean {
    const user = this.currentUser();
    if (!user) return false;
    return user.isSuperAdmin || user.permissions.includes(permission);
  }

  hasAny(...permissions: PermissionName[]): boolean {
    return permissions.some((permission) => this.has(permission));
  }

  /** True when the permission is held for that specific shop. */
  hasForShop(shopId: number, permission: PermissionName): boolean {
    const user = this.currentUser();
    if (!user) return false;
    if (user.isSuperAdmin) return true;
    const membership = user.shops.find((shop) => shop.shopId === shopId);
    return Boolean(membership?.permissions.includes(permission));
  }

  /** True for anyone who administers at least one shop. */
  get isShopStaff(): boolean {
    return (this.currentUser()?.shops.length ?? 0) > 0;
  }

  get isSuperAdmin(): boolean {
    return this.currentUser()?.isSuperAdmin ?? false;
  }

  /** Where to send a user after signing in (§20 - permission based, not role name). */
  landingRoute(): string {
    const user = this.currentUser();
    if (!user) return '/offers';
    if (user.isSuperAdmin) return '/admin/dashboard';
    if (user.shops.length > 0) return '/admin/dashboard';
    return '/offers';
  }

  private acceptSession(session: AuthSession): CurrentUser {
    localStorage.setItem(ACCESS_TOKEN_KEY, session.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken);
    this.currentUser.set(session.user);
    this.unreadCount.set(session.user.unreadNotifications ?? 0);
    this.initialised.set(true);
    return session.user;
  }

  private clearTokens(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}
