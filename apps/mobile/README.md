# SL Events mobile app

React Native with Expo (SDK 58), TypeScript, Expo Router. Builds go through Expo EAS.

It is the customer app (browse events, book, pay by bank transfer, upload proof, QR tickets, alerts, profile, help) plus a door-staff ticket scanner. The admin portal stays on the web.

## Run it

```bash
cd apps/mobile
npm install
npx expo start          # scan the QR code with Expo Go, or press a (Android) / i (iOS simulator)
npx expo start --web    # quick browser preview (layout only; camera and share behave differently)
npm run typecheck
```

Demo sign-in: any valid email and password works. `kasun@example.com` has sample bookings (paid, unpaid, under review, failed, expired, attended).

## How it shares code with the website

The booking rules, mock data and stores are **not copied**. They live in `apps/web/src/lib` and the app imports them as `@core/*` (see `metro.config.js` and `tsconfig.json`). So a change to the payment rules, ticket rules or sample data reaches the website and the app together. The pieces:

- `@core/bookings`: statuses, `canIssueTickets`, `customerCan`. A customer can never mark a booking paid or a ticket valid; only staff actions do.
- `@core/bookingStore`, `@core/session`, `@core/notifications`: the live stores.
- `apps/web/src/lib/persistedStore.ts` takes a `storage` adapter. The website uses `localStorage`; this app installs AsyncStorage in `src/lib/storage.ts` before the first screen renders.

UI code is separate (`app/` screens, `src/ui/` components) because React Native cannot reuse the website's HTML and Tailwind components. Colours and fonts match the website (`src/theme.ts`).

`src/lib/rules.ts` repeats two numbers from the website's ticket selector (`MAX_TICKETS`, `BOOKING_FEE`). Keep them in step, or move them into the shared lib.

## Build with EAS

Needs an Expo account. Nothing below has been run for you.

```bash
npm install -g eas-cli
eas login
eas init                                   # creates the project and writes its id into app.json
eas build --platform android --profile preview      # installable APK for testers
eas build --platform ios --profile development      # iOS simulator build
eas build --platform all --profile production       # store builds
eas submit --platform ios                  # then android, after the store accounts exist
```

Before the first store build, decide and set in `app.json`:

- `ios.bundleIdentifier` and `android.package`: currently the placeholder `kr.slevents.app`. They cannot change after publishing.
- The app icon and splash image (`assets/`): currently Expo's defaults.
- An Apple Developer account (iOS) and a Google Play Console account (Android).

Build profiles are in `eas.json`: `development` (dev client, internal), `preview` (internal APK), `production` (store, auto-incrementing version).

## Still mock

- No real sign-in. Any valid email and password works. Use Supabase auth next; keep the session token in `expo-secure-store`, not AsyncStorage.
- Bookings, payments, notifications and support requests are saved on the phone only. Staff confirmation of a payment happens on the website (organizer Verify Payments and admin Payments) and does not reach this app until there is a shared backend.
- The scanner checks codes against sample data on the phone. The real check must happen on the server, which marks a ticket used in the same step that answers "admit", for signed-in organizer or door-staff accounts only.
- No push notifications yet (`expo-notifications` once the backend can send them).
- Events have no photos; covers are category gradients.
