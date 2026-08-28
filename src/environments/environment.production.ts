export const environment = {
  production: true,
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
