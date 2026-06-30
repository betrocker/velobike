import 'dotenv/config';

import type { ConfigContext, ExpoConfig } from '@expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? 'VeloBike',
  slug: config.slug ?? 'velobike',
  plugins: [
    ...(config.plugins ?? []),
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'VeloBike koristi tvoju lokaciju da serviser može da dođe na pravu adresu.',
      },
    ],
  ],
  android: {
    ...config.android,
    package: config.android?.package ?? 'com.velobike.app',
    config: {
      ...config.android?.config,
      googleMaps: {
        ...config.android?.config?.googleMaps,
        apiKey: process.env.GOOGLE_MAPS_API_KEY ?? '',
      },
    },
  },
});
