// Minimal Detox config scaffold for future native E2E.
// Note: This uses placeholder build/binary values to allow CI smoke.
// Full E2E will require generating native projects (expo prebuild) and updating paths.

const config: any = {
  testRunner: {
    args: {
      $0: 'jest',
      config: require.resolve('detox/runners/jest/jest.config.json'),
    },
    jest: {
      setupTimeout: 120000,
    },
  },
  artifacts: {
    rootDir: 'e2e/artifacts',
  },
  logger: {
    level: 'info',
  },
  configurations: {
    'android.emu.debug': {
      type: 'android.emulator',
      device: {
        avdName: 'pixel_6',
      },
      app: {
        type: 'android.apk',
        binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk', // update after prebuild
        build: 'echo "Skipping native build in CI smoke"',
      },
    },
  },
};

export default config;

