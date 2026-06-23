import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Tabs, router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
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
import { apiService } from "@/services/api";

const TAB_ITEMS = [
  { name: "index", label: "Dashboard", icon: "grid" },
  { name: "employees", label: "Employees", icon: "users" },
  { name: "clients", label: "Clients", icon: "briefcase" },
  { name: "finance", label: "Finance", icon: "trending-up" },
  { name: "projects", label: "Projects", icon: "layers" },
];

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <GlassTabBar state={props.state} navigation={props.navigation} />}
      screenOptions={{ headerShown: false }}
    >
      {TAB_ITEMS.map((it) => (
        <Tabs.Screen key={it.name} name={it.name} options={{ title: it.label }} />
      ))}
      {/* Hidden — accessed via Chat FAB only */}
      <Tabs.Screen name="admin-chat" options={{ href: null, tabBarStyle: { display: "none" } }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}

function GlassTabBar({ state, navigation }: { state: any; navigation: any }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const [totalUnread, setTotalUnread] = useState(0);
  const prevUnreadRef = useRef(0);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Shake FAB when new message arrives
  const triggerShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -5, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 5, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  // Poll unread count every 5 seconds from the contacts API
  useEffect(() => {
    let mounted = true;
    const fetchUnread = async () => {
      try {
        const res = await apiService.getChatContacts();
        if (mounted) {
          const total = res.data.reduce(
            (sum: number, c: any) => sum + (c.unread_count ?? 0),
            0
          );
          if (total > prevUnreadRef.current) {
            // New messages arrived — shake the FAB
            triggerShake();
          }
          prevUnreadRef.current = total;
          setTotalUnread(total);
        }
      } catch {}
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [triggerShake]);

  const activeRoute = typeof state.index === "number" && state.routes && state.index >= 0 && state.index < state.routes.length ? state.routes[state.index] : null;
  const activeRouteName = activeRoute?.name;
  if (activeRouteName === "admin-chat") return null;

  const visibleRoutes = state.routes.filter((r: any) =>
    TAB_ITEMS.some((t) => t.name === r.name),
  );

  // Estimate the tab bar height so the FAB can sit just above it
  const tabBarHeight = Math.max(insets.bottom, 14) + 62;

  return (
    <>
      {/* ── Floating Chat FAB ── */}
      {activeRouteName !== "employees" && (
        <ChatFAB bottomOffset={tabBarHeight} unreadCount={totalUnread} shakeAnim={shakeAnim} />
      )}

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
              const focused = activeRouteName === route.name;
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

// PremiumFAB removed — now lives in the Settings (More) page

// ─── Floating Chat FAB ────────────────────────────────────────────────────────────
function ChatFAB({ bottomOffset, unreadCount, shakeAnim }: { bottomOffset: number; unreadCount: number; shakeAnim: Animated.Value }) {
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
      <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
        <Pressable
          onPress={() => router.push("/(tabs)/admin-chat")}
          style={({ pressed }) => [
            styles.fab,
            {
              opacity: pressed ? 0.88 : 1,
              transform: [{ scale: pressed ? 0.93 : 1 }],
              shadowColor: colors.primary,
              borderColor: colors.isDark ? "rgba(255, 255, 255, 0.25)" : "rgba(0, 0, 0, 0.08)",
              borderWidth: 1.5,
            },
          ]}
        >
          {/* We wrap the glass elements in an absoluteFill View with overflow hidden to clip the BlurView,
              leaving the parent Pressable with overflow visible so the shadow displays correctly. */}
          <View style={[StyleSheet.absoluteFill, { borderRadius: 26, overflow: "hidden" }]}>
            <BlurView
              intensity={Platform.OS === "web" ? 20 : 50}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
            <View style={[styles.fabGlass, { backgroundColor: colors.primary + "cc" }]} />
          </View>
          <Feather name="message-circle" size={22} color={colors.primaryForeground} />
        </Pressable>
      </Animated.View>

      {/* Unread badge */}
      {unreadCount > 0 && (
        <View style={[styles.fabBadge, { backgroundColor: "#ef4444" }]}>
          <Text style={styles.fabBadgeTxt}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </Text>
        </View>
      )}
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
  // ── Bar styles ──
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
  fabBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  fabBadgeTxt: {
    color: "#fff",
    fontSize: 9,
    fontFamily: "Inter_700Bold",
  },
});
