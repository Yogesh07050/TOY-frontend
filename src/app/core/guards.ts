import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';
import { ToastService } from './toast.service';
import { PermissionName } from './permissions';

/**
 * Route guards are navigation aids, not access control - the API re-checks
 * every permission independently (§21).
 */

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) return true;
  return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
};

/** Keeps signed-in users away from the login/register screens. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) return true;
  return router.parseUrl(auth.landingRoute());
};

/** Requires any one of the listed permissions. */
export const permissionGuard =
  (...permissions: PermissionName[]): CanActivateFn =>
  (_route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const toast = inject(ToastService);

    if (!auth.isAuthenticated()) {
      return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
    }
    if (auth.hasAny(...permissions)) return true;

    toast.error('You do not have access to that page.');
    return router.parseUrl(auth.landingRoute());
  };

/** Super Admin only areas (roles, permissions, users, audit logs). */
export const superAdminGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
  }
  if (auth.isSuperAdmin) return true;

  toast.error('That area is restricted to Super Admins.');
  return router.parseUrl(auth.landingRoute());
};

/** Anyone who administers at least one shop, or a Super Admin. */
export const shopStaffGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
  }
  if (auth.isSuperAdmin || auth.isShopStaff) return true;

  toast.error('That area is for shop administrators.');
  return router.parseUrl('/offers');
};
