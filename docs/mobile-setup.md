# Mobile Development Setup

Prerequisites
- Node 18/20 (see root `package.json` engines)
- Android Studio (Android SDK + emulator) and/or Xcode (macOS) for iOS
- Expo CLI via `npx` (no global install required)

Getting started
- Install repo deps: `npm ci`
- Install mobile deps: `cd apps/mobile && npm ci`
- Run Metro bundler:
  - Android: from repo root `npm run mobile:android`
  - iOS (macOS): `npm run mobile:ios`
  - Web: `npm run mobile:web`

Theming and design system
- Shared tokens live at `shared/theme/tokens.ts` and are consumed by the RN theme provider in `apps/mobile/theme/ThemeContext.tsx`.
- Use `ThemedText` from `apps/mobile/components/ThemedText.tsx` for typography with automatic color and size.
- Access colors, spacing, radius via hooks: `useColor`, `useSpacing`, or `useTheme()`.

Common tips
- If Metro can’t find packages, run `expo doctor --fix-dependencies` in `apps/mobile`.
- Clear cache with `expo start -c`.
- Reanimated requires `babel-plugin-react-native-reanimated`; Expo config manages this automatically.

Testing and linting
- Lint mobile code: `npm run mobile:lint`
- Run tests: `cd apps/mobile && npx jest`
