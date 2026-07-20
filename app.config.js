// Dynamic Expo config. The base config lives in app.json; this layer injects the
// Android Google Maps API key from the environment so it is NEVER hardcoded or
// checked in. iOS uses Apple Maps and needs no key.
//
// To enable Google Maps tiles on Android, set GOOGLE_MAPS_ANDROID_API_KEY in the
// environment (e.g. an EAS build secret, or .env for local prebuilds). Without
// it, the Android map renders blank while iOS works normally.

module.exports = ({ config }) => {
  const androidMapsKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY;

  if (!androidMapsKey) {
    // Loud at build time: without this the Android release map gets no
    // com.google.android.geo.API_KEY meta-data and the Google provider fails to
    // initialise. Set it as an EAS secret (eas secret:create) or in .env locally.
    console.warn(
      "[app.config] GOOGLE_MAPS_ANDROID_API_KEY is not set — the Android map will not initialise in this build.",
    );
  }

  return {
    ...config,
    android: {
      ...config.android,
      ...(androidMapsKey
        ? { config: { ...config.android?.config, googleMaps: { apiKey: androidMapsKey } } }
        : {}),
    },
  };
};
