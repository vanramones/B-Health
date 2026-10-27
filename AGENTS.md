# B-Health – project notes

## Apps and deployments
All app code lives in `Admin/` (one React/Vite codebase).

| Output | How it is built | Deploy from | URL |
|---|---|---|---|
| Admin website | `npx vite build` (in `Admin/`) | `Admin/` → `npx vercel --prod --yes` | https://b-health-admin.vercel.app |
| Android APK (resident mobile app) | `npx vite build`, `npx cap sync android`, Gradle `assembleDebug` | copy APK to `landing/B-HEALTH.apk`, then `landing/` → `npx vercel --prod --yes` | https://b-health-download.vercel.app |

- Gradle needs `JAVA_HOME=C:\Program Files\Android\Android Studio\jbr` (not set globally). Run `./gradlew assembleDebug` in `Admin/android`; output is `app/build/outputs/apk/debug/app-debug.apk`.
- The `notifications` table has NO `user_id` or `route` columns (only id, type, priority, title, message, recipient, is_read, created_at, deleted_at). Residents are matched by `recipient = full_name`.
- `App.jsx` shows resident routes only when running natively (Capacitor); the website is admin-only.
- The resident app is a mobile application only: do NOT deploy it as a website.
- The download page offers Android (APK) only. A real iOS build would need a Mac/Xcode and an Apple Developer account.

## Verification
- Build check: `npx vite build` in `Admin/` must end with `✓ built in …`.

## Notes
- The GitHub repo (vanramones/B-Health) is public: never commit `.env` files, `google-services.json`, or APKs (see `.gitignore`).
