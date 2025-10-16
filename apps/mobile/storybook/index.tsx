import React from 'react';
import { getStorybookUI, configure, addDecorator } from '@storybook/react-native';
import { ThemeProvider } from '../theme/ThemeContext';
import './stories';

addDecorator((Story: React.ComponentType) => (
  <ThemeProvider>
    <Story />
  </ThemeProvider>
));

configure(() => {
  // stories are imported in ./stories/index.ts
}, module);

const StorybookUIRoot = getStorybookUI({
  shouldPersistSelection: true,
  disableKeyboardAdjust: true,
});

export default StorybookUIRoot;

