# Mobile App

This package is an Expo + React Native app. It now includes on-device Storybook for UI component development.

## Storybook

- Start Storybook (Expo Dev Server):
  - `npm run storybook`
  - `npm run storybook:ios`
  - `npm run storybook:android`
- Toggle is controlled via `STORYBOOK_ENABLED` in `apps/mobile/index.ts`. The scripts above set it automatically using `cross-env`.
- Entry: `apps/mobile/storybook/index.tsx` with stories under `apps/mobile/storybook/stories/`.

### Adding a new story
- Create a `*.stories.tsx` file in `apps/mobile/storybook/stories/` using `storiesOf` from `@storybook/react-native`.
- Import it in `apps/mobile/storybook/stories/index.ts` so Metro bundles it.
- Example:

```
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { Button } from '../../components/ui/Button';

storiesOf('Primitives/Button', module).add('primary', () => <Button variant="primary">Primary</Button>);
```

### Theme/Providers
- Stories are wrapped with `ThemeProvider` in `apps/mobile/storybook/index.tsx`, so components render with the app theme.

### Notes
- The previous demo screen (`screens/PrimitivesDemoScreen.tsx`) was removed. Its examples now live as individual stories: Button, Card, Badge, Avatar, ListItem, Skeleton.
- When running Storybook, the app renders Storybook instead of the normal navigator.
