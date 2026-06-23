import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";

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
      <Image
        source={require("@/assets/images/logo-mark.png")}
        style={{
          width: size,
          height: size,
          tintColor: color,
        }}
        resizeMode="contain"
      />
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
