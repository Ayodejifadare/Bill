# Mobile Release Preparation

This doc captures the tasks and settings to prepare the Expo app for beta and production releases.

## Build Profiles (EAS)
- Profiles are defined in `eas.json` at the repo root.
  - `preview`: development client enabled, builds for internal QA on the `preview` channel.
  - `production`: app store builds with auto version increment, on the `production` channel.
- CLI runs from monorepo root with `cli.appRoot` set to `apps/mobile`.

Useful scripts (from repo root):
- Android Preview: `npm run eas:build:android:preview`
- iOS Preview: `npm run eas:build:ios:preview`
- Android Prod: `npm run eas:build:android:prod`
- iOS Prod: `npm run eas:build:ios:prod`
- Submit Prod: `npm run eas:submit:prod`
- EAS Update (Preview): `npm run eas:update:preview`
- EAS Update (Prod): `npm run eas:update:prod`

## App Identifiers
- iOS `bundleIdentifier`: `com.biltip.app` (apps/mobile/app.json)
- Android `package`: `com.biltip.app` (apps/mobile/app.json)
- URL Scheme: `biltip` (deep links)

## Release Channels & Updates
- `runtimeVersion` uses `appVersion` policy (see app.json) to keep updates compatible.
- Channels: `preview`, `production` (see eas.json).
- For EAS Updates, link the project (`eas init`) and configure secrets as needed.

## Signing & Credentials
- iOS: Configure distribution certificates and provisioning profiles in EAS (`eas credentials`), or let EAS manage.
- Android: EAS can manage keystore; back up securely if you bring your own.

## Crash Reporting & Analytics
- Telemetry scaffold at `apps/mobile/services/telemetry.ts` with no-op provider.
- Decide provider (Sentry, Bugsnag, Amplitude, Segment) and add DSN/keys as Expo public env vars:
  - `EXPO_PUBLIC_ANALYTICS_PROVIDER`
  - `EXPO_PUBLIC_ANALYTICS_WRITE_KEY`
- If choosing Sentry, consider `sentry-expo` and sourcemaps upload in EAS build profile (requires org/project DSN).

## Beta Testing Plan (TestFlight/Play Internal)
- Create QA group and invite testers.
- Build with `preview` profile and distribute via TestFlight (iOS) or Internal Testing (Play).
- Collect feedback via designated channel (e.g., GitHub issues, Slack form).
- Track entry/exit criteria for beta (stability, crash-free sessions, feature completeness).

## Launch Readiness Checklist
- App metadata complete (store name, description, screenshots, privacy policy).
- Legal and compliance checks for regions enabled.
- Push notification copy reviewed and opt-in flow confirmed.
- Analytics events defined (screen views, key actions) and verified.
- Crash reporting verified (forced crash handled, symbolication working).
- Network error handling verified offline/online.
- Onboarding flow finalized and localized as needed.
- Performance checks: cold start, bundle size, memory.
- Accessibility: TalkBack/VoiceOver basic pass.
- Final sign-off captured.

## Notes
- Adjust bundle identifiers and packages per environment if needed (e.g., `.beta` suffix for preview app ids).
- Keep `apps/mobile/app.json` in sync with product settings.
- Ensure `EXPO_DEBUG=1` for troubleshooting EAS build logs when necessary.

