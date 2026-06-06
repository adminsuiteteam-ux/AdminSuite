import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const TAB_ITEMS = [
  { name: "index", label: "Dashboard", icon: "grid" },
  { name: "tasks", label: "Tasks", icon: "check-square" },
  { name: "chat", label: "Chat", icon: "message-square" },
  { name: "finance", label: "Finance", icon: "credit-card" },
  { name: "profile", label: "Profile", icon: "user" },
];

export default function EmployeeLayout() {
  return (
    <Tabs
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      {TAB_ITEMS.map((it) => (
        <Tabs.Screen key={it.name} name={it.name} options={{ title: it.label }} />
      ))}
    </Tabs>
  );
}

function GlassTabBar({ state, navigation }: { state: any; navigation: any }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const visibleRoutes = state.routes.filter((r: any) =>
    TAB_ITEMS.some((t) => t.name === r.name),
  );

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.barWrap,
        { paddingBottom: Math.max(insets.bottom, 14) },
      ]}
    >
      <View style={styles.barOuter}>
        <BlurView
          intensity={isWeb ? 30 : 60}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.barTint} />
        <View style={styles.barInner}>
          {visibleRoutes.map((route: any) => {
            const item = TAB_ITEMS.find((t) => t.name === route.name);
            if (!item) return null;
            const focused =
              state.routes[state.index]?.name === route.name;
            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };
            return (
              <TabButton
                key={route.key}
                focused={focused}
                icon={item.icon as any}
                label={item.label}
                onPress={onPress}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

function TabButton({ focused, icon, label, onPress }: { focused: boolean; icon: keyof typeof Feather.glyphMap; label: string; onPress: () => void }) {
  const scale = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(scale, {
      toValue: focused ? 1 : 0,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [focused, scale]);

  const bgScale = scale.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1],
  });
  const bgOpacity = scale.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        { opacity: pressed ? 0.85 : 1 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Animated.View
        style={[
          styles.activeBg,
          {
            opacity: bgOpacity,
            transform: [{ scale: bgScale }],
          },
        ]}
      />
      <View style={styles.btnInner}>
        <Feather
          name={icon}
          size={22}
          color={focused ? "#fff" : "rgba(255,255,255,0.65)"}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  barWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  barOuter: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 14,
  },
  barTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10,10,12,0.55)",
  },
  barInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 4,
  },
  btn: {
    flex: 1,
    height: 46,
    borderRadius: 999,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  activeBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#2563eb",
    borderRadius: 999,
  },
  btnInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 8,
  },
});
