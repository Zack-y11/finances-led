const { hairlineWidth } = require('nativewind/theme');

/** Values mirrored from `@finance/design-tokens` (package is ESM-only). */
const colors = {
  canvas: '#F9FAFB',
  surface: '#FFFFFF',
  surfaceMuted: '#F3F4F5',
  text: '#1F2937',
  textMuted: '#44474C',
  action: '#3B82F6',
  actionSoft: '#D8E2FF',
  success: '#10B981',
  successSoft: '#D1FAE5',
  danger: '#BA1A1A',
  dangerSoft: '#FFEBE9',
  review: '#B45309',
  reviewSoft: '#FEF3C7',
  border: '#E5E7EB',
  borderStrong: '#D1D5DB',
};

const glass = {
  fill: 'rgba(255, 255, 255, 0.88)',
  border: 'rgba(229, 231, 235, 0.85)',
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        canvas: colors.canvas,
        surface: colors.surface,
        'surface-muted': colors.surfaceMuted,
        ink: colors.text,
        'text-muted': colors.textMuted,
        action: colors.action,
        'action-soft': colors.actionSoft,
        success: colors.success,
        'success-soft': colors.successSoft,
        danger: colors.danger,
        'danger-soft': colors.dangerSoft,
        review: colors.review,
        'review-soft': colors.reviewSoft,
        border: colors.border,
        'border-strong': colors.borderStrong,
        glass: {
          fill: glass.fill,
          border: glass.border,
        },
        background: colors.canvas,
        foreground: colors.text,
        card: {
          DEFAULT: colors.surface,
          foreground: colors.text,
        },
        popover: {
          DEFAULT: colors.surface,
          foreground: colors.text,
        },
        primary: {
          DEFAULT: colors.action,
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: colors.surfaceMuted,
          foreground: colors.text,
        },
        muted: {
          DEFAULT: colors.surfaceMuted,
          foreground: colors.textMuted,
        },
        accent: {
          DEFAULT: colors.actionSoft,
          foreground: colors.action,
        },
        destructive: {
          DEFAULT: colors.danger,
          foreground: '#FFFFFF',
        },
        input: colors.borderStrong,
        ring: colors.action,
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      borderWidth: {
        hairline: hairlineWidth(),
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  future: {
    hoverOnlyWhenSupported: true,
  },
  plugins: [require('tailwindcss-animate')],
};
