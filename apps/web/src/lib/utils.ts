import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Native `<select>` styles aligned with `<Input>`. */
export const nativeSelectClassName =
  "h-11 w-full rounded-lg border border-input bg-surface px-3 text-sm text-ink transition-colors outline-none focus-visible:border-action focus-visible:ring-3 focus-visible:ring-action/20 disabled:cursor-not-allowed disabled:opacity-50";
