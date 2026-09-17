import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hyperdrop.app',
  appName: 'HyperDrop',
  webDir: 'out',
  server: {
    cleartext: true,
  },
};

export default config;
