# CreditShield Mobile — Borrower App

Native Android borrower client for CreditShield (Team 3, BoU Theme 1). Reads real
**MoKash / Wewole** loan SMS on the device, parses each loan **on-device**, and
shows a plain-language disclosure + borrowing-health, with due-date and
rising-balance notifications and an app lock. Integrates with the CreditShield
Django backend for health scoring and loan reporting.

## Why a dev build (not Expo Go)

SMS reading and biometrics need native modules, so this runs as an **Expo dev
build**, Android only. Expo Go cannot read SMS.

## Run

```bash
cd mobile
npm install
npx expo prebuild --platform android      # generates native android/ project
npx expo run:android                       # build + install on a USB device/emulator
```

Grant the **SMS** and **Notifications** permissions on first launch.

### Point it at the backend (optional, for health scoring)

1. Start the backend so the phone can reach it:
   ```bash
   cd ../backend && python manage.py runserver 0.0.0.0:8000
   ```
   Add your laptop's LAN IP to `DJANGO_ALLOWED_HOSTS` in `backend/.env`.
2. In the app: **Settings → CreditShield backend → Server address** →
   `http://<LAN-IP>:8000/api`, set **Borrower ID**, Save.

If the backend is unreachable, borrowing-health falls back to on-device scoring
(same thresholds as `backend/core/stress_indicator.py`), so the app still works.

## Demo without real SMS

**Settings → Load sample loans (demo)** runs the CreditShield reference SMS
(MoKash, Wewole, a predatory offer, a repayment) through the exact same parser
and populates the dashboard — useful for a demo when you don't want to wait for
real messages.

## Languages

English (default), Luganda, Runyankole — switch in Onboarding or Settings.
Luganda/Runyankole strings are a first-pass scaffold; review with a native
speaker before release (`src/i18n/{lg,rn}.json`).

## Architecture

```
src/
  sms/parser.ts     # on-device MoKash/Wewole loan parser (ported from SenteCheck)
  sms/reader.ts     # permission + inbox read (react-native-get-sms-android)
  domain/cost.ts    # effective/annualized rate, term, high-cost flags
  domain/health.ts  # local stress fallback (mirrors backend stress_indicator.py)
  domain/lenders.ts # licensed-lender table
  store/loans.ts    # merge two-part SMS, apply repayments, rising-total diff
  api/client.ts     # getHealth() + reportLoans() (graceful offline fallback)
  notify/scheduler  # due reminders (3d/1d) + rising-balance alert
  lock/appLock.ts   # biometric/PIN lock (cold launch + 2-min resume)
  i18n/             # en / lg / rn
  components/ screens/ App.tsx
```

The parser + interest logic is ported from the SenteCheck Android app and
verified against the real MoMo SMS formats and the CreditShield demo strings.

## Backend integration note

Health scoring (`GET /api/borrowers/{id}/stress/`) needs the borrower's loans on
the server. There is currently **no endpoint to submit loans**, so
`api/client.ts::reportLoans()` posts to a proposed `POST /api/borrowers/{id}/loans/`
(bulk upsert mirroring `backend/core/models.py::Loan`). Coordinate that small
addition with the backend dev — until it exists, reporting is a silent no-op and
the app uses local scoring.
