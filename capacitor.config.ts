import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.odontoadmin.app',
  appName: 'OdontoAdmin',
  webDir: 'dist',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '531539311792-07banoj8gike53of1ra4u4cin42cdt20.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
