import { Platform } from "react-native";

// Kinwhim's palette, lifted from the web app.
export const colors = {
  paper: "#f6f1e8",
  paperDeep: "#eae2d4",
  cream: "#fff8e8",
  ink: "#242117",
  inkSoft: "#5b5548",
  muted: "#6d675a",
  coral: "#ef8354",
  rust: "#b75d3e",
  butter: "#f5d98b",
  peach: "#f6c985",
  sage: "#c9d9c3",
  moss: "#3f5d42",
  danger: "#b23b2a",
  line: "rgba(41,37,29,0.12)",
};

export const fonts = {
  serif: Platform.select({ ios: "Georgia", android: "serif", default: "serif" }),
};

export const radius = { sm: 14, md: 22, lg: 30 };

export const moods = [
  ["sparkly", "✨"],
  ["sleepy", "☁️"],
  ["chaotic", "🌀"],
  ["soft", "🌷"],
  ["victorious", "🏆"],
] as const;

export const reactionEmoji = ["✨", "😂", "🥹", "🫶", "🔥"] as const;

export const memoryStyles = ["whimsical", "cinematic", "storybook", "scrapbook"] as const;
