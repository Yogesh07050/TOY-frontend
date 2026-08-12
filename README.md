# Offers App — Frontend

Angular single-page app for the Offers App: customers discover discounts by
search, category, shop and location; shop admins publish and manage offers;
Super Admins run the platform.

Pairs with the API in `TOY-backend`.

---

## Requirements

- Node.js 20.19+ / 22.12+ (Angular 20)
- The backend running on `http://localhost:3000`

## Getting started

```bash
npm install
npm start          # http://localhost:4200
```

```bash
npm run build      # production bundle in dist/
```

Point the app at a different API by editing `apiUrl` in
`src/environments/environment.ts` (dev) or `environment.production.ts`.

### Try it with the seeded accounts

| Role | Email | Password | Lands on |
|---|---|---|---|
| Super Admin | `superadmin@offers.app` | `SuperAdmin@123` | Admin dashboard (everything) |
| Admin (Zara) | `john@zara.com` | `ShopAdmin@123` | Admin dashboard (Zara only) |
| Customer | `priya@example.com` | `Customer@123` | Offer discovery |

---

## Structure

```
src/app/
  core/         auth, api client, guards, interceptors, location, models
  shared/       offer card, pagination, toasts, stars, confirm, pipes
  features/
    auth/       login, register, forgot/reset password, verify email
    offers/     discovery list, offer details
    shops/      shop directory, shop details
    categories/ category browse
    account/    favourites, following, notifications, profile
    admin/      shell, dashboard, offers, shops, branches, members,
                analytics, categories, users, roles, reviews, audit logs
```

Standalone components throughout, signals for state, and lazy-loaded routes —
each screen ships as its own chunk.

### Authentication

- `AuthService` holds the current user in a signal; `APP_INITIALIZER` resolves
  the session before the first navigation, so guards never see a half-loaded
  auth state and reload does not flash the login page.
- Three interceptors run in order: attach the bearer token → refresh once on a
  401 and replay the request → turn what is left into a toast. Parallel requests
  that 401 together share a single refresh.
- The refresh token also lives in an `httpOnly` cookie set by the API.

### Permissions in the UI

`auth.has()`, `auth.hasAny()` and `auth.hasForShop()` drive menu items, buttons
and route guards. The admin sidebar filters itself, so an Admin sees Offers,
Shops and Analytics while a Super Admin also sees Users, Roles, Categories,
Reviews and Audit logs.

**This is presentation only.** The API re-checks every permission on every
request, and a shop Admin who edits an offer id in the URL still gets a 403.

Admin-area access is decided by `canAccessAdmin`, which the API computes from
resolved permissions — not by shop membership. That matters because a Super
Admin belongs to no shop, while an Admin's rights arrive through a shop-scoped
role. If someone holds a shop role with no shop attached, `unassignedShopRoles`
is non-empty and the app says so on the offers page and in the guard message
instead of silently dropping them into the customer view.

Assign shop access from **Users → the Shops column**, which expands into an
editor for adding, viewing and removing a person's shops.

### Location

`LocationService` keeps the customer's current or selected location in local
storage. Location is optional throughout (§8.6): if the browser denies
permission, the app says so once, keeps manual city selection available, and
drops the radius filter and "nearest" sort rather than blocking discovery.
Distances are computed by the API — the client never receives a full offer list
to measure locally.

### Offer discovery

Filters, sorting and paging live in the URL, so a filtered view is shareable and
survives a refresh. Search is debounced. Favouriting is optimistic and rolls
back if the request fails.

---

## Screens

**Customer** — Offers (search, category strip, filters, sorting, radius),
Nearby, Offer details (gallery, live countdown, terms, branch maps, directions,
share to WhatsApp/email/copy, reviews), Shops, Shop details (branches, map,
active/expired offers), Categories, Favourites, Following, Notifications,
Profile (details, preferred location, notification preferences, password).

**Admin** — Dashboard, Offers table with lifecycle actions, the Post an Offer
form (all offer types, validity, branch applicability, terms, images, live card
preview), Branches, Members, Analytics with branch performance.

**Super Admin** — everything above across all shops, plus Shops CRUD,
Categories, Users and role assignment, Roles & permissions matrix, Review
moderation, Audit logs.

---

## Notes

- Maps are OpenStreetMap embeds and directions link out to Google Maps, so no
  map API key is needed. URLs are built from numeric coordinates and marked
  trusted via `DomSanitizer`; they are cached per branch so the iframe does not
  reload on every change-detection pass.
- Styling is hand-written SCSS with CSS custom properties in `src/styles.scss` —
  no UI framework dependency. Mobile-first, with loading skeletons, empty states
  and error toasts throughout.
- Motion uses one shared vocabulary (`--ease`, `--ease-out`, `--ease-spring` and
  three durations) so unrelated components still feel related: page rise-in,
  staggered card entrances, card hover lift with a slow image zoom, spring
  dropdowns and dialogs, a sliding nav underline, and a sidebar accent rail.
- The header is frosted glass via `backdrop-filter`, with a solid fallback.
- Motion is always decoration, never the only signal, so `prefers-reduced-motion`
  switches all of it off without losing meaning.
