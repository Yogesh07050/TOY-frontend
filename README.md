# OffersOffer — Frontend

Angular single-page app for the OffersOffer: customers discover discounts by
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
                categories, users, roles, reviews, audit logs
      analytics/    V3 premium dashboards + the shared filter bar and its state
      subscription/ V3 current plan, billing, upgrade
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

### Email delivery

The auth screens report what the server actually did. If SMTP is not configured
the API answers `delivered: false`, and "Resend the link", "Forgot password" and
the profile banner say plainly that no email was sent and where to find the link
— instead of showing a success message for mail that never left the building.

### V2: discovery sections

The offers page opens with Featured banners → Ending Soon → Near You →
Recommended → All offers (§2). Each section hides itself when it has nothing to
show, and the whole block steps aside as soon as the visitor searches or
filters — at that point they want results, not merchandising.

Banners are a scroll-snap carousel. Clicking one goes straight to the promoted
offer's details page (§4), never to a banner page. Impressions are counted with
an `IntersectionObserver` at 50% visibility, once per banner per mount, so a
banner scrolled past off-screen is not counted.

`Near you` only appears once a location is known, which keeps §8.6 intact:
declining location narrows the page rather than breaking it.

### V3: subscription plans and premium analytics

`core/subscription.service.ts` holds the merchant's entitlements in signals,
loaded once for every shop they manage. That lets any component ask
`subscriptions.has('BRANCH_ANALYTICS')` synchronously — no component fetches its
own copy, and a lock icon can render on first paint.

The plan catalogue, its feature labels and the §3 comparison matrix all come
from the API, which serves the same file the backend enforces. The pricing page
therefore cannot advertise something the server will refuse.

**None of this is the access check.** Every dashboard also handles a
`PLAN_UPGRADE_REQUIRED` response from the API and swaps itself for the upgrade
prompt — driven by the server's answer rather than the cached plan, so a plan
changed in another tab still produces the right screen. The error interceptor
deliberately ignores that code: a plan gate is an expected answer, and the page
already says so in context.

Locked tabs are shown with a padlock rather than hidden. A merchant cannot
decide to upgrade for something they never knew existed (§31).

The nine dashboards share one filter contract (§27) held in
`AnalyticsFiltersService`, so moving between Overview, Offer Performance and
Reports keeps the merchant's date range and branch selection. `PremiumDashboard`
is the small base class behind each page: reload on filter change, skeleton
while in flight, upgrade prompt on refusal.

Related analytics are grouped rather than split one-per-page as §7 asks:
Customer Insights carries §13/§14/§23/§24, and Offer Intelligence carries
§16–§22.

Charts are hand-drawn SVG and CSS, with no charting dependency. Inline SVG
inherits the theme's custom properties, which is what makes light and dark mode
work without a second palette to maintain. Where there is not enough data, an
empty state is shown instead of a zeroed chart — §34 is explicit that a broken
or misleading chart is worse than none, and a chart of zeroes reads as a real
measurement.

Exports are fetched as a Blob rather than followed as a link, because the
request needs the `Authorization` header; a plain anchor would arrive
unauthenticated.

### V2: dark mode

`ThemeService` supports light, dark and system, persists the choice, and keeps
tracking the OS setting live while on 'system'. It writes `data-theme` to
`<html>`; every colour is a token redefined under `[data-theme='dark']`, so
there are no per-component dark variants to keep in sync.

Amber inverts its roles on dark: the mid-tones that were too light for white
text become the readable ones, so `--brand` moves *up* the scale (10.6:1 on the
dark surface) while the gold gradient keeps its dark ink for buttons. Every
dark pairing meets WCAG AA.

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
preview), Branches, Members.

**Analytics (V3)** — Overview (KPI cards with period-on-period change, trend
charts, alerts), Offer Performance, Customer Funnel, Location Insights, Branch
Performance, Customer Insights, Campaign Performance, Offer Intelligence
(recommendations, offer health, ending soon, best time to post, discount
effectiveness, offer comparison, category demand), Reports, and the
platform-wide view for Super Admins.

**Subscription (V3)** — Current plan with live usage against each allowance,
Billing (invoices and plan history), and Upgrade with the full plan comparison
matrix.

On the offer form the shop is taken from the user's role: with a single shop it
is filled in and shown as a fact rather than a one-option dropdown, several
shops give a picker, and none explains that a shop assignment is missing.

**Super Admin** — everything above across all shops, plus Shops CRUD,
Categories, Users and role assignment, Roles & permissions matrix, Review
moderation, Audit logs.

---

## Notes

- Maps are OpenStreetMap embeds and directions link out to Google Maps, so no
  map API key is needed. URLs are built from numeric coordinates and marked
  trusted via `DomSanitizer`; they are cached per branch so the iframe does not
  reload on every change-detection pass.
- The palette is amber/gold. Because yellow is bright, the roles are split: the
  `--brand*` tokens are dark ambers for text on light surfaces, the gradients
  are bright golds used only as backgrounds, and `--brand-ink` (a near-black
  brown) is the only colour placed on gold. That keeps buttons at 6.7:1 where
  white-on-yellow would have been 2.1:1. Every pairing meets WCAG AA.
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
