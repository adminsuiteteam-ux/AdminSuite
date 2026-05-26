import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { useColors } from "@/hooks/useColors";

export function LogoMark({ size = 56, tint }: { size?: number; tint?: string }) {
  const colors = useColors();
  const color = tint ?? colors.foreground;
  return (
    <View
      style={[
        styles.markWrap,
        { width: size, height: size },
      ]}
    >
      <Svg width={size} height={size} viewBox="0 0 100 100">
        {/* Main Ring with Gap */}
        <Path
          d="M 66.9 86.3 A 40 40 0 1 1 86.3 66.9 L 69.9 59.3 A 22 22 0 1 0 59.3 69.9 Z"
          fill={color}
        />
        {/* Detached Wedge */}
        <Path
          d="M 72.8 81.3 C 74.5 83.0 77.3 83.0 79.0 81.3 C 83.0 77.3 83.0 74.5 81.3 72.8 L 73.0 64.5 C 71.3 62.8 68.5 62.8 66.8 64.5 C 62.8 68.5 62.8 71.3 64.5 73.0 Z"
          fill={color}
        />
      </Svg>
    </View>
  );
}

export function BrandLockup({ size = 40, color }: { size?: number; color?: string }) {
  const colors = useColors();
  const c = color ?? colors.foreground;
  return (
    <View style={styles.lockup}>
      <LogoMark size={size} tint={c} />
      <View>
        <Text style={[styles.brand, { color: c, fontFamily: "Inter_700Bold" }]}>
          Admin Suite
        </Text>
        <Text
          style={[
            styles.tagline,
            { color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
          ]}
        >
          Run the entire company.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  markWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  lockup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  brand: {
    fontSize: 20,
    letterSpacing: -0.4,
  },
  tagline: {
    fontSize: 12,
    marginTop: 2,
  },
});
