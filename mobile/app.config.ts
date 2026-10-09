import type { ConfigContext, ExpoConfig } from "expo/config";

// Public, non-secret build settings. Set them in eas.json `env` or .env.local.
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://kinwhim.app";
const LINK_HOST = new URL(API_URL).host;
// Reversed iOS client ID from Google Cloud, e.g. com.googleusercontent.apps.1234-abcd
const GOOGLE_IOS_URL_SCHEME = process.env.GOOGLE_IOS_URL_SCHEME ?? "com.googleusercontent.apps.REPLACE_ME";
const EAS_PROJECT_ID = process.env.EAS_PROJECT_ID;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Kinwhim",
  slug: "kinwhim",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  scheme: "kinwhim",
  userInterfaceStyle: "light",
  backgroundColor: "#f6f1e8",
  ios: {
    bundleIdentifier: "app.kinwhim",
    supportsTablet: false,
    usesAppleSignIn: true,
    associatedDomains: [`applinks:${LINK_HOST}`],
    config: { usesNonExemptEncryption: false },
    privacyManifests: {
      NSPrivacyTracking: false,
      NSPrivacyTrackingDomains: [],
      NSPrivacyCollectedDataTypes: [
        collected("NSPrivacyCollectedDataTypeEmailAddress"),
        collected("NSPrivacyCollectedDataTypeName"),
        collected("NSPrivacyCollectedDataTypeUserID"),
        collected("NSPrivacyCollectedDataTypePhotosorVideos"),
        collected("NSPrivacyCollectedDataTypeOtherUserContent"),
        collected("NSPrivacyCollectedDataTypeDeviceID"),
      ],
    },
  },
  android: {
    package: "app.kinwhim",
    adaptiveIcon: {
      backgroundColor: "#F6F1E8",
      foregroundImage: "./assets/android-icon-foreground.png",
      monochromeImage: "./assets/android-icon-monochrome.png",
    },
    // Kinwhim never reads the photo library: picking uses the system Photo Picker and
    // saving to MediaStore needs no permission on Android 10+.
    blockedPermissions: [
      "android.permission.RECORD_AUDIO",
      "android.permission.READ_MEDIA_IMAGES",
      "android.permission.READ_MEDIA_VIDEO",
      "android.permission.READ_MEDIA_VISUAL_USER_SELECTED",
    ],
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          { scheme: "https", host: LINK_HOST, pathPrefix: "/join/" },
          { scheme: "https", host: LINK_HOST, pathPrefix: "/memory/" },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    "expo-router",
    "expo-apple-authentication",
    ["expo-secure-store", { faceIDPermission: false }],
    "expo-web-browser",
    [
      "expo-camera",
      {
        cameraPermission: "Kinwhim uses the camera so you can take today’s selfie for your circle.",
        microphonePermission: false,
        recordAudioAndroid: false,
        barcodeScannerEnabled: false,
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission: "Kinwhim lets you choose a photo of yourself from your library for today’s check-in.",
        cameraPermission: "Kinwhim uses the camera so you can take today’s selfie for your circle.",
        microphonePermission: false,
      },
    ],
    [
      "expo-media-library",
      {
        photosPermission: false,
        savePhotosPermission: "Kinwhim saves memories you choose to your Photos.",
        granularPermissions: ["photo"],
      },
    ],
    ["expo-notifications", { icon: "./assets/notification-icon.png", color: "#EF8354", defaultChannel: "memories" }],
    [
      "expo-splash-screen",
      { image: "./assets/splash-icon.png", imageWidth: 160, backgroundColor: "#f6f1e8" },
    ],
    ["@react-native-google-signin/google-signin", { iosUrlScheme: GOOGLE_IOS_URL_SCHEME }],
  ],
  experiments: { typedRoutes: true },
  extra: {
    apiUrl: API_URL,
    googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    ...(EAS_PROJECT_ID ? { eas: { projectId: EAS_PROJECT_ID } } : {}),
  },
});

// Data linked to the person, used only for app functionality, never for tracking.
function collected(type: string) {
  return {
    NSPrivacyCollectedDataType: type,
    NSPrivacyCollectedDataTypeLinked: true,
    NSPrivacyCollectedDataTypeTracking: false,
    NSPrivacyCollectedDataTypePurposes: ["NSPrivacyCollectedDataTypePurposeAppFunctionality"],
  };
}
