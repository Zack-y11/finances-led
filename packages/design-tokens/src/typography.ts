export const typography = {
  fontSans: "Inter, ui-sans-serif, system-ui, sans-serif",
  fontMono:
    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  fontSerif: "Georgia, 'Times New Roman', serif",
} as const;

export type TypographyToken = keyof typeof typography;
