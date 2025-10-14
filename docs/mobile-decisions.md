# Mobile App Decisions

- Approach: Expo managed workflow (SDK 54)
- Location: `apps/mobile`
- Rationale:
  - Faster bootstrap and updates vs. bare RN
  - Built-in tooling for iOS/Android/Web, linking, and config
  - Easy CI for typecheck/lint/test without native build steps

Next actions: keep React Native-specific tooling scoped to `apps/mobile` and reuse shared TypeScript/types from the monorepo.

