# React Native Build Tasks for Pixel-Parity Mobile Apps

This plan turns the previously documented React Native build recommendations into actionable tasks. It is organized by workstream so that individual tickets can be created or assigned as needed.

### Ownership legend
- **🧑‍💻 You** – tasks that need your direct involvement or decisions.
- **🤖 Codex** – tasks I can implement autonomously once requirements are clear.
- **🤝 Pair** – items where I can prep scaffolding or draft code, but we will need your review/inputs to finalize.

Items marked with **🛎 Requires Product Input** indicate checkpoints where stakeholder feedback is expected.

## 1. Project Bootstrap & Tooling
- [ ] 🤝 Initialize Expo (or bare RN) TypeScript project and configure linting/testing parity with web repo.
- [ ] 🤖 Install core dependencies (`react-navigation`, `react-native-safe-area-context`, `react-native-svg`, `expo-linear-gradient`, AsyncStorage, toast library, etc.).
- [ ] 🤖 Set up CI workflows for linting, type-checking, and Jest/Detox scaffolding.
- [ ] 🤖 Document local development setup (Metro, linking instructions, debugging tips).

## 2. Design System & Theming
- [ ] 🤖 Extract design tokens from `styles/globals.css` into a shared TypeScript theme module.
- [ ] 🤝 Choose styling approach (`nativewind`, `tamagui`, or StyleSheet helpers) and implement mapping for existing Tailwind utility usage.
- [ ] 🤖 Build light/dark theme manager using `Appearance` + AsyncStorage to mirror web `ThemeContext` behavior.
- [ ] 🤖 Create typography scale and spacing utilities to match current UI specs.

## 3. Reusable UI Primitives
- [ ] 🤖 Implement React Native versions of `Card`, `Button`, `Badge`, `Avatar`, list tiles, and skeleton loaders with prop parity.
- [ ] 🤖 Centralize icon wrapper that maps existing icon names to `lucide-react-native` components.
- [ ] 🤖 Mirror interaction states (press, focus, disabled) and haptic feedback where appropriate.
- [ ] 🤖 Write Storybook/Expo component stories for parity checks.

## 4. Navigation Architecture
- [ ] 🤝 Recreate the reducer-driven navigation with `@react-navigation/native` bottom tabs + nested stacks.
- [ ] 🤖 Style tab bar to match `BottomNavigation` component (icons, labels, safe-area behavior).
- [ ] 🤖 Implement deep linking config and persistence of navigation state.
- [ ] 🤖 Add navigation unit tests / Detox flows for main transitions.

## 5. State Management & Data Layer
- [ ] 🤖 Port `UserProfileProvider`, `LoadingStateContext`, and related hooks to React Native with AsyncStorage-backed persistence.
- [ ] 🤖 Rework `apiClient` for RN (fetch polyfill, auth headers, offline/error semantics).
- [ ] 🤖 Ensure hooks like `useTransactions` and `useUpcomingPayments` function identically with RN networking.
- [ ] 🤝 Add offline caching strategy (e.g., React Query) aligned with mobile needs.

## 6. Screen Implementation (Phase Delivery)
- **Phase 1 – Core Tabs**
  - [ ] 🤖 Home screen (sticky header, cards, quick actions, upcoming payments, transactions list).
  - [ ] 🤖 Bills/split/friends/profile primary tabs with core flows.
  - [ ] 🤖 Network error handler using `@react-native-community/netinfo`.
- **Phase 2 – Secondary Flows**
  - [ ] 🤖 Transaction detail, recurring payments, notifications, contact sync, and modals.
  - [ ] 🤝 Permission handling with `expo-contacts`, `react-native-permissions`, biometrics (if enabled).
- **Phase 3 – Advanced / Optional**
  - [ ] 🤖 QR code sharing, reporting, onboarding, and other enhancements tracked in `MISSING_UI_TODOS.md`.

## 7. Native Integrations & Services
- [ ] 🤝 Configure push notification scaffolding (FCM/APNs) matching existing settings schema. **🛎 Requires Product Input** (confirm messaging providers, copy, opt-in flow).
- [ ] 🤝 Implement secure storage/biometric unlock if required for saved sessions. **🛎 Requires Product Input** (confirm security requirements).
- [ ] 🤝 Integrate analytics/telemetry (Amplitude, Segment, etc.). **🛎 Requires Product Input** (select vendor, event schema).
- [ ] 🤝 Evaluate offline storage requirements (SQLite/WatermelonDB) for heavy data sets.

## 8. Visual QA & Accessibility
- [ ] 🤖 Establish screenshot comparison suite across priority screens (iOS + Android).
- [ ] 🤖 Add automated accessibility checks (TalkBack/VoiceOver manual scripts, lint rules).
- [ ] 🤝 Create checklist for spacing, typography, and color parity with web reference.

## 9. Release Preparation
- [ ] 🤝 Configure build profiles, signing, and release channels for iOS (EAS or Xcode) and Android (Play Console). **🛎 Requires Product Input** (provisioning profiles, certificates).
- [ ] 🤝 Implement onboarding analytics and crash reporting (Sentry, Bugsnag). **🛎 Requires Product Input** (choose tooling).
- [ ] 🧑‍💻 Draft beta testing plan (TestFlight, Play Internal Testing) including feedback loops. **🛎 Requires Product Input** (define tester cohort, acceptance criteria).
- [ ] 🧑‍💻 Create launch readiness checklist (store listings, support docs, rollout strategy).

## 10. Stakeholder Touchpoints
- 🧑‍💻 Kickoff review once tooling and design system scaffolding are ready to confirm component parity expectations.
- 🤝 Mid-project demo after Phase 1 screens to validate navigation + core UX.
- 🤝 Pre-beta review to sign off on native integrations, analytics, and release process.
- 🧑‍💻 Final go/no-go meeting prior to public launch covering QA results and checklist sign-off.

## Next Steps
1. 🧑‍💻 Create individual tickets for the unchecked items above (group by workstream or sprint).
2. 🤝 Assign owners and timelines; highlight **🛎 Requires Product Input** items for stakeholder scheduling.
3. 🤖 Establish recurring check-ins aligned with the touchpoints listed above (I can draft the agenda/checklist).

## Repository Strategy FAQ
- **Do we need a new repo?** ➜ No. Keep the React Native source inside this mono-repo (e.g., `/apps/mobile` or `/packages/native`) so we can reuse shared TypeScript types, service clients, design tokens, and CI tooling. We can revisit splitting it out only if the mobile codebase grows constraints (build times, platform-specific secrets) that materially hurt the web project.
