/**
 * Permission names, mirroring `src/config/permissions.js` in the backend.
 *
 * These drive navigation and button visibility only. The API enforces the same
 * names independently - hiding a control here is never the access check.
 */
export const PERMISSIONS = {
  VIEW_OFFERS: 'VIEW_OFFERS',
  CREATE_OFFER: 'CREATE_OFFER',
  EDIT_OFFER: 'EDIT_OFFER',
  DELETE_OFFER: 'DELETE_OFFER',
  MODERATE_REVIEWS: 'MODERATE_REVIEWS',

  VIEW_SHOP: 'VIEW_SHOP',
  CREATE_SHOP: 'CREATE_SHOP',
  EDIT_SHOP: 'EDIT_SHOP',
  DELETE_SHOP: 'DELETE_SHOP',
  VIEW_SHOP_MEMBERS: 'VIEW_SHOP_MEMBERS',
  MANAGE_SHOP_MEMBERS: 'MANAGE_SHOP_MEMBERS',
  MANAGE_LOCATIONS: 'MANAGE_LOCATIONS',

  VIEW_USERS: 'VIEW_USERS',
  MANAGE_USERS: 'MANAGE_USERS',
  MANAGE_ROLES: 'MANAGE_ROLES',
  MANAGE_PERMISSIONS: 'MANAGE_PERMISSIONS',

  MANAGE_CATEGORIES: 'MANAGE_CATEGORIES',

  // Granted individually — holding ADMIN does not imply any of these (§6).
  VIEW_BANNERS: 'VIEW_BANNERS',
  CREATE_BANNER: 'CREATE_BANNER',
  EDIT_BANNER: 'EDIT_BANNER',
  DELETE_BANNER: 'DELETE_BANNER',
  PUBLISH_BANNER: 'PUBLISH_BANNER',

  REDEEM_CLAIM: 'REDEEM_CLAIM',

  VIEW_ANALYTICS: 'VIEW_ANALYTICS',
  VIEW_AUDIT_LOGS: 'VIEW_AUDIT_LOGS',
} as const;

export type PermissionName = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
