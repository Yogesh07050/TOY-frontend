import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap, of, catchError, map, switchMap } from 'rxjs';

import { environment } from '../../environments/environment';
import { ApiEnvelope, AuthSession, CurrentUser, DeviceSession, PreferredLocation } from './models';
import { PermissionName } from './permissions';

const ACCESS_TOKEN_KEY = 'offers.accessToken';
/**
 * Marks that a session exists so the app knows to attempt a silent refresh on
 * boot (§23). The refresh token itself lives in an httpOnly cookie the browser
 * sends automatically and JavaScript cannot read (§22) - only this flag is
 * kept here, and it is not a credential.
 */
const SESSION_FLAG_KEY = 'offers.hasSession';

/** Whether the server actually managed to send the email it promised. */
export interface MailResult {
  message: string;
  delivered: boolean;
}

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

  /**
   * Whether a session was established in this browser and may still be live.
   * Not a credential - just the hint that a refresh cookie is worth trying.
   */
  get hasSession(): boolean {
    return localStorage.getItem(SESSION_FLAG_KEY) === '1';
  }

  /**
   * Restores the session on app start (§23).
   *
   *   existing session? -> refresh the access token if needed -> load profile
   *
   * The access token in localStorage is short-lived, so after the tab has been
   * closed for a while it is usually already expired. Rather than showing the
   * login screen, the refresh cookie is used to mint a new one - which is what
   * makes the experience "log in once" (§19).
   *
   * Resolves either way: browsing anonymously is a supported state.
   */
  restore(): Observable<CurrentUser | null> {
    if (!this.accessToken && !this.hasSession) {
      this.initialised.set(true);
      return of(null);
    }

    const loadProfile = () =>
      this.http.get<ApiEnvelope<CurrentUser>>(`${this.base}/me`).pipe(map((r) => r.data));

    // With no access token there is nothing to send, so go straight to the
    // cookie; otherwise try the token first and fall back on a 401.
    const source = this.accessToken
      ? loadProfile().pipe(catchError(() => this.refreshSession().pipe(switchMap(loadProfile))))
      : this.refreshSession().pipe(switchMap(loadProfile));

    return source.pipe(
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
      .post<ApiEnvelope<AuthSession>>(
        `${this.base}/login`,
        { email, password, rememberMe },
        // Needed for the browser to store the httpOnly refresh cookie (§22).
        { withCredentials: true },
      )
      .pipe(map((response) => this.acceptSession(response.data)));
  }

  register(payload: RegisterPayload): Observable<CurrentUser> {
    return this.http
      .post<ApiEnvelope<AuthSession>>(`${this.base}/register`, payload, { withCredentials: true })
      .pipe(map((response) => this.acceptSession(response.data)));
  }

  /**
   * Ends the persistent session (§25): revoke server-side, clear the local
   * token and the refresh cookie, then send the user to the login screen.
   */
  logout(redirectTo = '/auth/login'): void {
    this.http.post(`${this.base}/logout`, {}, { withCredentials: true }).subscribe({
      complete: () => undefined,
      error: () => undefined,
    });
    this.clearTokens();
    this.currentUser.set(null);
    this.unreadCount.set(0);
    void this.router.navigateByUrl(redirectTo);
  }

  forgotPassword(email: string) {
    return this.http.post<ApiEnvelope<MailResult>>(`${this.base}/forgot-password`, { email });
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
    return this.http.post<ApiEnvelope<MailResult>>(`${this.base}/resend-verification`, { email });
  }

  changePassword(currentPassword: string, password: string, confirmPassword: string) {
    return this.http.post<ApiEnvelope<{ message: string }>>(`${this.base}/change-password`, {
      currentPassword,
      password,
      confirmPassword,
    });
  }

  /**
   * Exchanges the refresh cookie for a fresh access token (§20).
   *
   * The body is deliberately empty: the refresh token travels as an httpOnly
   * cookie, which is why `withCredentials` matters here and why an XSS bug
   * cannot walk off with a long-lived credential (§22).
   */
  refreshSession(): Observable<AuthSession> {
    return this.http
      .post<ApiEnvelope<AuthSession>>(`${this.base}/refresh-token`, {}, { withCredentials: true })
      .pipe(
        map((response) => response.data),
        tap((session) => this.acceptSession(session)),
      );
  }

  // ---- Device sessions (§28) ----------------------------------------------

  sessions(): Observable<DeviceSession[]> {
    return this.http
      .get<ApiEnvelope<DeviceSession[]>>(`${this.base}/sessions`, { withCredentials: true })
      .pipe(map((response) => response.data));
  }

  revokeSession(sessionId: string) {
    return this.http.delete<ApiEnvelope<{ revoked: number }>>(
      `${this.base}/sessions/${sessionId}`,
      { withCredentials: true },
    );
  }

  /** "Log out other devices" - this browser stays signed in (§28). */
  revokeOtherSessions() {
    return this.http.post<ApiEnvelope<{ revoked: number }>>(
      `${this.base}/sessions/revoke-others`,
      {},
      { withCredentials: true },
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

  /**
   * Whether the admin area is reachable. Decided by the permissions the API
   * resolved, not by shop membership: a Super Admin belongs to no shop, and an
   * Admin's rights come from their shop-scoped role.
   */
  readonly canAccessAdmin = computed(() => this.currentUser()?.canAccessAdmin ?? false);

  /**
   * Shop-scoped roles that cannot take effect because the user is not assigned
   * to a shop yet. Non-empty means "someone gave you Admin but forgot the shop".
   */
  readonly unassignedShopRoles = computed(() => this.currentUser()?.unassignedShopRoles ?? []);

  /**
   * Where to send a user after signing in (§24, and V3 §20 - decided by the
   * permissions the API resolved, never by a role name the client supplied).
   */
  landingRoute(): string {
    const user = this.currentUser();
    if (!user) return '/offers';
    if (user.isSuperAdmin) return '/admin/dashboard';
    return user.canAccessAdmin ? '/admin/dashboard' : '/offers';
  }

  private acceptSession(session: AuthSession): CurrentUser {
    localStorage.setItem(ACCESS_TOKEN_KEY, session.accessToken);
    // The refresh token is also returned in the body for non-browser clients;
    // the web app ignores it and relies on the httpOnly cookie instead (§22).
    localStorage.setItem(SESSION_FLAG_KEY, '1');
    this.currentUser.set(session.user);
    this.unreadCount.set(session.user.unreadNotifications ?? 0);
    this.initialised.set(true);
    return session.user;
  }

  private clearTokens(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(SESSION_FLAG_KEY);
    // Anything cached under a previous session must not survive it (§25.4).
    localStorage.removeItem('offers.refreshToken');
  }
}
