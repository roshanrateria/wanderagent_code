import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wanderagent.app',
  appName: 'WanderAgent',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
    cleartext: true,
    allowNavigation: [
      'https://api.foursquare.com',
      'https://places-api.foursquare.com',
      'https://generativelanguage.googleapis.com',
      'https://router.project-osrm.org',
      'https://nominatim.openstreetmap.org'
    ]
  },
  plugins: {
    CapacitorHttp: {
      enabled: true
    }
  }
};

export default config;