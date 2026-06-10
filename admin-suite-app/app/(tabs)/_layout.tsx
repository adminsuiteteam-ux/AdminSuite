import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Tabs, router } from "expo-router";
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
  { name: "employees", label: "Employees", icon: "users" },
  { name: "clients", label: "Clients", icon: "briefcase" },
  { name: "finance", label: "Finance", icon: "trending-up" },
  { name: "settings", label: "More", icon: "more-horizontal" },
];

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      {TAB_ITEMS.map((it) => (
        <Tabs.Screen key={it.name} name={it.name} options={{ title: it.label }} />
      ))}
      <Tabs.Screen name="projects" options={{ href: null }} />
      {/* Hidden — accessed via Chat FAB only */}
      <Tabs.Screen name="admin-chat" options={{ href: null }} />
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

  // Estimate the tab bar height so the FAB can sit just above it
  const tabBarHeight = Math.max(insets.bottom, 14) + 62;

  return (
    <>
      {/* ── Floating Chat FAB ── */}
      <ChatFAB bottomOffset={tabBarHeight} />

      {/* ── Glass Tab Bar ── */}
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
    </>
  );
}

// ─── Floating Chat FAB ────────────────────────────────────────────────────────
function ChatFAB({ bottomOffset }: { bottomOffset: number }) {
  const colors = useColors();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1.55,
            duration: 1100,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0,
            duration: 1100,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0.5,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(600),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.fabWrap, { bottom: bottomOffset + 16 }]}
    >
      {/* Pulse ring */}
      <Animated.View
        style={[
          styles.fabPulse,
          {
            backgroundColor: colors.primary + "55",
            transform: [{ scale: pulseAnim }],
            opacity: pulseOpacity,
          },
        ]}
      />

      {/* Main FAB button */}
      <Pressable
        onPress={() => router.push("/(tabs)/admin-chat")}
        style={({ pressed }) => [
          styles.fab,
          {
            opacity: pressed ? 0.88 : 1,
            transform: [{ scale: pressed ? 0.93 : 1 }],
          },
        ]}
      >
        {/* Glass layer */}
        <BlurView
          intensity={Platform.OS === "web" ? 20 : 50}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.fabGlass, { backgroundColor: colors.primary + "cc" }]} />
        <Feather name="message-circle" size={22} color="#fff" />
      </Pressable>
    </View>
  );
}

// ─── Tab Button ───────────────────────────────────────────────────────────────
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
  label: {
    color: "#fff",
    fontSize: 12,
    letterSpacing: 0.1,
  },
  // ── FAB styles ──
  fabWrap: {
    position: "absolute",
    right: 20,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  fabPulse: {
    position: "absolute",
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2563eb",
    shadowOpacity: 0.55,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 18,
  },
  fabGlass: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 26,
  },
});

