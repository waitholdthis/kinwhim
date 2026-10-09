import { Image, type ImageProps } from "expo-image";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  StyleSheet,
  Text,
  type TextProps,
  View,
  type ViewStyle,
} from "react-native";
import { absoluteUrl, authHeaders } from "@/lib/api";
import { colors, fonts, radius } from "@/lib/theme";

export function BrandMark({ size = 40 }: { size?: number }) {
  return (
    <View style={[styles.mark, { width: size, height: size, borderRadius: size * 0.35 }]}>
      <Text style={{ fontSize: size * 0.5, color: colors.ink }}>✦</Text>
    </View>
  );
}

export function Eyebrow({ children, color = colors.rust }: { children: ReactNode; color?: string }) {
  return <Text style={[styles.eyebrow, { color }]}>{children}</Text>;
}

export function Title({ children, style, ...rest }: TextProps & { children: ReactNode }) {
  return (
    <Text accessibilityRole="header" style={[styles.title, style]} {...rest}>
      {children}
    </Text>
  );
}

export function Body({ children, style, ...rest }: TextProps & { children: ReactNode }) {
  return (
    <Text style={[styles.body, style]} {...rest}>
      {children}
    </Text>
  );
}

type ButtonProps = PressableProps & {
  label: string;
  variant?: "primary" | "light" | "ghost" | "danger";
  busy?: boolean;
  icon?: string;
  style?: ViewStyle;
};

export function Button({ label, variant = "primary", busy, icon, disabled, style, ...rest }: ButtonProps) {
  const palette = {
    primary: { bg: colors.ink, fg: colors.cream, border: colors.ink },
    light: { bg: colors.cream, fg: colors.ink, border: colors.cream },
    ghost: { bg: "transparent", fg: colors.ink, border: colors.line },
    danger: { bg: colors.danger, fg: "#fff", border: colors.danger },
  }[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled || busy), busy: Boolean(busy) }}
      disabled={disabled || busy}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: palette.bg, borderColor: palette.border, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 },
        style,
      ]}
      {...rest}
    >
      {busy ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <Text style={[styles.buttonLabel, { color: palette.fg }]}>
          {icon ? `${icon}  ` : ""}
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function Card({ children, style, tone = "paper" }: { children: ReactNode; style?: ViewStyle; tone?: "paper" | "ink" | "coral" | "sage" }) {
  const backgroundColor = { paper: "rgba(255,255,255,0.6)", ink: colors.ink, coral: colors.coral, sage: colors.sage }[tone];
  return <View style={[styles.card, { backgroundColor }, style]}>{children}</View>;
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(selected) }}
      onPress={onPress}
      style={[styles.chip, selected && { backgroundColor: colors.ink, borderColor: colors.ink }]}
    >
      <Text style={[styles.chipLabel, selected && { color: colors.cream }]}>{label}</Text>
    </Pressable>
  );
}

// Private Kinwhim media needs the session header; expo-image caches it by path.
export function AuthImage({ path, ...rest }: Omit<ImageProps, "source"> & { path: string }) {
  return (
    <Image
      {...rest}
      source={{ uri: absoluteUrl(path), headers: authHeaders(), cacheKey: path }}
      cachePolicy="memory-disk"
      transition={200}
    />
  );
}

export function ErrorBanner({ message, onDismiss }: { message: string | null; onDismiss?: () => void }) {
  if (!message) return null;
  return (
    <Pressable onPress={onDismiss} style={styles.error} accessibilityRole="alert">
      <Text style={styles.errorText}>{message}</Text>
    </Pressable>
  );
}

export function Row({ label, detail, onPress, destructive }: { label: string; detail?: string; onPress?: () => void; destructive?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
      <Text style={[styles.rowLabel, destructive && { color: colors.danger }]}>{label}</Text>
      {detail ? <Text style={styles.rowDetail}>{detail}</Text> : <Text style={styles.rowDetail}>›</Text>}
    </Pressable>
  );
}

export const styles = StyleSheet.create({
  mark: {
    backgroundColor: colors.coral,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-7deg" }],
    shadowColor: colors.ink,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  eyebrow: { fontSize: 12, fontWeight: "900", letterSpacing: 2, textTransform: "uppercase" },
  title: { fontFamily: fonts.serif, fontSize: 36, fontWeight: "900", lineHeight: 38, letterSpacing: -1, color: colors.ink },
  body: { fontSize: 16, lineHeight: 23, color: colors.inkSoft },
  button: {
    minHeight: 52,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonLabel: { fontSize: 16, fontWeight: "800" },
  card: { borderRadius: radius.lg, padding: 22 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  chipLabel: { fontSize: 14, fontWeight: "800", color: colors.ink },
  error: { backgroundColor: colors.danger, borderRadius: 16, padding: 14, marginBottom: 12 },
  errorText: { color: "#fff", fontWeight: "800" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  rowLabel: { fontSize: 16, fontWeight: "700", color: colors.ink },
  rowDetail: { fontSize: 15, color: colors.muted },
});
