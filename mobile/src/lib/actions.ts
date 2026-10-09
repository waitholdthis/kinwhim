import { ActionSheetIOS, Alert, Platform } from "react-native";

export type SheetOption = { label: string; destructive?: boolean; onPress: () => void };

// A native action sheet on iOS and an alert-style chooser on Android.
export function showActions(title: string, options: SheetOption[], message?: string) {
  if (Platform.OS === "ios") {
    const labels = [...options.map((option) => option.label), "Cancel"];
    const destructive = options
      .map((option, index) => (option.destructive ? index : -1))
      .filter((index) => index >= 0);
    ActionSheetIOS.showActionSheetWithOptions(
      { title, message, options: labels, cancelButtonIndex: labels.length - 1, destructiveButtonIndex: destructive },
      (index) => options[index]?.onPress(),
    );
    return;
  }
  Alert.alert(title, message, [
    ...options.map((option) => ({
      text: option.label,
      style: option.destructive ? ("destructive" as const) : ("default" as const),
      onPress: option.onPress,
    })),
    { text: "Cancel", style: "cancel" as const },
  ]);
}

export function confirm(title: string, message: string, actionLabel: string, destructive = true) {
  return new Promise<boolean>((resolve) => {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: actionLabel, style: destructive ? "destructive" : "default", onPress: () => resolve(true) },
    ]);
  });
}
