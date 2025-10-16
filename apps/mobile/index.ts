import { registerRootComponent } from 'expo';

const isStorybook = !!process.env.STORYBOOK_ENABLED;

if (isStorybook) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { default: StorybookUIRoot } = require('./storybook');
  registerRootComponent(StorybookUIRoot);
} else {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { default: App } = require('./App');
  // registerRootComponent calls AppRegistry.registerComponent('main', () => App);
  // It also ensures that whether you load the app in Expo Go or in a native build,
  // the environment is set up appropriately
  registerRootComponent(App);
}
