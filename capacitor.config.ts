import { CapacitorConfig } from '@capacitor/cli';

// Env variable fallback
const isDev = process.env.NODE_ENV === 'development';

const config: CapacitorConfig = {
  appId: 'com.pall.network', // optional: production id
  appName: 'Pall Network',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    url: isDev
      ? 'https://pall-network-auth-dev.onrender.com'
      : 'https://pall-network-auth.onrender.com',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      backgroundColor: '#2563EB',
      showSpinner: false,
      spinnerColor: '#ffffff'
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#2563EB'
    },
    App: {
      launchUrl: isDev
        ? 'https://pall-network-auth-dev.onrender.com'
        : 'https://pall-network-auth.onrender.com'
    }
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    appendUserAgent: 'PallNetworkApp/1.0.0',
    overrideUserAgent: 'PallNetworkApp/1.0.0 (Mobile; Android)',
    backgroundColor: '#2563EB'
  },
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
    backgroundColor: '#2563EB',
    overrideUserAgent: 'PallNetworkApp/1.0.0 (Mobile; iOS)'
  }
};

export default config;