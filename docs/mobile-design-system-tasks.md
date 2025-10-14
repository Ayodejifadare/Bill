# Design System & Theming — Tasks and Status

- Extract tokens from styles/globals.css into shared TypeScript module [Done]
  - Path: `shared/theme/tokens.ts`, export via `shared/theme/index.ts`.

- Choose styling approach and Tailwind mapping [Done]
  - Decision: Start with lightweight `StyleSheet` helpers + hooks. Revisit `nativewind` after core screens.

- Implement light/dark theme manager mirroring web ThemeContext [Done]
  - Path: `apps/mobile/theme/ThemeContext.tsx` with `useTheme()`; uses `Appearance` + AsyncStorage key `biltip-theme`.

- Typography scale and spacing utilities [Done]
  - `apps/mobile/theme/typography.ts` → `useTextStyle()` and text variants.
  - `apps/mobile/components/ThemedText.tsx` convenience wrapper.
  - `apps/mobile/theme/spacing.ts` → `useSpacing()`.

Next steps (optional)
- Add color aliases for component primitives (button, card) for consistent theming.
- Add `ThemedView` and `ThemedCard` wrappers using tokens.radius and colors.
- Revisit `nativewind` adoption if utility-class mapping is preferred.

