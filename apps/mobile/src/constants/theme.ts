import { Platform } from "react-native";

export const Colors = {
  light: {
    text: "#1F2937",
    background: "#F9FAFB",
    backgroundElement: "#FFFFFF",
    backgroundSelected: "#D8E2FF",
    textSecondary: "#44474C",
    action: "#3B82F6",
    actionSoft: "#D8E2FF",
    success: "#10B981",
    successSoft: "#D1FAE5",
    danger: "#BA1A1A",
    dangerSoft: "#FFEBE9",
    review: "#B45309",
    reviewSoft: "#FEF3C7",
    border: "#E5E7EB",
  },
  dark: {
    text: "#1F2937",
    background: "#F9FAFB",
    backgroundElement: "#FFFFFF",
    backgroundSelected: "#D8E2FF",
    textSecondary: "#44474C",
    action: "#3B82F6",
    actionSoft: "#D8E2FF",
    success: "#10B981",
    successSoft: "#D1FAE5",
    danger: "#BA1A1A",
    dangerSoft: "#FFEBE9",
    review: "#B45309",
    reviewSoft: "#FEF3C7",
    border: "#E5E7EB",
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "Inter, ui-sans-serif, system-ui, sans-serif",
    serif: "Georgia, serif",
    rounded: "system-ui",
    mono: "ui-monospace, monospace",
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;
export const BottomTabInset = Platform.select({ ios: 68, android: 80 }) ?? 72;
export const MaxContentWidth = 800;
