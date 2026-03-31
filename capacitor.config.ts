import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.odontoadmin.app',
  appName: 'OdontoAdmin',
  webDir: 'dist',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: 'COLE_SEU_WEB_CLIENT_ID_DO_FIREBASE_AQUI.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
