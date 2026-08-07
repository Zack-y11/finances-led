import {
  GlassView,
  isLiquidGlassAvailable,
} from 'expo-glass-effect';
import { cssInterop } from 'nativewind';
import type { ReactNode } from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';

import { glass } from '@/constants/theme';
import { cn } from '@/lib/utils';

cssInterop(GlassView, { className: 'style' });

type GlassSurfaceProps = {
  children: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
  /** When false, omit default padding so the surface can wrap compact controls. */
  padded?: boolean;
};

const fallbackStyle: ViewStyle = {
  backgroundColor: glass.fill,
  borderColor: glass.border,
  borderWidth: 1,
  borderRadius: 16,
};

export function GlassSurface({
  children,
  className,
  style,
  padded = true,
}: GlassSurfaceProps) {
  const contentClassName = cn(padded && 'p-4', className);
  const useNativeGlass = Platform.OS === 'ios' && isLiquidGlassAvailable();

  if (useNativeGlass) {
    return (
      <GlassView
        glassEffectStyle="regular"
        style={[fallbackStyle, style]}
        className={contentClassName}
      >
        {children}
      </GlassView>
    );
  }

  return (
    <View style={[fallbackStyle, style]} className={contentClassName}>
      {children}
    </View>
  );
}
