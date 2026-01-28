import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.internship.pursuit',
  appName: 'Internship Pursuit',
  webDir: 'dist',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com', // Replace with same ID as in App.tsx
      forceCodeForRefreshToken: true,
    },
    AppleSignIn: {
      clientId: 'com.example.app.service',
      redirectUrl: 'https://your-redirect-uri.com/callback',
    },
  }
};

export default config;
