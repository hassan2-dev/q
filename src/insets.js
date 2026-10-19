import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ANDROID_NAV_BUTTONS = 48;

export function useFrameInsets() {
  const insets = useSafeAreaInsets();
  if (Platform.OS !== "android") return insets;
  return { ...insets, bottom: Math.max(insets.bottom, ANDROID_NAV_BUTTONS) };
}
