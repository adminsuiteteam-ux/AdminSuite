import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { typography, spacing } from "@/constants/theme";

export function SectionHeader({
  title,
  action,
  onPress,
}: {
  title: string;
  action?: string;
  onPress?: () => void;
}) {
  const colors = useColors();
  return (
    <View style={styles.row}>
      <Text
        style={[
          styles.title,
          {
            color: colors.foreground,
            fontFamily: "Inter_700Bold",
            ...typography.h2,
          },
        ]}
      >
        {title}
      </Text>
      {action ? (
        <Pressable
          onPress={onPress}
          hitSlop={10}
          style={({ pressed }) => ({
            opacity: pressed ? 0.6 : 1,
            transform: [{ scale: pressed ? 0.96 : 1 }],
          })}
        >
          <Text
            style={{
              color: colors.accent,
              fontFamily: "Inter_600SemiBold",
              fontSize: 13,
              letterSpacing: 0.1,
            }}
          >
            {action}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  title: {
    fontSize: 20,
    letterSpacing: -0.4,
  },
});
