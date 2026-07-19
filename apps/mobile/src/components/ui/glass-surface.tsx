import type { ReactNode } from "react";
import { GlassView } from "expo-glass-effect";
import { StyleSheet, type ViewStyle } from "react-native";

import { Colors } from "@/constants/theme";

export function GlassSurface({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  return (
    <GlassView glassEffectStyle="regular" style={[styles.surface, style]}>
      {children}
    </GlassView>
  );
}

const styles = StyleSheet.create({
  surface: {
    backgroundColor: "rgba(255,255,255,0.88)",
    borderColor: Colors.light.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
});
