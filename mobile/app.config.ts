import { ExpoConfig } from "expo/config";

// SMS reading + biometric lock need native code, so this app runs as an Expo
// dev build (not Expo Go). Android-only for SMS.
const config: ExpoConfig = {
  name: "BorrowWise",
  slug: "borrowise",
  version: "1.0.0",
  orientation: "portrait",
  scheme: "creditshield",
  userInterfaceStyle: "light",
  assetBundlePatterns: ["**/*"],
  // Splash background (BoU cream). Without this, prebuild emits a splashscreen.xml
  // that references an undefined @color/splashscreen_background and the build fails.
  splash: { backgroundColor: "#faf6ef", resizeMode: "contain" },
  android: {
    package: "ug.creditshield.mobile",
    permissions: [
      "android.permission.READ_SMS",
      "android.permission.RECEIVE_SMS",
      "android.permission.USE_BIOMETRIC",
      "android.permission.USE_FINGERPRINT",
      "android.permission.POST_NOTIFICATIONS",
    ],
  },
  ios: {
    supportsTablet: false,
    infoPlist: { NSFaceIDUsageDescription: "Unlock BorrowWise with Face ID." },
  },
  plugins: [
    "expo-notifications",
    "expo-local-authentication",
    "expo-localization",
    // Allow plain-HTTP calls to the backend on your laptop's LAN IP (dev/demo).
    ["expo-build-properties", { android: { usesCleartextTraffic: true } }],
  ],
  extra: {
    eas: { projectId: "34abd2ee-e15f-4717-bf45-df8ea6e83279" },
  },
};

export default config;
