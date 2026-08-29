/**
 * Production configuration.
 *
 * Swapped in for `environment.ts` by the `production` build configuration in
 * `angular.json` (`fileReplacements`). Without that entry this file is dead
 * code that nothing imports - which is what it was until the deployment shape
 * was settled, and the kind of thing that is only noticed after a value put
 * here fails to take effect in a real build.
 */
export const environment = {
  production: true,
  /**
   * Relative, because the API is served from the same origin: nginx serves this
   * bundle and forwards /api and /uploads to the Node process. It is the same
   * arrangement `proxy.conf.json` creates in development, so the app talks to
   * the API the same way in both.
   *
   * Keeping it relative is also what keeps the API host out of the bundle. If
   * the API ever moves to its own subdomain this becomes an absolute URL - and
   * at that point the backend's refresh cookie has to become SameSite=none,
   * because it would then be a cross-site cookie.
   */
  apiUrl: '/api',
  radiusOptions: [1, 5, 10, 25],
  defaultRadiusKm: 10,
  pageSize: 12,
  /**
   * Raster tiles for the shop-location map picker.
   *
   * OpenStreetMap's own tile servers are the default because they need no key
   * and the picker is a low-traffic merchant form, not a customer-facing map.
   * Their tile usage policy requires the attribution below to stay visible;
   * point both values at a commercial provider before that traffic grows.
   */
  mapTileUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  mapAttribution: '\u00a9 OpenStreetMap contributors',
  /** Where the picker opens when a shop has no coordinates yet. */
  mapDefaultCenter: { latitude: 11.0168, longitude: 76.9558 },
};
