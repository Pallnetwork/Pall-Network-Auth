import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pallnetwork.mining',
  appName: 'Pall Network',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    url: 'https://pallnetworkcommerce.com',
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
      launchUrl: 'https://pallnetworkcommerce.com'
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