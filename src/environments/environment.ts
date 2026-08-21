export const environment = {
  production: false,
  /**
   * Relative, like production, and resolved by the dev-server proxy in
   * `proxy.conf.json`. That keeps the API port out of the bundle, so the whole
   * stack can run on any port without rebuilding the app.
   */
  apiUrl: '/api',
  /** Radius options offered by the "Near me" control (§8.4). */
  radiusOptions: [1, 5, 10, 25],
  defaultRadiusKm: 10,
  pageSize: 12,
};
