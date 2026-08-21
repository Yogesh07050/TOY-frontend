import { Routes } from '@angular/router';

import { adminAreaGuard, authGuard, guestGuard, permissionGuard, superAdminGuard } from './core/guards';
import { PERMISSIONS } from './core/permissions';

/**
 * Routing is permission-based rather than role-name based (§20). Guards are a
 * navigation convenience; the API enforces the same rules on every request.
 */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'offers' },

  // ---- Authentication ------------------------------------------------------
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        canActivate: [guestGuard],
        title: 'Sign in · Offers App',
        loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent),
      },
      {
        path: 'register',
        canActivate: [guestGuard],
        title: 'Create an account · Offers App',
        loadComponent: () =>
          import('./features/auth/register.component').then((m) => m.RegisterComponent),
      },
      {
        path: 'forgot-password',
        title: 'Forgot password · Offers App',
        loadComponent: () =>
          import('./features/auth/forgot-password.component').then((m) => m.ForgotPasswordComponent),
      },
      {
        path: 'reset-password',
        title: 'Reset password · Offers App',
        loadComponent: () =>
          import('./features/auth/reset-password.component').then((m) => m.ResetPasswordComponent),
      },
      {
        path: 'verify-email',
        title: 'Verify email · Offers App',
        loadComponent: () =>
          import('./features/auth/verify-email.component').then((m) => m.VerifyEmailComponent),
      },
      { path: '', pathMatch: 'full', redirectTo: 'login' },
    ],
  },

  // ---- Customer discovery --------------------------------------------------
  {
    path: 'offers',
    title: 'Offers · Offers App',
    loadComponent: () => import('./features/offers/offer-list.component').then((m) => m.OfferListComponent),
  },
  {
    path: 'offers/:id',
    title: 'Offer details · Offers App',
    loadComponent: () =>
      import('./features/offers/offer-detail.component').then((m) => m.OfferDetailComponent),
  },
  {
    path: 'nearby',
    title: 'Nearby offers · Offers App',
    loadComponent: () => import('./features/offers/offer-list.component').then((m) => m.OfferListComponent),
    data: { nearby: true },
  },
  {
    path: 'categories',
    title: 'Categories · Offers App',
    loadComponent: () =>
      import('./features/categories/category-browse.component').then((m) => m.CategoryBrowseComponent),
  },
  {
    path: 'shops',
    title: 'Shops · Offers App',
    loadComponent: () => import('./features/shops/shop-list.component').then((m) => m.ShopListComponent),
  },
  {
    path: 'shops/:idOrSlug',
    title: 'Shop · Offers App',
    loadComponent: () => import('./features/shops/shop-detail.component').then((m) => m.ShopDetailComponent),
  },

  // ---- Signed-in customer areas -------------------------------------------
  {
    path: 'favorites',
    canActivate: [authGuard],
    title: 'My favourites · Offers App',
    loadComponent: () => import('./features/account/favorites.component').then((m) => m.FavoritesComponent),
  },
  {
    path: 'following',
    canActivate: [authGuard],
    title: 'Following · Offers App',
    loadComponent: () => import('./features/account/following.component').then((m) => m.FollowingComponent),
  },
  {
    path: 'notifications',
    canActivate: [authGuard],
    title: 'Notifications · Offers App',
    loadComponent: () =>
      import('./features/account/notifications.component').then((m) => m.NotificationsComponent),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    title: 'My profile · Offers App',
    loadComponent: () => import('./features/account/profile.component').then((m) => m.ProfileComponent),
  },

  // ---- Administration ------------------------------------------------------
  {
    path: 'admin',
    canActivate: [adminAreaGuard],
    loadComponent: () => import('./features/admin/admin-shell.component').then((m) => m.AdminShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        title: 'Dashboard · Offers App',
        loadComponent: () =>
          import('./features/admin/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'offers',
        title: 'Manage offers · Offers App',
        canActivate: [permissionGuard(PERMISSIONS.VIEW_OFFERS)],
        loadComponent: () =>
          import('./features/admin/offer-manage.component').then((m) => m.OfferManageComponent),
      },
      {
        path: 'offers/new',
        title: 'Post an offer · Offers App',
        canActivate: [permissionGuard(PERMISSIONS.CREATE_OFFER)],
        loadComponent: () => import('./features/admin/offer-form.component').then((m) => m.OfferFormComponent),
      },
      {
        path: 'offers/:id/edit',
        title: 'Edit offer · Offers App',
        canActivate: [permissionGuard(PERMISSIONS.EDIT_OFFER)],
        loadComponent: () => import('./features/admin/offer-form.component').then((m) => m.OfferFormComponent),
      },
      // ---- AI (TOY.md) ----
      // The assistant and the improver are gated on the permission here and on
      // the shop's subscription plan by the API, which is the real check.
      {
        path: 'ai/assistant',
        title: 'AI Offer Assistant · Offers App',
        canActivate: [permissionGuard(PERMISSIONS.USE_AI_ASSISTANT)],
        loadComponent: () =>
          import('./features/ai/ai-assistant.component').then((m) => m.AiAssistantComponent),
      },
      {
        path: 'ai/history',
        title: 'AI usage & history · Offers App',
        canActivate: [permissionGuard(PERMISSIONS.USE_AI_CONTENT, PERMISSIONS.USE_AI_ASSISTANT)],
        loadComponent: () =>
          import('./features/ai/ai-history.component').then((m) => m.AiHistoryComponent),
      },
      {
        path: 'offers/:id/improve',
        title: 'Improve this offer · Offers App',
        canActivate: [permissionGuard(PERMISSIONS.USE_AI_CONTENT)],
        loadComponent: () =>
          import('./features/ai/ai-improve.component').then((m) => m.AiImproveComponent),
      },
      {
        path: 'subscriptions',
        title: 'Subscriptions & AI limits · Offers App',
        canActivate: [superAdminGuard],
        loadComponent: () =>
          import('./features/admin/subscription-manage.component').then(
            (m) => m.SubscriptionManageComponent,
          ),
      },
      {
        path: 'shops',
        title: 'Shops · Offers App',
        loadComponent: () =>
          import('./features/admin/shop-manage.component').then((m) => m.ShopManageComponent),
      },
      {
        path: 'shops/new',
        title: 'Create a shop · Offers App',
        canActivate: [permissionGuard(PERMISSIONS.CREATE_SHOP)],
        loadComponent: () => import('./features/admin/shop-form.component').then((m) => m.ShopFormComponent),
      },
      {
        path: 'shops/:id/edit',
        title: 'Edit shop · Offers App',
        canActivate: [permissionGuard(PERMISSIONS.EDIT_SHOP)],
        loadComponent: () => import('./features/admin/shop-form.component').then((m) => m.ShopFormComponent),
      },
      {
        path: 'shops/:id/branches',
        title: 'Branches · Offers App',
        canActivate: [permissionGuard(PERMISSIONS.MANAGE_LOCATIONS)],
        loadComponent: () =>
          import('./features/admin/branch-manage.component').then((m) => m.BranchManageComponent),
      },
      {
        path: 'shops/:id/members',
        title: 'Shop members · Offers App',
        canActivate: [permissionGuard(PERMISSIONS.VIEW_SHOP_MEMBERS)],
        loadComponent: () =>
          import('./features/admin/member-manage.component').then((m) => m.MemberManageComponent),
      },
      // Banner management is admin-only (§5); each route demands the specific
      // banner permission, which the API re-checks independently.
      {
        path: 'banners',
        title: 'Featured banners · Offers App',
        canActivate: [permissionGuard(PERMISSIONS.VIEW_BANNERS)],
        loadComponent: () =>
          import('./features/admin/banner-manage.component').then((m) => m.BannerManageComponent),
      },
      {
        path: 'banners/new',
        title: 'New banner · Offers App',
        canActivate: [permissionGuard(PERMISSIONS.CREATE_BANNER)],
        loadComponent: () =>
          import('./features/admin/banner-form.component').then((m) => m.BannerFormComponent),
      },
      {
        path: 'banners/:id/edit',
        title: 'Edit banner · Offers App',
        canActivate: [permissionGuard(PERMISSIONS.EDIT_BANNER)],
        loadComponent: () =>
          import('./features/admin/banner-form.component').then((m) => m.BannerFormComponent),
      },
      {
        path: 'analytics',
        title: 'Analytics · Offers App',
        canActivate: [permissionGuard(PERMISSIONS.VIEW_ANALYTICS)],
        loadComponent: () =>
          import('./features/admin/analytics.component').then((m) => m.AnalyticsComponent),
      },
      {
        path: 'categories',
        title: 'Categories · Offers App',
        canActivate: [permissionGuard(PERMISSIONS.MANAGE_CATEGORIES)],
        loadComponent: () =>
          import('./features/admin/category-manage.component').then((m) => m.CategoryManageComponent),
      },
      {
        path: 'users',
        title: 'Users · Offers App',
        canActivate: [permissionGuard(PERMISSIONS.VIEW_USERS)],
        loadComponent: () =>
          import('./features/admin/user-manage.component').then((m) => m.UserManageComponent),
      },
      {
        path: 'roles',
        title: 'Roles & permissions · Offers App',
        canActivate: [superAdminGuard],
        loadComponent: () =>
          import('./features/admin/role-manage.component').then((m) => m.RoleManageComponent),
      },
      {
        path: 'reviews',
        title: 'Reviews · Offers App',
        canActivate: [permissionGuard(PERMISSIONS.MODERATE_REVIEWS)],
        loadComponent: () =>
          import('./features/admin/review-manage.component').then((m) => m.ReviewManageComponent),
      },
      {
        path: 'audit-logs',
        title: 'Audit logs · Offers App',
        canActivate: [permissionGuard(PERMISSIONS.VIEW_AUDIT_LOGS)],
        loadComponent: () => import('./features/admin/audit-log.component').then((m) => m.AuditLogComponent),
      },
    ],
  },

  {
    path: '**',
    title: 'Page not found · Offers App',
    loadComponent: () => import('./features/not-found.component').then((m) => m.NotFoundComponent),
  },
];
