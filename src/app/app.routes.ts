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
        title: 'Sign in · OffersOffer',
        loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent),
      },
      {
        path: 'register',
        canActivate: [guestGuard],
        title: 'Create an account · OffersOffer',
        loadComponent: () =>
          import('./features/auth/register.component').then((m) => m.RegisterComponent),
      },
      {
        path: 'forgot-password',
        title: 'Forgot password · OffersOffer',
        loadComponent: () =>
          import('./features/auth/forgot-password.component').then((m) => m.ForgotPasswordComponent),
      },
      {
        path: 'reset-password',
        title: 'Reset password · OffersOffer',
        loadComponent: () =>
          import('./features/auth/reset-password.component').then((m) => m.ResetPasswordComponent),
      },
      {
        path: 'verify-email',
        title: 'Verify email · OffersOffer',
        loadComponent: () =>
          import('./features/auth/verify-email.component').then((m) => m.VerifyEmailComponent),
      },
      { path: '', pathMatch: 'full', redirectTo: 'login' },
    ],
  },

  // ---- Customer discovery --------------------------------------------------
  {
    path: 'offers',
    title: 'Offers · OffersOffer',
    loadComponent: () => import('./features/offers/offer-list.component').then((m) => m.OfferListComponent),
  },
  {
    path: 'offers/:id',
    title: 'Offer details · OffersOffer',
    loadComponent: () =>
      import('./features/offers/offer-detail.component').then((m) => m.OfferDetailComponent),
  },
  {
    path: 'nearby',
    title: 'Nearby offers · OffersOffer',
    loadComponent: () => import('./features/offers/offer-list.component').then((m) => m.OfferListComponent),
    data: { nearby: true },
  },
  {
    path: 'categories',
    title: 'Categories · OffersOffer',
    loadComponent: () =>
      import('./features/categories/category-browse.component').then((m) => m.CategoryBrowseComponent),
  },
  {
    path: 'shops',
    title: 'Shops · OffersOffer',
    loadComponent: () => import('./features/shops/shop-list.component').then((m) => m.ShopListComponent),
  },
  {
    path: 'shops/:idOrSlug',
    title: 'Shop · OffersOffer',
    loadComponent: () => import('./features/shops/shop-detail.component').then((m) => m.ShopDetailComponent),
  },
  {
    path: 'services',
    title: 'Services · OffersOffer',
    loadComponent: () =>
      import('./features/services/service-list.component').then((m) => m.ServiceListComponent),
  },
  {
    path: 'services/:id',
    title: 'Service details · OffersOffer',
    loadComponent: () =>
      import('./features/services/service-detail.component').then((m) => m.ServiceDetailComponent),
  },

  // ---- Signed-in customer areas -------------------------------------------
  {
    path: 'favorites',
    canActivate: [authGuard],
    title: 'My favourites · OffersOffer',
    loadComponent: () => import('./features/account/favorites.component').then((m) => m.FavoritesComponent),
  },
  {
    path: 'following',
    canActivate: [authGuard],
    title: 'Following · OffersOffer',
    loadComponent: () => import('./features/account/following.component').then((m) => m.FollowingComponent),
  },
  {
    path: 'notifications',
    canActivate: [authGuard],
    title: 'Notifications · OffersOffer',
    loadComponent: () =>
      import('./features/account/notifications.component').then((m) => m.NotificationsComponent),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    title: 'My profile · OffersOffer',
    loadComponent: () => import('./features/account/profile.component').then((m) => m.ProfileComponent),
  },
  // §28: the customer stays signed in on every device until they end a
  // session, so they need somewhere to see and end them.
  {
    path: 'profile/devices',
    canActivate: [authGuard],
    title: 'Logged-in devices · OffersOffer',
    loadComponent: () => import('./features/account/sessions.component').then((m) => m.SessionsComponent),
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
        title: 'Dashboard · OffersOffer',
        loadComponent: () =>
          import('./features/admin/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'offers',
        title: 'Manage offers · OffersOffer',
        canActivate: [permissionGuard(PERMISSIONS.VIEW_OFFERS)],
        loadComponent: () =>
          import('./features/admin/offer-manage.component').then((m) => m.OfferManageComponent),
      },
      {
        path: 'offers/new',
        title: 'Post an offer · OffersOffer',
        canActivate: [permissionGuard(PERMISSIONS.CREATE_OFFER)],
        loadComponent: () => import('./features/admin/offer-form.component').then((m) => m.OfferFormComponent),
      },
      {
        path: 'offers/:id/edit',
        title: 'Edit offer · OffersOffer',
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
        path: 'services',
        title: 'Manage services · OffersOffer',
        canActivate: [permissionGuard(PERMISSIONS.VIEW_SERVICE)],
        loadComponent: () =>
          import('./features/admin/service-manage.component').then((m) => m.ServiceManageComponent),
      },
      {
        path: 'services/new',
        title: 'Add a service · OffersOffer',
        canActivate: [permissionGuard(PERMISSIONS.CREATE_SERVICE)],
        loadComponent: () =>
          import('./features/admin/service-form.component').then((m) => m.ServiceFormComponent),
      },
      {
        path: 'services/:id/edit',
        title: 'Edit service · OffersOffer',
        canActivate: [permissionGuard(PERMISSIONS.EDIT_SERVICE)],
        loadComponent: () =>
          import('./features/admin/service-form.component').then((m) => m.ServiceFormComponent),
      },
      {
        path: 'services/:id/offers',
        title: 'Service offers · OffersOffer',
        canActivate: [permissionGuard(PERMISSIONS.MANAGE_SERVICE_OFFER)],
        loadComponent: () =>
          import('./features/admin/service-offer-manage.component').then(
            (m) => m.ServiceOfferManageComponent,
          ),
      },
      {
        path: 'service-analytics',
        title: 'Service analytics · OffersOffer',
        canActivate: [permissionGuard(PERMISSIONS.VIEW_SERVICE_ANALYTICS)],
        loadComponent: () =>
          import('./features/admin/service-analytics.component').then((m) => m.ServiceAnalyticsComponent),
      },
      {
        path: 'shops',
        title: 'Shops · OffersOffer',
        loadComponent: () =>
          import('./features/admin/shop-manage.component').then((m) => m.ShopManageComponent),
      },
      {
        path: 'shops/new',
        title: 'Create a shop · OffersOffer',
        canActivate: [permissionGuard(PERMISSIONS.CREATE_SHOP)],
        loadComponent: () => import('./features/admin/shop-form.component').then((m) => m.ShopFormComponent),
      },
      {
        path: 'shops/:id/edit',
        title: 'Edit shop · OffersOffer',
        canActivate: [permissionGuard(PERMISSIONS.EDIT_SHOP)],
        loadComponent: () => import('./features/admin/shop-form.component').then((m) => m.ShopFormComponent),
      },
      {
        path: 'shops/:id/branches',
        title: 'Branches · OffersOffer',
        canActivate: [permissionGuard(PERMISSIONS.MANAGE_LOCATIONS)],
        loadComponent: () =>
          import('./features/admin/branch-manage.component').then((m) => m.BranchManageComponent),
      },
      {
        path: 'shops/:id/members',
        title: 'Shop members · OffersOffer',
        canActivate: [permissionGuard(PERMISSIONS.VIEW_SHOP_MEMBERS)],
        loadComponent: () =>
          import('./features/admin/member-manage.component').then((m) => m.MemberManageComponent),
      },
      // Banner management is admin-only (§5); each route demands the specific
      // banner permission, which the API re-checks independently.
      {
        path: 'banners',
        title: 'Featured banners · OffersOffer',
        canActivate: [permissionGuard(PERMISSIONS.VIEW_BANNERS)],
        loadComponent: () =>
          import('./features/admin/banner-manage.component').then((m) => m.BannerManageComponent),
      },
      {
        path: 'banners/new',
        title: 'New banner · OffersOffer',
        canActivate: [permissionGuard(PERMISSIONS.CREATE_BANNER)],
        loadComponent: () =>
          import('./features/admin/banner-form.component').then((m) => m.BannerFormComponent),
      },
      {
        path: 'banners/:id/edit',
        title: 'Edit banner · OffersOffer',
        canActivate: [permissionGuard(PERMISSIONS.EDIT_BANNER)],
        loadComponent: () =>
          import('./features/admin/banner-form.component').then((m) => m.BannerFormComponent),
      },
      // V3 §7/§32: Analytics is a section rather than a page. Sub-routes render
      // inside the shell, which keeps the shared filter bar and the tab bar
      // mounted while the merchant moves between dashboards.
      {
        path: 'analytics',
        canActivate: [permissionGuard(PERMISSIONS.VIEW_ANALYTICS)],
        loadComponent: () =>
          import('./features/admin/analytics/analytics-shell.component').then(
            (m) => m.AnalyticsShellComponent,
          ),
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'overview' },
          {
            path: 'overview',
            title: 'Analytics overview · OffersOffer',
            loadComponent: () =>
              import('./features/admin/analytics/premium-overview.component').then(
                (m) => m.PremiumOverviewComponent,
              ),
          },
          {
            path: 'offer-performance',
            title: 'Offer performance · OffersOffer',
            loadComponent: () =>
              import('./features/admin/analytics/offer-performance.component').then(
                (m) => m.OfferPerformanceComponent,
              ),
          },
          {
            path: 'funnel',
            title: 'Customer funnel · OffersOffer',
            loadComponent: () =>
              import('./features/admin/analytics/customer-funnel.component').then(
                (m) => m.CustomerFunnelComponent,
              ),
          },
          {
            path: 'locations',
            title: 'Location insights · OffersOffer',
            loadComponent: () =>
              import('./features/admin/analytics/location-insights.component').then(
                (m) => m.LocationInsightsComponent,
              ),
          },
          {
            path: 'branches',
            title: 'Branch performance · OffersOffer',
            loadComponent: () =>
              import('./features/admin/analytics/branch-performance.component').then(
                (m) => m.BranchPerformanceComponent,
              ),
          },
          {
            path: 'customers',
            title: 'Customer insights · OffersOffer',
            loadComponent: () =>
              import('./features/admin/analytics/customer-insights.component').then(
                (m) => m.CustomerInsightsComponent,
              ),
          },
          {
            path: 'campaigns',
            title: 'Campaign performance · OffersOffer',
            loadComponent: () =>
              import('./features/admin/analytics/campaign-performance.component').then(
                (m) => m.CampaignPerformanceComponent,
              ),
          },
          {
            path: 'intelligence',
            title: 'Offer intelligence · OffersOffer',
            loadComponent: () =>
              import('./features/admin/analytics/offer-intelligence.component').then(
                (m) => m.OfferIntelligenceComponent,
              ),
          },
          {
            path: 'reports',
            title: 'Reports · OffersOffer',
            loadComponent: () =>
              import('./features/admin/analytics/reports.component').then(
                (m) => m.AnalyticsReportsComponent,
              ),
          },
          // The V1/V2 analytics page, kept as the platform-wide view: it is the
          // only place a Super Admin sees cross-shop totals.
          {
            path: 'platform',
            title: 'Platform analytics · OffersOffer',
            loadComponent: () =>
              import('./features/admin/analytics.component').then((m) => m.AnalyticsComponent),
          },
        ],
      },

      // V3 §32 Subscription
      {
        path: 'subscription',
        canActivate: [permissionGuard(PERMISSIONS.VIEW_SUBSCRIPTION, PERMISSIONS.MANAGE_SUBSCRIPTION)],
        children: [
          {
            path: '',
            pathMatch: 'full',
            title: 'Subscription · OffersOffer',
            loadComponent: () =>
              import('./features/admin/subscription/subscription-plan.component').then(
                (m) => m.SubscriptionPlanComponent,
              ),
          },
          {
            path: 'billing',
            title: 'Billing · OffersOffer',
            loadComponent: () =>
              import('./features/admin/subscription/billing.component').then(
                (m) => m.SubscriptionBillingComponent,
              ),
          },
          {
            path: 'upgrade',
            title: 'Upgrade · OffersOffer',
            loadComponent: () =>
              import('./features/admin/subscription/upgrade.component').then(
                (m) => m.SubscriptionUpgradeComponent,
              ),
          },
        ],
      },
      {
        path: 'categories',
        title: 'Categories · OffersOffer',
        canActivate: [permissionGuard(PERMISSIONS.MANAGE_CATEGORIES)],
        loadComponent: () =>
          import('./features/admin/category-manage.component').then((m) => m.CategoryManageComponent),
      },
      {
        path: 'users',
        title: 'Users · OffersOffer',
        canActivate: [permissionGuard(PERMISSIONS.VIEW_USERS)],
        loadComponent: () =>
          import('./features/admin/user-manage.component').then((m) => m.UserManageComponent),
      },
      {
        path: 'roles',
        title: 'Roles & permissions · OffersOffer',
        canActivate: [superAdminGuard],
        loadComponent: () =>
          import('./features/admin/role-manage.component').then((m) => m.RoleManageComponent),
      },
      // §11C: Super Admin only. The guard is navigation convenience - every
      // override API re-checks the role and permission independently (§11L).
      {
        path: 'feature-overrides',
        title: 'Feature overrides · OffersOffer',
        canActivate: [superAdminGuard],
        loadComponent: () =>
          import('./features/admin/overrides/feature-overrides.component').then(
            (m) => m.FeatureOverridesComponent,
          ),
      },
      {
        path: 'reviews',
        title: 'Reviews · OffersOffer',
        canActivate: [permissionGuard(PERMISSIONS.MODERATE_REVIEWS)],
        loadComponent: () =>
          import('./features/admin/review-manage.component').then((m) => m.ReviewManageComponent),
      },
      {
        path: 'audit-logs',
        title: 'Audit logs · OffersOffer',
        canActivate: [permissionGuard(PERMISSIONS.VIEW_AUDIT_LOGS)],
        loadComponent: () => import('./features/admin/audit-log.component').then((m) => m.AuditLogComponent),
      },
    ],
  },

  {
    path: '**',
    title: 'Page not found · OffersOffer',
    loadComponent: () => import('./features/not-found.component').then((m) => m.NotFoundComponent),
  },
];
