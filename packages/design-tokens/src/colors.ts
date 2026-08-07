export const colors = {
  canvas: "#F9FAFB",
  surface: "#FFFFFF",
  surfaceMuted: "#F3F4F5",
  text: "#1F2937",
  textMuted: "#44474C",
  action: "#3B82F6",
  actionSoft: "#D8E2FF",
  success: "#10B981",
  successSoft: "#D1FAE5",
  danger: "#BA1A1A",
  dangerSoft: "#FFEBE9",
  review: "#B45309",
  reviewSoft: "#FEF3C7",
  border: "#E5E7EB",
  borderStrong: "#D1D5DB",
} as const;

export type ColorToken = keyof typeof colors;

/** Glass surface treatment (shared web/mobile semantics). */
export const glass = {
  fill: "rgba(255, 255, 255, 0.88)",
  border: "rgba(229, 231, 235, 0.85)",
  blur: 14,
  saturate: 1.2,
} as const;

/**
 * Mobile-oriented palette keys matching the previous theme.ts shape.
 * Prefer importing `colors` for new code.
 */
export const Colors = {
  light: {
    text: colors.text,
    background: colors.canvas,
    backgroundElement: colors.surface,
    backgroundSelected: colors.actionSoft,
    textSecondary: colors.textMuted,
    action: colors.action,
    actionSoft: colors.actionSoft,
    success: colors.success,
    successSoft: colors.successSoft,
    danger: colors.danger,
    dangerSoft: colors.dangerSoft,
    review: colors.review,
    reviewSoft: colors.reviewSoft,
    border: colors.border,
  },
  dark: {
    text: colors.text,
    background: colors.canvas,
    backgroundElement: colors.surface,
    backgroundSelected: colors.actionSoft,
    textSecondary: colors.textMuted,
    action: colors.action,
    actionSoft: colors.actionSoft,
    success: colors.success,
    successSoft: colors.successSoft,
    danger: colors.danger,
    dangerSoft: colors.dangerSoft,
    review: colors.review,
    reviewSoft: colors.reviewSoft,
    border: colors.border,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light;
