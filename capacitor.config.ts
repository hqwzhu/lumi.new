import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lumiai.app',
  appName: 'LumiAI',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
