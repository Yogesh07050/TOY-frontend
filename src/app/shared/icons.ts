/**
 * Icon artwork.
 *
 * These are Ionicons (MIT), the same set the customer mobile app draws from
 * through `@expo/vector-icons` - so a saved offer, a shop or a claim is drawn
 * with the same glyph whichever surface the customer is on. That consistency is
 * the reason for vendoring rather than picking a second, web-only set.
 *
 * The paths are stored, not the whole `<svg>`: the component supplies the
 * wrapper, so size and colour are decided once at the call site. Ionicons ship
 * their outline weight as CSS classes on an external stylesheet, which does not
 * exist for inline SVG, so `fill="none"` and the stroke are baked in here
 * instead. `stroke="currentColor"` is what lets an icon inherit the colour of
 * the text it sits beside, in either theme.
 *
 * To add one: take the file from https://unpkg.com/ionicons@7.4.0/dist/ionicons/svg/,
 * drop the outer `<svg>`, and replace `class="ionicon-fill-none ionicon-stroke-width"`
 * with `fill="none" stroke="currentColor" stroke-width="32"`.
 */

/** Every icon the app can draw. A name outside this union will not compile. */
export type IconName =
  | 'add-circle-outline'
  | 'add-outline'
  | 'airplane-outline'
  | 'albums-outline'
  | 'alert-circle-outline'
  | 'apps-outline'
  | 'arrow-back-outline'
  | 'bag-handle-outline'
  | 'ban-outline'
  | 'bar-chart-outline'
  | 'barbell-outline'
  | 'basket-outline'
  | 'bed-outline'
  | 'book-outline'
  | 'bookmark'
  | 'bookmark-outline'
  | 'briefcase-outline'
  | 'bulb-outline'
  | 'business-outline'
  | 'calendar-clear-outline'
  | 'calendar-outline'
  | 'call-outline'
  | 'camera-outline'
  | 'car-outline'
  | 'card-outline'
  | 'cart-outline'
  | 'cash-outline'
  | 'chatbubble-ellipses-outline'
  | 'chatbubbles-outline'
  | 'checkmark-circle-outline'
  | 'checkmark-outline'
  | 'chevron-down-outline'
  | 'chevron-forward-outline'
  | 'close-outline'
  | 'cloud-upload-outline'
  | 'color-palette-outline'
  | 'compass-outline'
  | 'construct-outline'
  | 'copy-outline'
  | 'create-outline'
  | 'cube-outline'
  | 'cut-outline'
  | 'desktop-outline'
  | 'diamond-outline'
  | 'document-text-outline'
  | 'download-outline'
  | 'ellipse-outline'
  | 'ellipsis-horizontal-outline'
  | 'eye-off-outline'
  | 'eye-outline'
  | 'fast-food-outline'
  | 'flame-outline'
  | 'flash-outline'
  | 'footsteps-outline'
  | 'funnel-outline'
  | 'game-controller-outline'
  | 'gift'
  | 'gift-outline'
  | 'globe-outline'
  | 'grid-outline'
  | 'hammer-outline'
  | 'heart'
  | 'heart-outline'
  | 'home-outline'
  | 'hourglass-outline'
  | 'image-outline'
  | 'information-circle-outline'
  | 'key-outline'
  | 'laptop-outline'
  | 'layers-outline'
  | 'library-outline'
  | 'link-outline'
  | 'list-outline'
  | 'locate-outline'
  | 'location-outline'
  | 'lock-closed-outline'
  | 'log-out-outline'
  | 'mail-outline'
  | 'map-outline'
  | 'medal-outline'
  | 'medkit-outline'
  | 'megaphone-outline'
  | 'menu-outline'
  | 'moon-outline'
  | 'musical-notes-outline'
  | 'navigate-outline'
  | 'notifications-outline'
  | 'nutrition-outline'
  | 'options-outline'
  | 'paw-outline'
  | 'people-outline'
  | 'person-circle-outline'
  | 'person-outline'
  | 'phone-portrait-outline'
  | 'pie-chart-outline'
  | 'pizza-outline'
  | 'pricetag-outline'
  | 'pricetags-outline'
  | 'pulse-outline'
  | 'receipt-outline'
  | 'refresh-outline'
  | 'repeat-outline'
  | 'restaurant-outline'
  | 'ribbon-outline'
  | 'rocket-outline'
  | 'school-outline'
  | 'search-outline'
  | 'settings-outline'
  | 'share-social-outline'
  | 'shield-checkmark-outline'
  | 'shirt-outline'
  | 'sparkles'
  | 'sparkles-outline'
  | 'star'
  | 'star-half'
  | 'star-outline'
  | 'stats-chart-outline'
  | 'storefront'
  | 'storefront-outline'
  | 'sunny-outline'
  | 'swap-horizontal-outline'
  | 'thumbs-up-outline'
  | 'ticket-outline'
  | 'time-outline'
  | 'today-outline'
  | 'trending-up-outline'
  | 'trophy-outline'
  | 'walk-outline'
  | 'wallet-outline'
  | 'warning-outline';

/** Inner SVG for each icon, on Ionicons' 512x512 canvas. */
export const ICON_PATHS: Record<IconName, string> = {
  'add-circle-outline':
    '<path d="M448 256c0-106-86-192-192-192S64 150 64 256s86 192 192 192 192-86 192-192z" stroke-miterlimit="10" fill="none" stroke="currentColor" stroke-width="32"/><path stroke-linecap="round" stroke-linejoin="round" d="M256 176v160M336 256H176" fill="none" stroke="currentColor" stroke-width="32"/>',
  'add-outline':
    '<path stroke-linecap="round" stroke-linejoin="round" d="M256 112v288M400 256H112" fill="none" stroke="currentColor" stroke-width="32"/>',
  'airplane-outline':
    '<path d="M407.72 224c-3.4 0-14.79.1-18 .3l-64.9 1.7a1.83 1.83 0 01-1.69-.9L193.55 67.56a9 9 0 00-6.66-3.56H160l73 161a2.35 2.35 0 01-2.26 3.35l-121.69 1.8a8.06 8.06 0 01-6.6-3.1l-37-45c-3-3.9-8.62-6-13.51-6H33.08c-1.29 0-1.1 1.21-.75 2.43l19.84 71.42a16.3 16.3 0 010 11.9L32.31 333c-.59 1.95-.52 3 1.77 3H52c8.14 0 9.25-1.06 13.41-6.3l37.7-45.7a8.19 8.19 0 016.6-3.1l120.68 2.7a2.7 2.7 0 012.43 3.74L160 448h26.64a9 9 0 006.65-3.55L323.14 287c.39-.6 2-.9 2.69-.9l63.9 1.7c3.3.2 14.59.3 18 .3C452 288.1 480 275.93 480 256s-27.88-32-72.28-32z" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/>',
  'albums-outline':
    '<rect x="64" y="176" width="384" height="256" rx="28.87" ry="28.87" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><path stroke-linecap="round" stroke-miterlimit="10" d="M144 80h224M112 128h288" stroke="currentColor" stroke-width="32"/>',
  'alert-circle-outline':
    '<path d="M448 256c0-106-86-192-192-192S64 150 64 256s86 192 192 192 192-86 192-192z" stroke-miterlimit="10" fill="none" stroke="currentColor" stroke-width="32"/><path d="M250.26 166.05L256 288l5.73-121.95a5.74 5.74 0 00-5.79-6h0a5.74 5.74 0 00-5.68 6z" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><path d="M256 367.91a20 20 0 1120-20 20 20 0 01-20 20z"/>',
  'apps-outline':
    '<rect x="64" y="64" width="80" height="80" rx="40" ry="40" stroke-miterlimit="10" fill="none" stroke="currentColor" stroke-width="32"/><rect x="216" y="64" width="80" height="80" rx="40" ry="40" stroke-miterlimit="10" fill="none" stroke="currentColor" stroke-width="32"/><rect x="368" y="64" width="80" height="80" rx="40" ry="40" stroke-miterlimit="10" fill="none" stroke="currentColor" stroke-width="32"/><rect x="64" y="216" width="80" height="80" rx="40" ry="40" stroke-miterlimit="10" fill="none" stroke="currentColor" stroke-width="32"/><rect x="216" y="216" width="80" height="80" rx="40" ry="40" stroke-miterlimit="10" fill="none" stroke="currentColor" stroke-width="32"/><rect x="368" y="216" width="80" height="80" rx="40" ry="40" stroke-miterlimit="10" fill="none" stroke="currentColor" stroke-width="32"/><rect x="64" y="368" width="80" height="80" rx="40" ry="40" stroke-miterlimit="10" fill="none" stroke="currentColor" stroke-width="32"/><rect x="216" y="368" width="80" height="80" rx="40" ry="40" stroke-miterlimit="10" fill="none" stroke="currentColor" stroke-width="32"/><rect x="368" y="368" width="80" height="80" rx="40" ry="40" stroke-miterlimit="10" fill="none" stroke="currentColor" stroke-width="32"/>',
  'arrow-back-outline':
    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="M244 400L100 256l144-144M120 256h292" fill="none"/>',
  'bag-handle-outline':
    '<path d="M80 176a16 16 0 00-16 16v216c0 30.24 25.76 56 56 56h272c30.24 0 56-24.51 56-54.75V192a16 16 0 00-16-16zM160 176v-32a96 96 0 0196-96h0a96 96 0 0196 96v32" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><path d="M160 224v16a96 96 0 0096 96h0a96 96 0 0096-96v-16" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/>',
  'ban-outline':
    '<circle cx="256" cy="256" r="208" stroke-miterlimit="10" fill="none" stroke="currentColor" stroke-width="32"/><path stroke-miterlimit="10" d="M108.92 108.92l294.16 294.16" fill="none" stroke="currentColor" stroke-width="32"/>',
  'bar-chart-outline':
    '<path d="M32 32v432a16 16 0 0016 16h432" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><rect x="96" y="224" width="80" height="192" rx="20" ry="20" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><rect x="240" y="176" width="80" height="240" rx="20" ry="20" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><rect x="383.64" y="112" width="80" height="304" rx="20" ry="20" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/>',
  'barbell-outline':
    '<path stroke-linecap="round" stroke-linejoin="round" d="M48 256h416" fill="none" stroke="currentColor" stroke-width="32"/><rect x="384" y="128" width="32" height="256" rx="16" ry="16" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><rect x="96" y="128" width="32" height="256" rx="16" ry="16" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><rect x="32" y="192" width="16" height="128" rx="8" ry="8" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><rect x="464" y="192" width="16" height="128" rx="8" ry="8" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/>',
  'basket-outline':
    '<path d="M68.4 192A20.38 20.38 0 0048 212.2a17.87 17.87 0 00.8 5.5L100.5 400a40.46 40.46 0 0039.1 29.5h232.8a40.88 40.88 0 0039.3-29.5l51.7-182.3.6-5.5a20.38 20.38 0 00-20.4-20.2H68.4zm193.32 160.07A42.07 42.07 0 11304 310a42.27 42.27 0 01-42.28 42.07z" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><path stroke-linejoin="round" d="M160 192l96-128 96 128" fill="none" stroke="currentColor" stroke-width="32"/>',
  'bed-outline':
    '<path d="M384 240H96V136a40.12 40.12 0 0140-40h240a40.12 40.12 0 0140 40v104zM48 416V304a64.19 64.19 0 0164-64h288a64.19 64.19 0 0164 64v112" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><path d="M48 416v-8a24.07 24.07 0 0124-24h368a24.07 24.07 0 0124 24v8M112 240v-16a32.09 32.09 0 0132-32h80a32.09 32.09 0 0132 32v16M256 240v-16a32.09 32.09 0 0132-32h80a32.09 32.09 0 0132 32v16" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/>',
  'book-outline':
    '<path d="M256 160c16-63.16 76.43-95.41 208-96a15.94 15.94 0 0116 16v288a16 16 0 01-16 16c-128 0-177.45 25.81-208 64-30.37-38-80-64-208-64-9.88 0-16-8.05-16-17.93V80a15.94 15.94 0 0116-16c131.57.59 192 32.84 208 96zM256 160v288" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/>',
  'bookmark':
    '<path d="M400 480a16 16 0 01-10.63-4L256 357.41 122.63 476A16 16 0 0196 464V96a64.07 64.07 0 0164-64h192a64.07 64.07 0 0164 64v368a16 16 0 01-16 16z"/>',
  'bookmark-outline':
    '<path d="M352 48H160a48 48 0 00-48 48v368l144-128 144 128V96a48 48 0 00-48-48z" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/>',
  'briefcase-outline':
    '<rect x="32" y="128" width="448" height="320" rx="48" ry="48" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><path d="M144 128V96a32 32 0 0132-32h160a32 32 0 0132 32v32M480 240H32M320 240v24a8 8 0 01-8 8H200a8 8 0 01-8-8v-24" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/>',
  'bulb-outline':
    '<path d="M304 384v-24c0-29 31.54-56.43 52-76 28.84-27.57 44-64.61 44-108 0-80-63.73-144-144-144a143.6 143.6 0 00-144 144c0 41.84 15.81 81.39 44 108 20.35 19.21 52 46.7 52 76v24M224 480h64M208 432h96M256 384V256" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><path d="M294 240s-21.51 16-38 16-38-16-38-16" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/>',
  'business-outline':
    '<path stroke-linecap="round" stroke-linejoin="round" d="M176 416v64M80 32h192a32 32 0 0132 32v412a4 4 0 01-4 4H48h0V64a32 32 0 0132-32zM320 192h112a32 32 0 0132 32v256h0-160 0V208a16 16 0 0116-16z" fill="none" stroke="currentColor" stroke-width="32"/><path d="M98.08 431.87a16 16 0 1113.79-13.79 16 16 0 01-13.79 13.79zM98.08 351.87a16 16 0 1113.79-13.79 16 16 0 01-13.79 13.79zM98.08 271.87a16 16 0 1113.79-13.79 16 16 0 01-13.79 13.79zM98.08 191.87a16 16 0 1113.79-13.79 16 16 0 01-13.79 13.79zM98.08 111.87a16 16 0 1113.79-13.79 16 16 0 01-13.79 13.79zM178.08 351.87a16 16 0 1113.79-13.79 16 16 0 01-13.79 13.79zM178.08 271.87a16 16 0 1113.79-13.79 16 16 0 01-13.79 13.79zM178.08 191.87a16 16 0 1113.79-13.79 16 16 0 01-13.79 13.79zM178.08 111.87a16 16 0 1113.79-13.79 16 16 0 01-13.79 13.79zM258.08 431.87a16 16 0 1113.79-13.79 16 16 0 01-13.79 13.79zM258.08 351.87a16 16 0 1113.79-13.79 16 16 0 01-13.79 13.79zM258.08 271.87a16 16 0 1113.79-13.79 16 16 0 01-13.79 13.79z"/><ellipse cx="256" cy="176" rx="15.95" ry="16.03" transform="rotate(-45 255.99 175.996)"/><path d="M258.08 111.87a16 16 0 1113.79-13.79 16 16 0 01-13.79 13.79zM400 400a16 16 0 1016 16 16 16 0 00-16-16zM400 320a16 16 0 1016 16 16 16 0 00-16-16zM400 240a16 16 0 1016 16 16 16 0 00-16-16zM336 400a16 16 0 1016 16 16 16 0 00-16-16zM336 320a16 16 0 1016 16 16 16 0 00-16-16zM336 240a16 16 0 1016 16 16 16 0 00-16-16z"/>',
  'calendar-clear-outline':
    '<rect stroke-linejoin="round" x="48" y="80" width="416" height="384" rx="48" fill="none" stroke="currentColor" stroke-width="32"/><path stroke-linejoin="round" stroke-linecap="round" d="M128 48v32M384 48v32M464 160H48" fill="none" stroke="currentColor" stroke-width="32"/>',
  'calendar-outline':
    '<rect stroke-linejoin="round" x="48" y="80" width="416" height="384" rx="48" fill="none" stroke="currentColor" stroke-width="32"/><circle cx="296" cy="232" r="24"/><circle cx="376" cy="232" r="24"/><circle cx="296" cy="312" r="24"/><circle cx="376" cy="312" r="24"/><circle cx="136" cy="312" r="24"/><circle cx="216" cy="312" r="24"/><circle cx="136" cy="392" r="24"/><circle cx="216" cy="392" r="24"/><circle cx="296" cy="392" r="24"/><path stroke-linejoin="round" stroke-linecap="round" d="M128 48v32M384 48v32" fill="none" stroke="currentColor" stroke-width="32"/><path stroke-linejoin="round" d="M464 160H48" fill="none" stroke="currentColor" stroke-width="32"/>',
  'call-outline':
    '<path d="M451 374c-15.88-16-54.34-39.35-73-48.76-24.3-12.24-26.3-13.24-45.4.95-12.74 9.47-21.21 17.93-36.12 14.75s-47.31-21.11-75.68-49.39-47.34-61.62-50.53-76.48 5.41-23.23 14.79-36c13.22-18 12.22-21 .92-45.3-8.81-18.9-32.84-57-48.9-72.8C119.9 44 119.9 47 108.83 51.6A160.15 160.15 0 0083 65.37C67 76 58.12 84.83 51.91 98.1s-9 44.38 23.07 102.64 54.57 88.05 101.14 134.49S258.5 406.64 310.85 436c64.76 36.27 89.6 29.2 102.91 23s22.18-15 32.83-31a159.09 159.09 0 0013.8-25.8C465 391.17 468 391.17 451 374z" stroke-miterlimit="10" fill="none" stroke="currentColor" stroke-width="32"/>',
  'camera-outline':
    '<path d="M350.54 148.68l-26.62-42.06C318.31 100.08 310.62 96 302 96h-92c-8.62 0-16.31 4.08-21.92 10.62l-26.62 42.06C155.85 155.23 148.62 160 140 160H80a32 32 0 00-32 32v192a32 32 0 0032 32h352a32 32 0 0032-32V192a32 32 0 00-32-32h-59c-8.65 0-16.85-4.77-22.46-11.32z" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><circle cx="256" cy="272" r="80" stroke-miterlimit="10" fill="none" stroke="currentColor" stroke-width="32"/><path stroke-linecap="round" stroke-linejoin="round" d="M124 158v-22h-24v22" fill="none" stroke="currentColor" stroke-width="32"/>',
  'car-outline':
    '<path d="M80 224l37.78-88.15C123.93 121.5 139.6 112 157.11 112h197.78c17.51 0 33.18 9.5 39.33 23.85L432 224M80 224h352v144H80zM112 368v32H80v-32M432 368v32h-32v-32" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><circle cx="144" cy="288" r="16" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><circle cx="368" cy="288" r="16" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/>',
  'card-outline':
    '<rect x="48" y="96" width="416" height="320" rx="56" ry="56" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><path stroke-linejoin="round" stroke-width="60" d="M48 192h416M128 300h48v20h-48z" fill="none"/>',
  'cart-outline':
    '<circle cx="176" cy="416" r="16" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><circle cx="400" cy="416" r="16" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><path stroke-linecap="round" stroke-linejoin="round" d="M48 80h64l48 272h256" fill="none" stroke="currentColor" stroke-width="32"/><path d="M160 288h249.44a8 8 0 007.85-6.43l28.8-144a8 8 0 00-7.85-9.57H128" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/>',
  'cash-outline':
    '<rect x="32" y="80" width="448" height="256" rx="16" ry="16" transform="rotate(180 256 208)" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><path stroke-linecap="round" stroke-linejoin="round" d="M64 384h384M96 432h320" fill="none" stroke="currentColor" stroke-width="32"/><circle cx="256" cy="208" r="80" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><path d="M480 160a80 80 0 01-80-80M32 160a80 80 0 0080-80M480 256a80 80 0 00-80 80M32 256a80 80 0 0180 80" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/>',
  'chatbubble-ellipses-outline':
    '<path d="M87.48 380c1.2-4.38-1.43-10.47-3.94-14.86a42.63 42.63 0 00-2.54-3.8 199.81 199.81 0 01-33-110C47.64 139.09 140.72 48 255.82 48 356.2 48 440 117.54 459.57 209.85a199 199 0 014.43 41.64c0 112.41-89.49 204.93-204.59 204.93-18.31 0-43-4.6-56.47-8.37s-26.92-8.77-30.39-10.11a31.14 31.14 0 00-11.13-2.07 30.7 30.7 0 00-12.08 2.43L81.5 462.78a15.92 15.92 0 01-4.66 1.22 9.61 9.61 0 01-9.58-9.74 15.85 15.85 0 01.6-3.29z" stroke-linecap="round" stroke-miterlimit="10" fill="none" stroke="currentColor" stroke-width="32"/><circle cx="160" cy="256" r="32"/><circle cx="256" cy="256" r="32"/><circle cx="352" cy="256" r="32"/>',
  'chatbubbles-outline':
    '<path d="M431 320.6c-1-3.6 1.2-8.6 3.3-12.2a33.68 33.68 0 012.1-3.1A162 162 0 00464 215c.3-92.2-77.5-167-173.7-167-83.9 0-153.9 57.1-170.3 132.9a160.7 160.7 0 00-3.7 34.2c0 92.3 74.8 169.1 171 169.1 15.3 0 35.9-4.6 47.2-7.7s22.5-7.2 25.4-8.3a26.44 26.44 0 019.3-1.7 26 26 0 0110.1 2l56.7 20.1a13.52 13.52 0 003.9 1 8 8 0 008-8 12.85 12.85 0 00-.5-2.7z" stroke-linecap="round" stroke-miterlimit="10" fill="none" stroke="currentColor" stroke-width="32"/><path d="M66.46 232a146.23 146.23 0 006.39 152.67c2.31 3.49 3.61 6.19 3.21 8s-11.93 61.87-11.93 61.87a8 8 0 002.71 7.68A8.17 8.17 0 0072 464a7.26 7.26 0 002.91-.6l56.21-22a15.7 15.7 0 0112 .2c18.94 7.38 39.88 12 60.83 12A159.21 159.21 0 00284 432.11" stroke-linecap="round" stroke-miterlimit="10" fill="none" stroke="currentColor" stroke-width="32"/>',
  'checkmark-circle-outline':
    '<path d="M448 256c0-106-86-192-192-192S64 150 64 256s86 192 192 192 192-86 192-192z" stroke-miterlimit="10" fill="none" stroke="currentColor" stroke-width="32"/><path stroke-linecap="round" stroke-linejoin="round" d="M352 176L217.6 336 160 272" fill="none" stroke="currentColor" stroke-width="32"/>',
  'checkmark-outline':
    '<path stroke-linecap="round" stroke-linejoin="round" d="M416 128L192 384l-96-96" fill="none" stroke="currentColor" stroke-width="32"/>',
  'chevron-down-outline':
    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="M112 184l144 144 144-144" fill="none"/>',
  'chevron-forward-outline':
    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="M184 112l144 144-144 144" fill="none"/>',
  'close-outline':
    '<path stroke-linecap="round" stroke-linejoin="round" d="M368 368L144 144M368 144L144 368" fill="none" stroke="currentColor" stroke-width="32"/>',
  'cloud-upload-outline':
    '<path d="M320 367.79h76c55 0 100-29.21 100-83.6s-53-81.47-96-83.6c-8.89-85.06-71-136.8-144-136.8-69 0-113.44 45.79-128 91.2-60 5.7-112 43.88-112 106.4s54 106.4 120 106.4h56" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><path stroke-linecap="round" stroke-linejoin="round" d="M320 255.79l-64-64-64 64M256 448.21V207.79" fill="none" stroke="currentColor" stroke-width="32"/>',
  'color-palette-outline':
    '<path d="M430.11 347.9c-6.6-6.1-16.3-7.6-24.6-9-11.5-1.9-15.9-4-22.6-10-14.3-12.7-14.3-31.1 0-43.8l30.3-26.9c46.4-41 46.4-108.2 0-149.2-34.2-30.1-80.1-45-127.8-45-55.7 0-113.9 20.3-158.8 60.1-83.5 73.8-83.5 194.7 0 268.5 41.5 36.7 97.5 55 152.9 55.4h1.7c55.4 0 110-17.9 148.8-52.4 14.4-12.7 11.99-36.6.1-47.7z" stroke-miterlimit="10" fill="none" stroke="currentColor" stroke-width="32"/><circle cx="144" cy="208" r="32"/><circle cx="152" cy="311" r="32"/><circle cx="224" cy="144" r="32"/><circle cx="256" cy="367" r="48"/><circle cx="328" cy="144" r="32"/>',
  'compass-outline':
    '<path d="M448 256c0-106-86-192-192-192S64 150 64 256s86 192 192 192 192-86 192-192z" stroke-miterlimit="10" fill="none" stroke="currentColor" stroke-width="32"/><path d="M350.67 150.93l-117.2 46.88a64 64 0 00-35.66 35.66l-46.88 117.2a8 8 0 0010.4 10.4l117.2-46.88a64 64 0 0035.66-35.66l46.88-117.2a8 8 0 00-10.4-10.4zM256 280a24 24 0 1124-24 24 24 0 01-24 24z"/>',
  'construct-outline':
    '<path d="M436.67 184.11a27.17 27.17 0 01-38.3 0l-22.48-22.49a27.15 27.15 0 010-38.29l50.89-50.89a.85.85 0 00-.26-1.38C393.68 57 351.09 64.15 324.05 91c-25.88 25.69-27.35 64.27-17.87 98a27 27 0 01-7.67 27.14l-173 160.76a40.76 40.76 0 1057.57 57.54l162.15-173.3a27 27 0 0126.77-7.7c33.46 8.94 71.49 7.26 97.07-17.94 27.49-27.08 33.42-74.94 20.1-102.33a.85.85 0 00-1.36-.22z" stroke-linecap="round" stroke-miterlimit="10" fill="none" stroke="currentColor" stroke-width="32"/><path d="M224 284c-17.48-17-25.49-24.91-31-30.29a18.24 18.24 0 01-3.33-21.35 20.76 20.76 0 013.5-4.62l15.68-15.29a18.66 18.66 0 015.63-3.87 18.11 18.11 0 0120 3.62c5.45 5.29 15.43 15 33.41 32.52M317.07 291.3c40.95 38.1 90.62 83.27 110 99.41a13.46 13.46 0 01.94 19.92L394.63 444a14 14 0 01-20.29-.76c-16.53-19.18-61.09-67.11-99.27-107" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><path d="M17.34 193.5l29.41-28.74a4.71 4.71 0 013.41-1.35 4.85 4.85 0 013.41 1.35h0a9.86 9.86 0 008.19 2.77c3.83-.42 7.92-1.6 10.57-4.12 6-5.8-.94-17.23 4.34-24.54a207 207 0 0119.78-22.6c6-5.88 29.84-28.32 69.9-44.45A107.31 107.31 0 01206.67 64c22.59 0 40 10 46.26 15.67a89.54 89.54 0 0110.28 11.64 78.92 78.92 0 00-9.21-2.77 68.82 68.82 0 00-20-1.26c-13.33 1.09-29.41 7.26-38 14-13.9 11-19.87 25.72-20.81 44.71-.68 14.12 2.72 22.1 36.1 55.49a6.6 6.6 0 01-.34 9.16l-18.22 18a6.88 6.88 0 01-9.54.09c-21.94-21.94-36.65-33.09-45-38.16s-15.07-6.5-18.3-6.85a30.85 30.85 0 00-18.27 3.87 11.39 11.39 0 00-2.64 2 14.14 14.14 0 00.42 20.08l1.71 1.6a4.63 4.63 0 010 6.64L71.73 246.6a4.71 4.71 0 01-3.41 1.4 4.86 4.86 0 01-3.41-1.35l-47.57-46.43a4.88 4.88 0 010-6.72z" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/>',
  'copy-outline':
    '<rect x="128" y="128" width="336" height="336" rx="57" ry="57" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><path d="M383.5 128l.5-24a56.16 56.16 0 00-56-56H112a64.19 64.19 0 00-64 64v216a56.16 56.16 0 0056 56h24" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/>',
  'create-outline':
    '<path d="M384 224v184a40 40 0 01-40 40H104a40 40 0 01-40-40V168a40 40 0 0140-40h167.48" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><path d="M459.94 53.25a16.06 16.06 0 00-23.22-.56L424.35 65a8 8 0 000 11.31l11.34 11.32a8 8 0 0011.34 0l12.06-12c6.1-6.09 6.67-16.01.85-22.38zM399.34 90L218.82 270.2a9 9 0 00-2.31 3.93L208.16 299a3.91 3.91 0 004.86 4.86l24.85-8.35a9 9 0 003.93-2.31L422 112.66a9 9 0 000-12.66l-9.95-10a9 9 0 00-12.71 0z"/>',
  'cube-outline':
    '<path d="M448 341.37V170.61A32 32 0 00432.11 143l-152-88.46a47.94 47.94 0 00-48.24 0L79.89 143A32 32 0 0064 170.61v170.76A32 32 0 0079.89 369l152 88.46a48 48 0 0048.24 0l152-88.46A32 32 0 00448 341.37z" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><path stroke-linecap="round" stroke-linejoin="round" d="M69 153.99l187 110 187-110M256 463.99v-200" fill="none" stroke="currentColor" stroke-width="32"/>',
  'cut-outline':
    '<circle cx="104" cy="152" r="56" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><circle cx="104" cy="360" r="56" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><path d="M157 175l-11 15 37 15s3.46-6.42 7-10z" stroke-linecap="square" stroke-miterlimit="10" fill="none" stroke="currentColor" stroke-width="32"/><path d="M154.17 334.43L460 162c-2.5-6.7-28-12-64-4-29.12 6.47-121.16 29.05-159.16 56.05C205.85 236.06 227 272 192 298c-25.61 19-44.43 22.82-44.43 22.82zM344.47 278.24L295 306.67c14.23 6.74 65.54 33.27 117 36.33 14.92.89 30 .39 39-6z" stroke-linecap="round" stroke-miterlimit="10" fill="none" stroke="currentColor" stroke-width="32"/><circle cx="256" cy="240" r="32" stroke-miterlimit="10" fill="none" stroke="currentColor" stroke-width="32"/>',
  'desktop-outline':
    '<rect x="32" y="64" width="448" height="320" rx="32" ry="32" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><path stroke-linecap="round" stroke-linejoin="round" d="M304 448l-8-64h-80l-8 64h96z" stroke="currentColor" stroke-width="32"/><path stroke-linecap="round" stroke-linejoin="round" d="M368 448H144" fill="none" stroke="currentColor" stroke-width="32"/><path d="M32 304v48a32.09 32.09 0 0032 32h384a32.09 32.09 0 0032-32v-48zm224 64a16 16 0 1116-16 16 16 0 01-16 16z"/>',
  'diamond-outline':
    '<path d="M35.42 188.21l207.75 269.46a16.17 16.17 0 0025.66 0l207.75-269.46a16.52 16.52 0 00.95-18.75L407.06 55.71A16.22 16.22 0 00393.27 48H118.73a16.22 16.22 0 00-13.79 7.71L34.47 169.46a16.52 16.52 0 00.95 18.75zM48 176h416" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><path stroke-linecap="round" stroke-linejoin="round" d="M400 64l-48 112-96-128M112 64l48 112 96-128M256 448l-96-272M256 448l96-272" fill="none" stroke="currentColor" stroke-width="32"/>',
  'document-text-outline':
    '<path d="M416 221.25V416a48 48 0 01-48 48H144a48 48 0 01-48-48V96a48 48 0 0148-48h98.75a32 32 0 0122.62 9.37l141.26 141.26a32 32 0 019.37 22.62z" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><path d="M256 56v120a32 32 0 0032 32h120M176 288h160M176 368h160" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/>',
  'download-outline':
    '<path d="M336 176h40a40 40 0 0140 40v208a40 40 0 01-40 40H136a40 40 0 01-40-40V216a40 40 0 0140-40h40" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><path stroke-linecap="round" stroke-linejoin="round" d="M176 272l80 80 80-80M256 48v288" fill="none" stroke="currentColor" stroke-width="32"/>',
  'ellipse-outline':
    '<circle cx="256" cy="256" r="192" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/>',
  'ellipsis-horizontal-outline':
    '<circle cx="256" cy="256" r="32" stroke-miterlimit="10" fill="none" stroke="currentColor" stroke-width="32"/><circle cx="416" cy="256" r="32" stroke-miterlimit="10" fill="none" stroke="currentColor" stroke-width="32"/><circle cx="96" cy="256" r="32" stroke-miterlimit="10" fill="none" stroke="currentColor" stroke-width="32"/>',
  'eye-off-outline':
    '<path d="M432 448a15.92 15.92 0 01-11.31-4.69l-352-352a16 16 0 0122.62-22.62l352 352A16 16 0 01432 448zM255.66 384c-41.49 0-81.5-12.28-118.92-36.5-34.07-22-64.74-53.51-88.7-91v-.08c19.94-28.57 41.78-52.73 65.24-72.21a2 2 0 00.14-2.94L93.5 161.38a2 2 0 00-2.71-.12c-24.92 21-48.05 46.76-69.08 76.92a31.92 31.92 0 00-.64 35.54c26.41 41.33 60.4 76.14 98.28 100.65C162 402 207.9 416 255.66 416a239.13 239.13 0 0075.8-12.58 2 2 0 00.77-3.31l-21.58-21.58a4 4 0 00-3.83-1 204.8 204.8 0 01-51.16 6.47zM490.84 238.6c-26.46-40.92-60.79-75.68-99.27-100.53C349 110.55 302 96 255.66 96a227.34 227.34 0 00-74.89 12.83 2 2 0 00-.75 3.31l21.55 21.55a4 4 0 003.88 1 192.82 192.82 0 0150.21-6.69c40.69 0 80.58 12.43 118.55 37 34.71 22.4 65.74 53.88 89.76 91a.13.13 0 010 .16 310.72 310.72 0 01-64.12 72.73 2 2 0 00-.15 2.95l19.9 19.89a2 2 0 002.7.13 343.49 343.49 0 0068.64-78.48 32.2 32.2 0 00-.1-34.78z"/><path d="M256 160a95.88 95.88 0 00-21.37 2.4 2 2 0 00-1 3.38l112.59 112.56a2 2 0 003.38-1A96 96 0 00256 160zM165.78 233.66a2 2 0 00-3.38 1 96 96 0 00115 115 2 2 0 001-3.38z"/>',
  'eye-outline':
    '<path d="M255.66 112c-77.94 0-157.89 45.11-220.83 135.33a16 16 0 00-.27 17.77C82.92 340.8 161.8 400 255.66 400c92.84 0 173.34-59.38 221.79-135.25a16.14 16.14 0 000-17.47C428.89 172.28 347.8 112 255.66 112z" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><circle cx="256" cy="256" r="80" stroke-miterlimit="10" fill="none" stroke="currentColor" stroke-width="32"/>',
  'fast-food-outline':
    '<path d="M322 416c0 35.35-20.65 64-56 64H134c-35.35 0-56-28.65-56-64M336 336c17.67 0 32 17.91 32 40h0c0 22.09-14.33 40-32 40H64c-17.67 0-32-17.91-32-40h0c0-22.09 14.33-40 32-40" stroke-linecap="round" stroke-miterlimit="10" fill="none" stroke="currentColor" stroke-width="32"/><path d="M344 336H179.31a8 8 0 00-5.65 2.34l-26.83 26.83a4 4 0 01-5.66 0l-26.83-26.83a8 8 0 00-5.65-2.34H56a24 24 0 01-24-24h0a24 24 0 0124-24h288a24 24 0 0124 24h0a24 24 0 01-24 24zM64 276v-.22c0-55 45-83.78 100-83.78h72c55 0 100 29 100 84v-.22M241 112l7.44 63.97" stroke-linecap="round" stroke-miterlimit="10" fill="none" stroke="currentColor" stroke-width="32"/><path d="M256 480h139.31a32 32 0 0031.91-29.61L463 112" stroke-linecap="round" stroke-miterlimit="10" fill="none" stroke="currentColor" stroke-width="32"/><path stroke-linecap="round" stroke-linejoin="round" d="M368 112l16-64 47-16" fill="none" stroke="currentColor" stroke-width="32"/><path stroke-linecap="round" stroke-miterlimit="10" d="M224 112h256" fill="none" stroke="currentColor" stroke-width="32"/>',
  'flame-outline':
    '<path d="M112 320c0-93 124-165 96-272 66 0 192 96 192 272a144 144 0 01-288 0z" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><path d="M320 368c0 57.71-32 80-64 80s-64-22.29-64-80 40-86 32-128c42 0 96 70.29 96 128z" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/>',
  'flash-outline':
    '<path d="M315.27 33L96 304h128l-31.51 173.23a2.36 2.36 0 002.33 2.77h0a2.36 2.36 0 001.89-.95L416 208H288l31.66-173.25a2.45 2.45 0 00-2.44-2.75h0a2.42 2.42 0 00-1.95 1z" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/>',
  'footsteps-outline':
    '<path d="M200 246.84c8.81 58.62-7.33 90.67-52.91 97.41-50.65 7.49-71.52-26.44-80.33-85.06-11.85-78.88 16-127.94 55.71-131.1 36.14-2.87 68.71 60.14 77.53 118.75zM223.65 409.53c3.13 33.28-14.86 64.34-42 69.66-27.4 5.36-58.71-16.37-65.09-49.19s17.75-34.56 47.32-40.21 55.99-20.4 59.77 19.74zM312 150.83c-8.81 58.62 7.33 90.67 52.9 97.41 50.66 7.49 71.52-26.44 80.33-85.06 11.86-78.89-16-128.22-55.7-131.1-36.4-2.64-68.71 60.13-77.53 118.75zM288.35 313.53c-3.13 33.27 14.86 64.34 42 69.66 27.4 5.36 58.71-16.37 65.09-49.19s-17.75-34.56-47.32-40.22-55.99-20.4-59.77 19.75z" stroke-miterlimit="10" fill="none" stroke="currentColor" stroke-width="32"/>',
  'funnel-outline':
    '<path d="M35.4 87.12l168.65 196.44A16.07 16.07 0 01208 294v119.32a7.93 7.93 0 005.39 7.59l80.15 26.67A7.94 7.94 0 00304 440V294a16.07 16.07 0 014-10.44L476.6 87.12A14 14 0 00466 64H46.05A14 14 0 0035.4 87.12z" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/>',
  'game-controller-outline':
    '<path d="M467.51 248.83c-18.4-83.18-45.69-136.24-89.43-149.17A91.5 91.5 0 00352 96c-26.89 0-48.11 16-96 16s-69.15-16-96-16a99.09 99.09 0 00-27.2 3.66C89 112.59 61.94 165.7 43.33 248.83c-19 84.91-15.56 152 21.58 164.88 26 9 49.25-9.61 71.27-37 25-31.2 55.79-40.8 119.82-40.8s93.62 9.6 118.66 40.8c22 27.41 46.11 45.79 71.42 37.16 41.02-14.01 40.44-79.13 21.43-165.04z" stroke-miterlimit="10" fill="none" stroke="currentColor" stroke-width="32"/><circle cx="292" cy="224" r="20"/><path d="M336 288a20 20 0 1120-19.95A20 20 0 01336 288z"/><circle cx="336" cy="180" r="20"/><circle cx="380" cy="224" r="20"/><path stroke-linecap="round" stroke-linejoin="round" d="M160 176v96M208 224h-96" fill="none" stroke="currentColor" stroke-width="32"/>',
  'gift':
    '<path d="M200 144h40v-40a40 40 0 10-40 40zM352 104a40 40 0 00-80 0v40h40a40 40 0 0040-40z" fill="none"/><path d="M80 416a64 64 0 0064 64h92a4 4 0 004-4V292a4 4 0 00-4-4H88a8 8 0 00-8 8zM240 252V144h32v108a4 4 0 004 4h140a47.93 47.93 0 0016-2.75A48.09 48.09 0 00464 208v-16a48 48 0 00-48-48h-40.54a2 2 0 01-1.7-3A72 72 0 00256 58.82 72 72 0 00138.24 141a2 2 0 01-1.7 3H96a48 48 0 00-48 48v16a48.09 48.09 0 0032 45.25A47.93 47.93 0 0096 256h140a4 4 0 004-4zm32-148a40 40 0 1140 40h-40zm-74.86-39.9A40 40 0 01240 104v40h-40a40 40 0 01-2.86-79.89zM276 480h92a64 64 0 0064-64V296a8 8 0 00-8-8H276a4 4 0 00-4 4v184a4 4 0 004 4z"/>',
  'gift-outline':
    '<path d="M256 104v56h56a56 56 0 10-56-56zM256 104v56h-56a56 56 0 1156-56z" stroke-linecap="round" stroke-miterlimit="10" fill="none" stroke="currentColor" stroke-width="32"/><rect x="64" y="160" width="384" height="112" rx="32" ry="32" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><path d="M416 272v144a48 48 0 01-48 48H144a48 48 0 01-48-48V272M256 160v304" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/>',
  'globe-outline':
    '<path d="M256 48C141.13 48 48 141.13 48 256s93.13 208 208 208 208-93.13 208-208S370.87 48 256 48z" stroke-miterlimit="10" fill="none" stroke="currentColor" stroke-width="32"/><path d="M256 48c-58.07 0-112.67 93.13-112.67 208S197.93 464 256 464s112.67-93.13 112.67-208S314.07 48 256 48z" stroke-miterlimit="10" fill="none" stroke="currentColor" stroke-width="32"/><path d="M117.33 117.33c38.24 27.15 86.38 43.34 138.67 43.34s100.43-16.19 138.67-43.34M394.67 394.67c-38.24-27.15-86.38-43.34-138.67-43.34s-100.43 16.19-138.67 43.34" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><path stroke-miterlimit="10" d="M256 48v416M464 256H48" fill="none" stroke="currentColor" stroke-width="32"/>',
  'grid-outline':
    '<rect x="48" y="48" width="176" height="176" rx="20" ry="20" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><rect x="288" y="48" width="176" height="176" rx="20" ry="20" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><rect x="48" y="288" width="176" height="176" rx="20" ry="20" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><rect x="288" y="288" width="176" height="176" rx="20" ry="20" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/>',
  'hammer-outline':
    '<path d="M277.42 247a24.68 24.68 0 00-4.08-5.47L255 223.44a21.63 21.63 0 00-6.56-4.57 20.93 20.93 0 00-23.28 4.27c-6.36 6.26-18 17.68-39 38.43C146 301.3 71.43 367.89 37.71 396.29a16 16 0 00-1.09 23.54l39 39.43a16.13 16.13 0 0023.67-.89c29.24-34.37 96.3-109 136-148.23 20.39-20.06 31.82-31.58 38.29-37.94a21.76 21.76 0 003.84-25.2zM478.43 201l-34.31-34a5.44 5.44 0 00-4-1.59 5.59 5.59 0 00-4 1.59h0a11.41 11.41 0 01-9.55 3.27c-4.48-.49-9.25-1.88-12.33-4.86-7-6.86 1.09-20.36-5.07-29a242.88 242.88 0 00-23.08-26.72c-7.06-7-34.81-33.47-81.55-52.53a123.79 123.79 0 00-47-9.24c-26.35 0-46.61 11.76-54 18.51-5.88 5.32-12 13.77-12 13.77a91.29 91.29 0 0110.81-3.2 79.53 79.53 0 0123.28-1.49C241.19 76.8 259.94 84.1 270 92c16.21 13 23.18 30.39 24.27 52.83.8 16.69-15.23 37.76-30.44 54.94a7.85 7.85 0 00.4 10.83l21.24 21.23a8 8 0 0011.14.1c13.93-13.51 31.09-28.47 40.82-34.46s17.58-7.68 21.35-8.09a35.71 35.71 0 0121.3 4.62 13.65 13.65 0 013.08 2.38c6.46 6.56 6.07 17.28-.5 23.74l-2 1.89a5.5 5.5 0 000 7.84l34.31 34a5.5 5.5 0 004 1.58 5.65 5.65 0 004-1.58L478.43 209a5.82 5.82 0 000-8z" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/>',
  'heart':
    '<path d="M256 448a32 32 0 01-18-5.57c-78.59-53.35-112.62-89.93-131.39-112.8-40-48.75-59.15-98.8-58.61-153C48.63 114.52 98.46 64 159.08 64c44.08 0 74.61 24.83 92.39 45.51a6 6 0 009.06 0C278.31 88.81 308.84 64 352.92 64c60.62 0 110.45 50.52 111.08 112.64.54 54.21-18.63 104.26-58.61 153-18.77 22.87-52.8 59.45-131.39 112.8a32 32 0 01-18 5.56z"/>',
  'heart-outline':
    '<path d="M352.92 80C288 80 256 144 256 144s-32-64-96.92-64c-52.76 0-94.54 44.14-95.08 96.81-1.1 109.33 86.73 187.08 183 252.42a16 16 0 0018 0c96.26-65.34 184.09-143.09 183-252.42-.54-52.67-42.32-96.81-95.08-96.81z" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/>',
  'home-outline':
    '<path d="M80 212v236a16 16 0 0016 16h96V328a24 24 0 0124-24h80a24 24 0 0124 24v136h96a16 16 0 0016-16V212" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><path d="M480 256L266.89 52c-5-5.28-16.69-5.34-21.78 0L32 256M400 179V64h-48v69" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/>',
  'hourglass-outline':
    '<path d="M145.61 464h220.78c19.8 0 35.55-16.29 33.42-35.06C386.06 308 304 310 304 256s83.11-51 95.8-172.94c2-18.78-13.61-35.06-33.41-35.06H145.61c-19.8 0-35.37 16.28-33.41 35.06C124.89 205 208 201 208 256s-82.06 52-95.8 172.94c-2.14 18.77 13.61 35.06 33.41 35.06z" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><path d="M343.3 432H169.13c-15.6 0-20-18-9.06-29.16C186.55 376 240 356.78 240 326V224c0-19.85-38-35-61.51-67.2-3.88-5.31-3.49-12.8 6.37-12.8h142.73c8.41 0 10.23 7.43 6.4 12.75C310.82 189 272 204.05 272 224v102c0 30.53 55.71 47 80.4 76.87 9.95 12.04 6.47 29.13-9.1 29.13z"/>',
  'image-outline':
    '<rect x="48" y="80" width="416" height="352" rx="48" ry="48" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><circle cx="336" cy="176" r="32" stroke-miterlimit="10" fill="none" stroke="currentColor" stroke-width="32"/><path d="M304 335.79l-90.66-90.49a32 32 0 00-43.87-1.3L48 352M224 432l123.34-123.34a32 32 0 0143.11-2L464 368" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/>',
  'information-circle-outline':
    '<path d="M248 64C146.39 64 64 146.39 64 248s82.39 184 184 184 184-82.39 184-184S349.61 64 248 64z" stroke-miterlimit="10" fill="none" stroke="currentColor" stroke-width="32"/><path stroke-linecap="round" stroke-linejoin="round" d="M220 220h32v116" fill="none" stroke="currentColor" stroke-width="32"/><path stroke-linecap="round" stroke-miterlimit="10" d="M208 340h88" fill="none" stroke="currentColor" stroke-width="32"/><path d="M248 130a26 26 0 1026 26 26 26 0 00-26-26z"/>',
  'key-outline':
    '<path d="M218.1 167.17c0 13 0 25.6 4.1 37.4-43.1 50.6-156.9 184.3-167.5 194.5a20.17 20.17 0 00-6.7 15c0 8.5 5.2 16.7 9.6 21.3 6.6 6.9 34.8 33 40 28 15.4-15 18.5-19 24.8-25.2 9.5-9.3-1-28.3 2.3-36s6.8-9.2 12.5-10.4 15.8 2.9 23.7 3c8.3.1 12.8-3.4 19-9.2 5-4.6 8.6-8.9 8.7-15.6.2-9-12.8-20.9-3.1-30.4s23.7 6.2 34 5 22.8-15.5 24.1-21.6-11.7-21.8-9.7-30.7c.7-3 6.8-10 11.4-11s25 6.9 29.6 5.9c5.6-1.2 12.1-7.1 17.4-10.4 15.5 6.7 29.6 9.4 47.7 9.4 68.5 0 124-53.4 124-119.2S408.5 48 340 48s-121.9 53.37-121.9 119.17zM400 144a32 32 0 11-32-32 32 32 0 0132 32z" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/>',
  'laptop-outline':
    '<rect x="48" y="96" width="416" height="304" rx="32.14" ry="32.14" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><path stroke-linecap="round" stroke-miterlimit="10" d="M16 416h480" stroke="currentColor" stroke-width="32"/>',
  'layers-outline':
    '<path d="M434.8 137.65l-149.36-68.1c-16.19-7.4-42.69-7.4-58.88 0L77.3 137.65c-17.6 8-17.6 21.09 0 29.09l148 67.5c16.89 7.7 44.69 7.7 61.58 0l148-67.5c17.52-8 17.52-21.1-.08-29.09zM160 308.52l-82.7 37.11c-17.6 8-17.6 21.1 0 29.1l148 67.5c16.89 7.69 44.69 7.69 61.58 0l148-67.5c17.6-8 17.6-21.1 0-29.1l-79.94-38.47" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><path d="M160 204.48l-82.8 37.16c-17.6 8-17.6 21.1 0 29.1l148 67.49c16.89 7.7 44.69 7.7 61.58 0l148-67.49c17.7-8 17.7-21.1.1-29.1L352 204.48" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/>',
  'library-outline':
    '<rect x="32" y="96" width="64" height="368" rx="16" ry="16" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><path stroke-linecap="round" stroke-linejoin="round" d="M112 224h128M112 400h128" fill="none" stroke="currentColor" stroke-width="32"/><rect x="112" y="160" width="128" height="304" rx="16" ry="16" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><rect x="256" y="48" width="96" height="416" rx="16" ry="16" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><path d="M422.46 96.11l-40.4 4.25c-11.12 1.17-19.18 11.57-17.93 23.1l34.92 321.59c1.26 11.53 11.37 20 22.49 18.84l40.4-4.25c11.12-1.17 19.18-11.57 17.93-23.1L445 115c-1.31-11.58-11.42-20.06-22.54-18.89z" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/>',
  'link-outline':
    '<path d="M208 352h-64a96 96 0 010-192h64M304 160h64a96 96 0 010 192h-64M163.29 256h187.42" stroke-linecap="round" stroke-linejoin="round" stroke-width="36" fill="none"/>',
  'list-outline':
    '<path stroke-linecap="round" stroke-linejoin="round" d="M160 144h288M160 256h288M160 368h288" fill="none" stroke="currentColor" stroke-width="32"/><circle cx="80" cy="144" r="16" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><circle cx="80" cy="256" r="16" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><circle cx="80" cy="368" r="16" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/>',
  'locate-outline':
    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="M256 96V56M256 456v-40" fill="none"/><path d="M256 112a144 144 0 10144 144 144 144 0 00-144-144z" stroke-miterlimit="10" fill="none" stroke="currentColor" stroke-width="32"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="M416 256h40M56 256h40" fill="none"/>',
  'location-outline':
    '<path d="M256 48c-79.5 0-144 61.39-144 137 0 87 96 224.87 131.25 272.49a15.77 15.77 0 0025.5 0C304 409.89 400 272.07 400 185c0-75.61-64.5-137-144-137z" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><circle cx="256" cy="192" r="48" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/>',
  'lock-closed-outline':
    '<path d="M336 208v-95a80 80 0 00-160 0v95" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><rect x="96" y="208" width="320" height="272" rx="48" ry="48" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/>',
  'log-out-outline':
    '<path d="M304 336v40a40 40 0 01-40 40H104a40 40 0 01-40-40V136a40 40 0 0140-40h152c22.09 0 48 17.91 48 40v40M368 336l80-80-80-80M176 256h256" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/>',
  'mail-outline':
    '<rect x="48" y="96" width="416" height="320" rx="40" ry="40" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><path stroke-linecap="round" stroke-linejoin="round" d="M112 160l144 112 144-112" fill="none" stroke="currentColor" stroke-width="32"/>',
  'map-outline':
    '<path d="M313.27 124.64L198.73 51.36a32 32 0 00-29.28.35L56.51 127.49A16 16 0 0048 141.63v295.8a16 16 0 0023.49 14.14l97.82-63.79a32 32 0 0129.5-.24l111.86 73a32 32 0 0029.27-.11l115.43-75.94a16 16 0 008.63-14.2V74.57a16 16 0 00-23.49-14.14l-98 63.86a32 32 0 01-29.24.35zM328 128v336M184 48v336" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/>',
  'medal-outline':
    '<circle cx="256" cy="352" r="112" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><circle cx="256" cy="352" r="48" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><path d="M147 323L41.84 159.32a32 32 0 01-1.7-31.61l31-62A32 32 0 0199.78 48h312.44a32 32 0 0128.62 17.69l31 62a32 32 0 01-1.7 31.61L365 323M371 144H37M428.74 52.6L305 250M140.55 144L207 250" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/>',
  'medkit-outline':
    '<rect x="32" y="112" width="448" height="352" rx="48" ry="48" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><path d="M144 112V80a32 32 0 0132-32h160a32 32 0 0132 32v32M256 208v160M336 288H176" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/>',
  'megaphone-outline':
    '<path d="M407.94 52.22S321.3 160 240 160H80a16 16 0 00-16 16v96a16 16 0 0016 16h160c81.3 0 167.94 108.23 167.94 108.23 6.06 8 24.06 2.52 24.06-9.83V62c0-12.31-17-18.82-24.06-9.78zM64 256s-16-6-16-32 16-32 16-32M448 246s16-4.33 16-22-16-22-16-22M256 160v128M112 160v128" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><path d="M144 288v168a8 8 0 008 8h53a16 16 0 0015.29-20.73C211.91 416.39 192 386.08 192 336h16a16 16 0 0016-16v-16a16 16 0 00-16-16h-16" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/>',
  'menu-outline':
    '<path stroke-linecap="round" stroke-miterlimit="10" d="M80 160h352M80 256h352M80 352h352" fill="none" stroke="currentColor" stroke-width="32"/>',
  'moon-outline':
    '<path d="M160 136c0-30.62 4.51-61.61 16-88C99.57 81.27 48 159.32 48 248c0 119.29 96.71 216 216 216 88.68 0 166.73-51.57 200-128-26.39 11.49-57.38 16-88 16-119.29 0-216-96.71-216-216z" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/>',
  'musical-notes-outline':
    '<path d="M192 218v-6c0-14.84 10-27 24.24-30.59l174.59-46.68A20 20 0 01416 154v22" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><path d="M416 295.94v80c0 13.91-8.93 25.59-22 30l-22 8c-25.9 8.72-52-10.42-52-38h0a33.37 33.37 0 0123-32l51-18.15c13.07-4.4 22-15.94 22-29.85V58a10 10 0 00-12.6-9.61L204 102a16.48 16.48 0 00-12 16v226c0 13.91-8.93 25.6-22 30l-52 18c-13.88 4.68-22 17.22-22 32h0c0 27.58 26.52 46.55 52 38l22-8c13.07-4.4 22-16.08 22-30v-80" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/>',
  'navigate-outline':
    '<path d="M448 64L64 240.14h200a8 8 0 018 8V448z" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/>',
  'notifications-outline':
    '<path d="M427.68 351.43C402 320 383.87 304 383.87 217.35 383.87 138 343.35 109.73 310 96c-4.43-1.82-8.6-6-9.95-10.55C294.2 65.54 277.8 48 256 48s-38.21 17.55-44 37.47c-1.35 4.6-5.52 8.71-9.95 10.53-33.39 13.75-73.87 41.92-73.87 121.35C128.13 304 110 320 84.32 351.43 73.68 364.45 83 384 101.61 384h308.88c18.51 0 27.77-19.61 17.19-32.57zM320 384v16a64 64 0 01-128 0v-16" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/>',
  'nutrition-outline':
    '<path d="M352 128c-32.26-2.89-64 16-96 16s-63.75-19-96-16c-64 6-96 64-96 160 0 80 64 192 111.2 192s51.94-24 80.8-24 33.59 24 80.8 24S448 368 448 288c0-96-29-154-96-160z" stroke-miterlimit="10" fill="none" stroke="currentColor" stroke-width="32"/><path d="M323.92 83.14c-21 21-45.66 27-58.82 28.79a8 8 0 01-9.1-8.73 97.6 97.6 0 0128.61-59.33c22-22 46-26.9 58.72-27.85a8 8 0 018.67 8.92 98 98 0 01-28.08 58.2z"/><ellipse cx="216" cy="304" rx="24" ry="48"/><ellipse cx="296" cy="304" rx="24" ry="48"/>',
  'options-outline':
    '<path stroke-linecap="round" stroke-linejoin="round" d="M368 128h80M64 128h240M368 384h80M64 384h240M208 256h240M64 256h80" fill="none" stroke="currentColor" stroke-width="32"/><circle cx="336" cy="128" r="32" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><circle cx="176" cy="256" r="32" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><circle cx="336" cy="384" r="32" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/>',
  'paw-outline':
    '<path d="M457.74 170.1a30.26 30.26 0 00-11.16-2.1h-.4c-20.17.3-42.79 19.19-54.66 47.76-14.23 34.18-7.68 69.15 14.74 78.14a30.21 30.21 0 0011.15 2.1c20.27 0 43.2-19 55.17-47.76 14.13-34.18 7.48-69.15-14.84-78.14zM327.6 303.48C299.8 257.35 287.8 240 256 240s-43.9 17.46-71.7 63.48c-23.8 39.36-71.9 42.64-83.9 76.07a50.91 50.91 0 00-3.6 19.25c0 27.19 20.8 49.2 46.4 49.2 31.8 0 75.1-25.39 112.9-25.39S337 448 368.8 448c25.6 0 46.3-22 46.3-49.2a51 51 0 00-3.7-19.25c-12-33.55-60-36.71-83.8-76.07zM192.51 196a26.53 26.53 0 004-.3c23.21-3.37 37.7-35.53 32.44-71.85C224 89.61 203.22 64 181.49 64a26.53 26.53 0 00-4 .3c-23.21 3.37-37.7 35.53-32.44 71.85C150 170.29 170.78 196 192.51 196zM366.92 136.15c5.26-36.32-9.23-68.48-32.44-71.85a26.53 26.53 0 00-4-.3c-21.73 0-42.47 25.61-47.43 59.85-5.26 36.32 9.23 68.48 32.44 71.85a26.53 26.53 0 004 .3c21.73 0 42.51-25.71 47.43-59.85zM105.77 293.9c22.39-9 28.93-44 14.72-78.14C108.53 187 85.62 168 65.38 168a30.21 30.21 0 00-11.15 2.1c-22.39 9-28.93 44-14.72 78.14C51.47 277 74.38 296 94.62 296a30.21 30.21 0 0011.15-2.1z" stroke-miterlimit="10" fill="none" stroke="currentColor" stroke-width="32"/>',
  'people-outline':
    '<path d="M402 168c-2.93 40.67-33.1 72-66 72s-63.12-31.32-66-72c-3-42.31 26.37-72 66-72s69 30.46 66 72z" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><path d="M336 304c-65.17 0-127.84 32.37-143.54 95.41-2.08 8.34 3.15 16.59 11.72 16.59h263.65c8.57 0 13.77-8.25 11.72-16.59C463.85 335.36 401.18 304 336 304z" stroke-miterlimit="10" fill="none" stroke="currentColor" stroke-width="32"/><path d="M200 185.94c-2.34 32.48-26.72 58.06-53 58.06s-50.7-25.57-53-58.06C91.61 152.15 115.34 128 147 128s55.39 24.77 53 57.94z" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><path d="M206 306c-18.05-8.27-37.93-11.45-59-11.45-52 0-102.1 25.85-114.65 76.2-1.65 6.66 2.53 13.25 9.37 13.25H154" stroke-linecap="round" stroke-miterlimit="10" fill="none" stroke="currentColor" stroke-width="32"/>',
  'person-circle-outline':
    '<path d="M258.9 48C141.92 46.42 46.42 141.92 48 258.9c1.56 112.19 92.91 203.54 205.1 205.1 117 1.6 212.48-93.9 210.88-210.88C462.44 140.91 371.09 49.56 258.9 48zm126.42 327.25a4 4 0 01-6.14-.32 124.27 124.27 0 00-32.35-29.59C321.37 329 289.11 320 256 320s-65.37 9-90.83 25.34a124.24 124.24 0 00-32.35 29.58 4 4 0 01-6.14.32A175.32 175.32 0 0180 259c-1.63-97.31 78.22-178.76 175.57-179S432 158.81 432 256a175.32 175.32 0 01-46.68 119.25z"/><path d="M256 144c-19.72 0-37.55 7.39-50.22 20.82s-19 32-17.57 51.93C191.11 256 221.52 288 256 288s64.83-32 67.79-71.24c1.48-19.74-4.8-38.14-17.68-51.82C293.39 151.44 275.59 144 256 144z"/>',
  'person-outline':
    '<path d="M344 144c-3.92 52.87-44 96-88 96s-84.15-43.12-88-96c-4-55 35-96 88-96s92 42 88 96z" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><path d="M256 304c-87 0-175.3 48-191.64 138.6C62.39 453.52 68.57 464 80 464h352c11.44 0 17.62-10.48 15.65-21.4C431.3 352 343 304 256 304z" stroke-miterlimit="10" fill="none" stroke="currentColor" stroke-width="32"/>',
  'phone-portrait-outline':
    '<rect x="128" y="16" width="256" height="480" rx="48" ry="48" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><path d="M176 16h24a8 8 0 018 8h0a16 16 0 0016 16h64a16 16 0 0016-16h0a8 8 0 018-8h24" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/>',
  'pie-chart-outline':
    '<path d="M256.05 80.65Q263.94 80 272 80c106 0 192 86 192 192s-86 192-192 192A192.09 192.09 0 0189.12 330.65" stroke-linecap="round" stroke-miterlimit="10" fill="none" stroke="currentColor" stroke-width="32"/><path d="M256 48C141.12 48 48 141.12 48 256a207.29 207.29 0 0018.09 85L256 256z" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/>',
  'pizza-outline':
    '<path d="M404.76 123.08C358.37 104.18 309.69 96 256 96s-106.1 9-148.9 26.68c-8.08 3.3-15.26 9-10.07 19.5C101.24 150.71 203 375 241.66 455a15.94 15.94 0 0028.72 0l144.05-312.22c3.19-6.9.9-15.4-9.67-19.7z" stroke-miterlimit="10" fill="none" stroke="currentColor" stroke-width="32"/><path d="M436.38 82.68C384.31 62.08 320.17 48 256 48S128.65 60.78 75.48 82.08C70.79 84 62 88.43 64.41 95.88L74.09 120c4 8.2 8.67 8.2 15.06 8.2 1.79 0 4.29-1 7.28-2.18A442.46 442.46 0 01256 96c56.76 0 114.91 12 159.6 30 3.59 1.4 5.59 2.18 7.28 2.18 6.58 0 10.38 2.19 15-8.1L447.65 96c2.01-6-4.99-10.82-11.27-13.32z" stroke-miterlimit="10" fill="none" stroke="currentColor" stroke-width="32"/><circle cx="192" cy="192" r="32"/><circle cx="320" cy="208" r="32"/><circle cx="256" cy="320" r="32"/>',
  'pricetag-outline':
    '<path d="M435.25 48h-122.9a14.46 14.46 0 00-10.2 4.2L56.45 297.9a28.85 28.85 0 000 40.7l117 117a28.85 28.85 0 0040.7 0L459.75 210a14.46 14.46 0 004.2-10.2v-123a28.66 28.66 0 00-28.7-28.8z" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><path d="M384 160a32 32 0 1132-32 32 32 0 01-32 32z"/>',
  'pricetags-outline':
    '<path d="M403.29 32H280.36a14.46 14.46 0 00-10.2 4.2L24.4 281.9a28.85 28.85 0 000 40.7l117 117a28.86 28.86 0 0040.71 0L427.8 194a14.46 14.46 0 004.2-10.2v-123A28.66 28.66 0 00403.29 32z" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><path d="M352 144a32 32 0 1132-32 32 32 0 01-32 32z"/><path d="M230 480l262-262a13.81 13.81 0 004-10V80" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/>',
  'pulse-outline':
    '<path stroke-linecap="round" stroke-linejoin="round" d="M48 320h64l64-256 64 384 64-224 32 96h64" fill="none" stroke="currentColor" stroke-width="32"/><circle cx="432" cy="320" r="32" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/>',
  'receipt-outline':
    '<path stroke-linejoin="round" d="M160 336V48l32 16 32-16 31.94 16 32.37-16L320 64l31.79-16 31.93 16L416 48l32.01 16L480 48v224" fill="none" stroke="currentColor" stroke-width="32"/><path d="M480 272v112a80 80 0 01-80 80h0a80 80 0 01-80-80v-48H48a15.86 15.86 0 00-16 16c0 64 6.74 112 80 112h288" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><path stroke-linecap="round" stroke-linejoin="round" d="M224 144h192M288 224h128" fill="none" stroke="currentColor" stroke-width="32"/>',
  'refresh-outline':
    '<path d="M320 146s24.36-12-64-12a160 160 0 10160 160" stroke-linecap="round" stroke-miterlimit="10" fill="none" stroke="currentColor" stroke-width="32"/><path stroke-linecap="round" stroke-linejoin="round" d="M256 58l80 80-80 80" fill="none" stroke="currentColor" stroke-width="32"/>',
  'repeat-outline':
    '<path stroke-linecap="round" stroke-linejoin="round" d="M320 120l48 48-48 48" fill="none" stroke="currentColor" stroke-width="32"/><path d="M352 168H144a80.24 80.24 0 00-80 80v16M192 392l-48-48 48-48" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><path d="M160 344h208a80.24 80.24 0 0080-80v-16" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/>',
  'restaurant-outline':
    '<path d="M57.49 47.74l368.43 368.43a37.28 37.28 0 010 52.72h0a37.29 37.29 0 01-52.72 0l-90-91.55a32 32 0 01-9.2-22.43v-5.53a32 32 0 00-9.52-22.78l-11.62-10.73a32 32 0 00-29.8-7.44h0a48.53 48.53 0 01-46.56-12.63l-85.43-85.44C40.39 159.68 21.74 83.15 57.49 47.74z" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><path d="M400 32l-77.25 77.25A64 64 0 00304 154.51v14.86a16 16 0 01-4.69 11.32L288 192M320 224l11.31-11.31a16 16 0 0111.32-4.69h14.86a64 64 0 0045.26-18.75L480 112M440 72l-80 80M200 368l-99.72 100.28a40 40 0 01-56.56 0h0a40 40 0 010-56.56L128 328" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/>',
  'ribbon-outline':
    '<circle cx="256" cy="160" r="128" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><path d="M143.65 227.82L48 400l86.86-.42a16 16 0 0113.82 7.8L192 480l88.33-194.32" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><path d="M366.54 224L464 400l-86.86-.42a16 16 0 00-13.82 7.8L320 480l-64-140.8" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><circle cx="256" cy="160" r="64" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/>',
  'rocket-outline':
    '<path d="M461.81 53.81a4.4 4.4 0 00-3.3-3.39c-54.38-13.3-180 34.09-248.13 102.17a294.9 294.9 0 00-33.09 39.08c-21-1.9-42-.3-59.88 7.5-50.49 22.2-65.18 80.18-69.28 105.07a9 9 0 009.8 10.4l81.07-8.9a180.29 180.29 0 001.1 18.3 18.15 18.15 0 005.3 11.09l31.39 31.39a18.15 18.15 0 0011.1 5.3 179.91 179.91 0 0018.19 1.1l-8.89 81a9 9 0 0010.39 9.79c24.9-4 83-18.69 105.07-69.17 7.8-17.9 9.4-38.79 7.6-59.69a293.91 293.91 0 0039.19-33.09c68.38-68 115.47-190.86 102.37-247.95zM298.66 213.67a42.7 42.7 0 1160.38 0 42.65 42.65 0 01-60.38 0z" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><path d="M109.64 352a45.06 45.06 0 00-26.35 12.84C65.67 382.52 64 448 64 448s65.52-1.67 83.15-19.31A44.73 44.73 0 00160 402.32" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/>',
  'school-outline':
    '<path stroke-linecap="round" stroke-linejoin="round" d="M32 192L256 64l224 128-224 128L32 192z" fill="none" stroke="currentColor" stroke-width="32"/><path stroke-linecap="round" stroke-linejoin="round" d="M112 240v128l144 80 144-80V240M480 368V192M256 320v128" fill="none" stroke="currentColor" stroke-width="32"/>',
  'search-outline':
    '<path d="M221.09 64a157.09 157.09 0 10157.09 157.09A157.1 157.1 0 00221.09 64z" stroke-miterlimit="10" fill="none" stroke="currentColor" stroke-width="32"/><path stroke-linecap="round" stroke-miterlimit="10" d="M338.29 338.29L448 448" fill="none" stroke="currentColor" stroke-width="32"/>',
  'settings-outline':
    '<path d="M262.29 192.31a64 64 0 1057.4 57.4 64.13 64.13 0 00-57.4-57.4zM416.39 256a154.34 154.34 0 01-1.53 20.79l45.21 35.46a10.81 10.81 0 012.45 13.75l-42.77 74a10.81 10.81 0 01-13.14 4.59l-44.9-18.08a16.11 16.11 0 00-15.17 1.75A164.48 164.48 0 01325 400.8a15.94 15.94 0 00-8.82 12.14l-6.73 47.89a11.08 11.08 0 01-10.68 9.17h-85.54a11.11 11.11 0 01-10.69-8.87l-6.72-47.82a16.07 16.07 0 00-9-12.22 155.3 155.3 0 01-21.46-12.57 16 16 0 00-15.11-1.71l-44.89 18.07a10.81 10.81 0 01-13.14-4.58l-42.77-74a10.8 10.8 0 012.45-13.75l38.21-30a16.05 16.05 0 006-14.08c-.36-4.17-.58-8.33-.58-12.5s.21-8.27.58-12.35a16 16 0 00-6.07-13.94l-38.19-30A10.81 10.81 0 0149.48 186l42.77-74a10.81 10.81 0 0113.14-4.59l44.9 18.08a16.11 16.11 0 0015.17-1.75A164.48 164.48 0 01187 111.2a15.94 15.94 0 008.82-12.14l6.73-47.89A11.08 11.08 0 01213.23 42h85.54a11.11 11.11 0 0110.69 8.87l6.72 47.82a16.07 16.07 0 009 12.22 155.3 155.3 0 0121.46 12.57 16 16 0 0015.11 1.71l44.89-18.07a10.81 10.81 0 0113.14 4.58l42.77 74a10.8 10.8 0 01-2.45 13.75l-38.21 30a16.05 16.05 0 00-6.05 14.08c.33 4.14.55 8.3.55 12.47z" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/>',
  'share-social-outline':
    '<circle cx="128" cy="256" r="48" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><circle cx="384" cy="112" r="48" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><circle cx="384" cy="400" r="48" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><path stroke-linecap="round" stroke-linejoin="round" d="M169.83 279.53l172.34 96.94M342.17 135.53l-172.34 96.94" fill="none" stroke="currentColor" stroke-width="32"/>',
  'shield-checkmark-outline':
    '<path stroke-linecap="round" stroke-linejoin="round" d="M336 176L225.2 304 176 255.8" fill="none" stroke="currentColor" stroke-width="32"/><path d="M463.1 112.37C373.68 96.33 336.71 84.45 256 48c-80.71 36.45-117.68 48.33-207.1 64.37C32.7 369.13 240.58 457.79 256 464c15.42-6.21 223.3-94.87 207.1-351.63z" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/>',
  'shirt-outline':
    '<path d="M314.56 48s-22.78 8-58.56 8-58.56-8-58.56-8a31.94 31.94 0 00-10.57 1.8L32 104l16.63 88 48.88 5.52a24 24 0 0121.29 24.58L112 464h288l-6.8-241.9a24 24 0 0121.29-24.58l48.88-5.52L480 104 325.13 49.8a31.94 31.94 0 00-10.57-1.8zM333.31 52.66a80 80 0 01-154.62 0" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/>',
  'sparkles':
    '<path d="M208 512a24.84 24.84 0 01-23.34-16l-39.84-103.6a16.06 16.06 0 00-9.19-9.19L32 343.34a25 25 0 010-46.68l103.6-39.84a16.06 16.06 0 009.19-9.19L184.66 144a25 25 0 0146.68 0l39.84 103.6a16.06 16.06 0 009.19 9.19l103 39.63a25.49 25.49 0 0116.63 24.1 24.82 24.82 0 01-16 22.82l-103.6 39.84a16.06 16.06 0 00-9.19 9.19L231.34 496A24.84 24.84 0 01208 512zm66.85-254.84zM88 176a14.67 14.67 0 01-13.69-9.4l-16.86-43.84a7.28 7.28 0 00-4.21-4.21L9.4 101.69a14.67 14.67 0 010-27.38l43.84-16.86a7.31 7.31 0 004.21-4.21L74.16 9.79A15 15 0 0186.23.11a14.67 14.67 0 0115.46 9.29l16.86 43.84a7.31 7.31 0 004.21 4.21l43.84 16.86a14.67 14.67 0 010 27.38l-43.84 16.86a7.28 7.28 0 00-4.21 4.21l-16.86 43.84A14.67 14.67 0 0188 176zM400 256a16 16 0 01-14.93-10.26l-22.84-59.37a8 8 0 00-4.6-4.6l-59.37-22.84a16 16 0 010-29.86l59.37-22.84a8 8 0 004.6-4.6l22.67-58.95a16.45 16.45 0 0113.17-10.57 16 16 0 0116.86 10.15l22.84 59.37a8 8 0 004.6 4.6l59.37 22.84a16 16 0 010 29.86l-59.37 22.84a8 8 0 00-4.6 4.6l-22.84 59.37A16 16 0 01400 256z"/>',
  'sparkles-outline':
    '<path d="M259.92 262.91L216.4 149.77a9 9 0 00-16.8 0l-43.52 113.14a9 9 0 01-5.17 5.17L37.77 311.6a9 9 0 000 16.8l113.14 43.52a9 9 0 015.17 5.17l43.52 113.14a9 9 0 0016.8 0l43.52-113.14a9 9 0 015.17-5.17l113.14-43.52a9 9 0 000-16.8l-113.14-43.52a9 9 0 01-5.17-5.17zM108 68L88 16 68 68 16 88l52 20 20 52 20-52 52-20-52-20zM426.67 117.33L400 48l-26.67 69.33L304 144l69.33 26.67L400 240l26.67-69.33L496 144l-69.33-26.67z" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/>',
  'star':
    '<path d="M394 480a16 16 0 01-9.39-3L256 383.76 127.39 477a16 16 0 01-24.55-18.08L153 310.35 23 221.2a16 16 0 019-29.2h160.38l48.4-148.95a16 16 0 0130.44 0l48.4 149H480a16 16 0 019.05 29.2L359 310.35l50.13 148.53A16 16 0 01394 480z"/>',
  'star-half':
    '<path d="M480 208H308L256 48l-52 160H32l140 96-54 160 138-100 138 100-54-160z" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><path d="M256 48v316L118 464l54-160-140-96h172l52-160z"/>',
  'star-outline':
    '<path d="M480 208H308L256 48l-52 160H32l140 96-54 160 138-100 138 100-54-160z" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/>',
  'stats-chart-outline':
    '<rect x="64" y="320" width="48" height="160" rx="8" ry="8" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><rect x="288" y="224" width="48" height="256" rx="8" ry="8" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><rect x="400" y="112" width="48" height="368" rx="8" ry="8" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><rect x="176" y="32" width="48" height="448" rx="8" ry="8" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/>',
  'storefront':
    '<path d="M480 448h-12a4 4 0 01-4-4V273.51a4 4 0 00-5.24-3.86 104.92 104.92 0 01-28.32 4.78c-1.18 0-2.3.05-3.4.05a108.22 108.22 0 01-52.85-13.64 8.23 8.23 0 00-8 0 108.18 108.18 0 01-52.84 13.64 106.11 106.11 0 01-52.46-13.79 8.21 8.21 0 00-8.09 0 108.14 108.14 0 01-53.16 13.8 106.19 106.19 0 01-52.77-14 8.25 8.25 0 00-8.16 0 106.19 106.19 0 01-52.77 14c-1.09 0-2.19 0-3.37-.05h-.06a104.91 104.91 0 01-29.28-5.09 4 4 0 00-5.23 3.8V444a4 4 0 01-4 4H32.5c-8.64 0-16.1 6.64-16.48 15.28A16 16 0 0032 480h447.5c8.64 0 16.1-6.64 16.48-15.28A16 16 0 00480 448zm-256-68a4 4 0 01-4 4h-88a4 4 0 01-4-4v-64a12 12 0 0112-12h72a12 12 0 0112 12zm156 68h-72a4 4 0 01-4-4V316a12 12 0 0112-12h56a12 12 0 0112 12v128a4 4 0 01-4 4zM492.57 170.28l-42.92-98.49C438.41 47.62 412.74 32 384.25 32H127.7c-28.49 0-54.16 15.62-65.4 39.79l-42.92 98.49c-9 19.41 2.89 39.34 2.9 39.35l.28.45c.49.78 1.36 2 1.89 2.78.05.06.09.13.14.2l5 6.05a7.45 7.45 0 00.6.65l5 4.83.42.36a69.65 69.65 0 009.39 6.78v.05a74 74 0 0036 10.67h2.47a76.08 76.08 0 0051.89-20.31l.33-.31a7.94 7.94 0 0110.89 0l.33.31a77.3 77.3 0 00104.46 0 8 8 0 0110.87 0 77.31 77.31 0 00104.21.23 7.88 7.88 0 0110.71 0 76.81 76.81 0 0052.31 20.08h2.49a71.35 71.35 0 0035-10.7c.95-.57 1.86-1.17 2.78-1.77A71.33 71.33 0 00488 212.17l1.74-2.63q.26-.4.48-.84c1.66-3.38 10.56-20.76 2.35-38.42z"/>',
  'storefront-outline':
    '<path stroke-linecap="round" stroke-linejoin="round" d="M448 448V240M64 240v208M382.47 48H129.53c-21.79 0-41.47 12-49.93 30.46L36.3 173c-14.58 31.81 9.63 67.85 47.19 69h2c31.4 0 56.85-25.18 56.85-52.23 0 27 25.46 52.23 56.86 52.23s56.8-23.38 56.8-52.23c0 27 25.45 52.23 56.85 52.23s56.86-23.38 56.86-52.23c0 28.85 25.45 52.23 56.85 52.23h1.95c37.56-1.17 61.77-37.21 47.19-69l-43.3-94.54C423.94 60 404.26 48 382.47 48zM32 464h448M136 288h80a24 24 0 0124 24v88h0-128 0v-88a24 24 0 0124-24zM288 464V312a24 24 0 0124-24h64a24 24 0 0124 24v152" fill="none" stroke="currentColor" stroke-width="32"/>',
  'sunny-outline':
    '<path stroke-linecap="round" stroke-miterlimit="10" d="M256 48v48M256 416v48M403.08 108.92l-33.94 33.94M142.86 369.14l-33.94 33.94M464 256h-48M96 256H48M403.08 403.08l-33.94-33.94M142.86 142.86l-33.94-33.94" fill="none" stroke="currentColor" stroke-width="32"/><circle cx="256" cy="256" r="80" stroke-linecap="round" stroke-miterlimit="10" fill="none" stroke="currentColor" stroke-width="32"/>',
  'swap-horizontal-outline':
    '<path stroke-linecap="round" stroke-linejoin="round" d="M304 48l112 112-112 112M398.87 160H96M208 464L96 352l112-112M114 352h302" fill="none" stroke="currentColor" stroke-width="32"/>',
  'thumbs-up-outline':
    '<path d="M320 458.16S304 464 256 464s-74-16-96-32H96a64 64 0 01-64-64v-48a64 64 0 0164-64h30a32.34 32.34 0 0027.37-15.4S162 221.81 188 176.78 264 64 272 48c29 0 43 22 34 47.71-10.28 29.39-23.71 54.38-27.46 87.09-.54 4.78 3.14 12 7.95 12L416 205" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><path d="M416 271l-80-2c-20-1.84-32-12.4-32-30h0c0-17.6 14-28.84 32-30l80-4c17.6 0 32 16.4 32 34v.17A32 32 0 01416 271zM448 336l-112-2c-18-.84-32-12.41-32-30h0c0-17.61 14-28.86 32-30l112-2a32.1 32.1 0 0132 32h0a32.1 32.1 0 01-32 32zM400 464l-64-3c-21-1.84-32-11.4-32-29h0c0-17.6 14.4-30 32-30l64-2a32.09 32.09 0 0132 32h0a32.09 32.09 0 01-32 32zM432 400l-96-2c-19-.84-32-12.4-32-30h0c0-17.6 13-28.84 32-30l96-2a32.09 32.09 0 0132 32h0a32.09 32.09 0 01-32 32z" stroke-miterlimit="10" fill="none" stroke="currentColor" stroke-width="32"/>',
  'ticket-outline':
    '<path stroke-miterlimit="10" d="M366.05 146a46.7 46.7 0 01-2.42-63.42 3.87 3.87 0 00-.22-5.26l-44.13-44.18a3.89 3.89 0 00-5.5 0l-70.34 70.34a23.62 23.62 0 00-5.71 9.24h0a23.66 23.66 0 01-14.95 15h0a23.7 23.7 0 00-9.25 5.71L33.14 313.78a3.89 3.89 0 000 5.5l44.13 44.13a3.87 3.87 0 005.26.22 46.69 46.69 0 0165.84 65.84 3.87 3.87 0 00.22 5.26l44.13 44.13a3.89 3.89 0 005.5 0l180.4-180.39a23.7 23.7 0 005.71-9.25h0a23.66 23.66 0 0114.95-15h0a23.62 23.62 0 009.24-5.71l70.34-70.34a3.89 3.89 0 000-5.5l-44.13-44.13a3.87 3.87 0 00-5.26-.22 46.7 46.7 0 01-63.42-2.32z" fill="none" stroke="currentColor" stroke-width="32"/><path stroke-miterlimit="10" stroke-linecap="round" d="M250.5 140.44l-16.51-16.51M294.52 184.46l-11.01-11M338.54 228.49l-11-11.01M388.07 278.01l-16.51-16.51" fill="none" stroke="currentColor" stroke-width="32"/>',
  'time-outline':
    '<path d="M256 64C150 64 64 150 64 256s86 192 192 192 192-86 192-192S362 64 256 64z" stroke-miterlimit="10" fill="none" stroke="currentColor" stroke-width="32"/><path stroke-linecap="round" stroke-linejoin="round" d="M256 128v144h96" fill="none" stroke="currentColor" stroke-width="32"/>',
  'today-outline':
    '<rect stroke-linejoin="round" x="48" y="80" width="416" height="384" rx="48" fill="none" stroke="currentColor" stroke-width="32"/><path stroke-linejoin="round" stroke-linecap="round" d="M128 48v32M384 48v32" fill="none" stroke="currentColor" stroke-width="32"/><rect stroke-linejoin="round" stroke-linecap="round" x="112" y="224" width="96" height="96" rx="13" fill="none" stroke="currentColor" stroke-width="32"/><path stroke-linejoin="round" stroke-linecap="round" d="M464 160H48" fill="none" stroke="currentColor" stroke-width="32"/>',
  'trending-up-outline':
    '<path stroke-linecap="round" stroke-linejoin="round" d="M352 144h112v112" fill="none" stroke="currentColor" stroke-width="32"/><path d="M48 368l121.37-121.37a32 32 0 0145.26 0l50.74 50.74a32 32 0 0045.26 0L448 160" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/>',
  'trophy-outline':
    '<path stroke-linecap="round" stroke-linejoin="round" d="M176 464h160M256 464V336M384 224c0-50.64-.08-134.63-.12-160a16 16 0 00-16-16l-223.79.26a16 16 0 00-16 15.95c0 30.58-.13 129.17-.13 159.79 0 64.28 83 112 128 112S384 288.28 384 224z" fill="none" stroke="currentColor" stroke-width="32"/><path d="M128 96H48v16c0 55.22 33.55 112 80 112M384 96h80v16c0 55.22-33.55 112-80 112" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/>',
  'walk-outline':
    '<path d="M314.21 482.32l-56.77-114.74-44.89-57.39a72.82 72.82 0 01-10.13-37.05V144h15.67a40.22 40.22 0 0140.23 40.22v183.36M127.9 293.05v-74.52S165.16 144 202.42 144M370.1 274.42L304 231M170.53 478.36L224 400" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><circle cx="258.32" cy="69.48" r="37.26" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/>',
  'wallet-outline':
    '<rect x="48" y="144" width="416" height="288" rx="48" ry="48" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><path d="M411.36 144v-30A50 50 0 00352 64.9L88.64 109.85A50 50 0 0048 159v49" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><path d="M368 320a32 32 0 1132-32 32 32 0 01-32 32z"/>',
  'warning-outline':
    '<path d="M85.57 446.25h340.86a32 32 0 0028.17-47.17L284.18 82.58c-12.09-22.44-44.27-22.44-56.36 0L57.4 399.08a32 32 0 0028.17 47.17z" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><path d="M250.26 195.39l5.74 122 5.73-121.95a5.74 5.74 0 00-5.79-6h0a5.74 5.74 0 00-5.68 5.95z" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor" stroke-width="32"/><path d="M256 397.25a20 20 0 1120-20 20 20 0 01-20 20z"/>',
};

/**
 * Emoji -> icon, for values that arrive from the API rather than the templates.
 *
 * A few analytics payloads carry their own glyph (`alert.icon`, an advice
 * item's `icon`) chosen server-side. Rewriting those endpoints would change a
 * contract the mobile app also reads, so the translation happens here instead:
 * the server keeps sending what it always sent, and the web UI still draws from
 * one icon set. Anything unrecognised falls back to a neutral marker rather
 * than leaking a raw string into the page.
 */
const EMOJI_TO_ICON: Record<string, IconName> = {
  '⚠': 'warning-outline',
  '⚠️': 'warning-outline',
  '🔥': 'flame-outline',
  '📍': 'location-outline',
  '💡': 'bulb-outline',
  '📈': 'trending-up-outline',
  '📉': 'bar-chart-outline',
  '📊': 'bar-chart-outline',
  '🏆': 'trophy-outline',
  '⏰': 'time-outline',
  '🕒': 'time-outline',
  '✓': 'checkmark-circle-outline',
  '✅': 'checkmark-circle-outline',
  '🎯': 'locate-outline',
  '💰': 'cash-outline',
  '🏷': 'pricetags-outline',
  '🏷️': 'pricetags-outline',
  '🏬': 'storefront-outline',
  '👥': 'people-outline',
  '📦': 'cube-outline',
  '✨': 'sparkles-outline',
};

/** Resolves a server-sent glyph, or a name already in the set, to an icon. */
export function toIconName(value: string | null | undefined, fallback: IconName = 'ellipse-outline'): IconName {
  if (!value) return fallback;
  if (value in ICON_PATHS) return value as IconName;
  const stripped = value.replace(/️/g, '');
  return EMOJI_TO_ICON[value] ?? EMOJI_TO_ICON[stripped] ?? fallback;
}
