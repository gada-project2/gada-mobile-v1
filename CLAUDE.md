# gada — mobile app (React Native / Expo)

The native mobile client for **gada**, a mobile-first event ("gadaring") platform for Nigeria.
It gives users the same capabilities as the web app — discover, attend, pay, host, volunteer,
circles, chat, profile — but as a first-class native experience. It is a **client of the existing
gada v1 API**; it owns no business logic of its own.

The web app is the SPEC and the design reference, NOT the codebase. Reuse its API contract, types,
design tokens and product decisions; rebuild every screen natively (no DOM, no cookies, no URLs).

API base (public, safe to ship — it is not a secret): `EXPO_PUBLIC_GADA_API_BASE` = `https://api.dev.gadaapp.com/v1`

## Stack (do not change without asking)
- Expo (current SDK) with **development builds** (not Expo Go — we use native modules: camera, maps)
- Expo Router (file-based navigation)
- TypeScript (strict)
- NativeWind v4 (Tailwind syntax in RN — lets us reuse the web design tokens almost directly)
- Reanimated 3 + react-native-gesture-handler (all gesture/motion on the UI thread)
- @shopify/flash-list for all long lists (never FlatList for feeds)
- @gorhom/bottom-sheet for sheets; expo-haptics for tactile feedback
- TanStack Query for server state (this carries over from web); react-hook-form + zod for forms
- expo-secure-store (auth tokens), expo-camera (QR check-in), expo-location, react-native-maps,
  expo-image (performant images)

## Auth & session (security-critical — this DIFFERS from web)
- The API issues JWT access (15 min) + refresh (30 day, rotating) tokens.
- There is NO backend-for-frontend on mobile; the app calls the API directly with a Bearer token.
- Store the **refresh token in expo-secure-store** (iOS Keychain / Android Keystore). Keep the
  **access token in memory** only (a module-level var / context), NOT in AsyncStorage or secure-store
  long-term. NEVER use AsyncStorage for any token.
- The API client attaches the in-memory access token; on a 401 it uses the secure-store refresh token
  to rotate (store the new refresh token, hold the new access token in memory) and retries once.
- On cold start: read refresh token from secure-store -> refresh -> hydrate session. On logout: revoke
  via /auth/logout, clear secure-store, clear memory.

## Capability model (same as web)
- No role choice at signup; every account can attend and (after just-in-time verification) host.
- Gate "create event" on `canConvene`. On 403 `CONVENER_VERIFICATION_REQUIRED`, open the verification
  step (NIN + DOB), then retry. Read `capabilities` from the profile; fall back to legacy `role`.

## Design tokens (port exactly from web — express in the NativeWind theme)
- ink `#14181C` (text + wordmark) · muted `#5B636B` · faint `#9AA0A6`
- page bg `#F6F7F8` · surface `#FFFFFF` · hairline `#ECEEF0` · hairline-strong `#E3E5E8`
- brand (emerald) `#0E9F6E` · brand-ink `#0F6E56` · brand-tint `#E1F5EE`
- coral (live/now) `#FF6B4A` · coral-ink `#993C1D` · coral-tint `#FAECE7`
- status: interested `#E24B4A` · invited `#EF9F27`/ink `#854F0B`/tint `#FAEEDA` · attending `#2FAE66` · volunteering `#378ADD`/ink `#185FA5`/tint `#E6F1FB`
- radii: sm 8 · md 12 · lg 16 · pill 9999 · buttons 11 · font Inter (400/500, 600 wordmark)
- Aesthetic: clean, flat, soft, generous whitespace, sentence case everywhere.

## Brand rules (hard)
- gada wordmark is always near-black (`ink`) on a light surface, every theme. Never invert/recolour it.
- Emerald = primary actions. Coral = "live / happening now / urgent" ONLY.

## Navigation
- Expo Router groups: `(auth)` (signin/signup/verify/forgot/reset), `(tabs)` (the signed-in app),
  modal/stack routes for event detail, create, manage, scanner, etc.
- Root layout guards: hydrate session on launch; unauthenticated -> `(auth)`; authenticated -> `(tabs)`.
- Bottom tabs: Home/Discover · Tickets · Messages · Profile. The convener "Host/Create" entry is a
  prominent action (e.g. centre action or header), not buried.

## Native quality bar (this is what makes it "outstanding", not a wrapped website)
- Gestures/animation run on the UI thread via Reanimated/Gesture Handler — never block JS.
- Signature interactions from the product docs, built as first-class (each its own polish task):
  the right-swipe slide-in calendar, the bottom-swipe event feed, and the spinnable sphere home menu.
- Real haptics on key actions; native bottom sheets; momentum scrolling; FlashList for feed performance.
- Respect safe areas (notches/home indicator); support iOS and Android idiomatically (don't ship
  iOS-on-Android). Honour `useReducedMotion()`; meet 44px min touch targets; support dynamic type.
- 60fps target for all gestures; no jank on the sphere menu or swipe transitions.

## Conventions
- TypeScript strict, no `any`. Mirror API request/response shapes as types (reuse the web types).
- Money from the API is in **kobo** (100 = ₦1); format for display, never send naira.
- Server state via TanStack Query; mutations optimistic where it helps. Forms: react-hook-form + zod.
- Suggested layout: `app/` (routes), `src/lib/api/` (client + types), `src/lib/auth/` (secure-store session),
  `src/components/{ui,app,mock}/`, `src/theme/` (tokens), `src/lib/realtime/` (stub until sockets).
- Accessibility: use RN a11y props (`accessibilityRole`, `accessibilityLabel`), not just visuals.

## Blocked by backend (do NOT build until the endpoint exists — flag, don't fake)
- Chat: there is GET history + polls only, NO send-message endpoint. Composer stays read-only with a
  "coming soon" note. All real-time behind `src/lib/realtime/` (no socket — auth scheme undocumented).
- Safety: ICE live-location and Find Me endpoints now EXIST (build them with explicit consent + a clear
  stop control). But SOS/panic and arrival/departure endpoints DO NOT exist yet — do not fake them.
- Admin approval is missing, so a published event stays PENDING and never reaches public Discover.
- Convener-verify endpoint / capability migration: confirm against the live spec before relying on it.
- Now available (build normally): Storage (presigned R2 upload), Vendors (profiles/gallery/products).

## Build & run
- `npx expo start` (dev) · build a dev client + run on device/simulator · EAS for store builds.
- Secrets/config in `.env` via `EXPO_PUBLIC_*` for non-secret values only; tokens live in secure-store.

## Working style
- Build phase by phase per the build plan; pause after each for review.
- Run a type check / lint before declaring a task done. Never put tokens in AsyncStorage or logs.

## Repo shape
- Standalone Expo app for now. A monorepo extraction (sharing types/API client/tokens with the web app)
  is a deliberate later step — do NOT restructure into a monorepo unless explicitly asked.
