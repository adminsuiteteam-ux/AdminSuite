import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

export function SectionHeader({ title, action, onPress }) {
  const colors = useColors();
  return (
    <View style={styles.row}>
      <Text
        style={[
          styles.title,
          { color: colors.foreground, fontFamily: "Inter_700Bold" },
        ]}
      >
        {title}
      </Text>
      {action ? (
        <Pressable onPress={onPress} hitSlop={10}>
          <Text
            style={{
              color: colors.primary,
              fontFamily: "Inter_600SemiBold",
              fontSize: 13,
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
    marginBottom: 12,
    marginTop: 8,
  },
  title: {
    fontSize: 18,
    letterSpacing: -0.3,
  },
});
