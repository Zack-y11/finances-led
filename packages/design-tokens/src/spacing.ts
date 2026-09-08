export const spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export type SpacingToken = keyof typeof spacing;

/** @deprecated Prefer `spacing` — kept for mobile theme.ts compatibility. */
export const Spacing = spacing;
