import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

import { LogoMark } from "@/components/Brand";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { useColors } from "@/hooks/useColors";
import { motion } from "@/constants/theme";

export default function SplashGate() {
  const colors = useColors();
  const { user, tourComplete, loading, suspendedUntil } = useAuth();
  const { biometricsEnabled } = useSettings();

  // ── Staggered entrance animations ─────────────────────────────────
  // Frame 1: Logo — fade + gentle scale-up
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.72)).current;

  // Frame 2: Title — float up + fade
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(18)).current;

  // Frame 3: Subtitle — float up + fade
  const subOpacity = useRef(new Animated.Value(0)).current;
  const subTranslateY = useRef(new Animated.Value(14)).current;

  // Footer — fade in last
  const footerOpacity = useRef(new Animated.Value(0)).current;

  // Loading dots — 3 independent bounce animations
  const dot0 = useRef(new Animated.Value(0)).current;
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;

  // Exit dissolve
  const exitOpacity = useRef(new Animated.Value(1)).current;
  const exitScale = useRef(new Animated.Value(1)).current;

  const hasRedirectedFromSplash = useRef(false);

  const isDark = colors.isDark;
  const logoBg = isDark ? "#111113" : "#f4f4f5";
  const logoTint = isDark ? "#EDEDEF" : "#000000";

  const makeDotLoop = (anim: Animated.Value, delay: number) =>
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, {
          toValue: 1,
          duration: 380,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 380,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.delay(Math.max(0, 760 - delay * 2)),
      ])
    );

  useEffect(() => {
    const [x1, y1, x2, y2] = motion.floatIn.easing;
    const bezier = Easing.bezier(x1, y1, x2, y2);

    // Frame 1: Logo (0ms)
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 550,
        useNativeDriver: true,
        easing: bezier,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 8,
        tension: 55,
        useNativeDriver: true,
      }),
    ]).start();

    // Frame 2: Title (320ms stagger)
    Animated.parallel([
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 480,
        delay: 320,
        useNativeDriver: true,
        easing: bezier,
      }),
      Animated.timing(titleTranslateY, {
        toValue: 0,
        duration: 480,
        delay: 320,
        useNativeDriver: true,
        easing: bezier,
      }),
    ]).start();

    // Frame 3: Subtitle (520ms stagger)
    Animated.parallel([
      Animated.timing(subOpacity, {
        toValue: 1,
        duration: 460,
        delay: 520,
        useNativeDriver: true,
        easing: bezier,
      }),
      Animated.timing(subTranslateY, {
        toValue: 0,
        duration: 460,
        delay: 520,
        useNativeDriver: true,
        easing: bezier,
      }),
    ]).start();

    // Footer (760ms stagger)
    Animated.timing(footerOpacity, {
      toValue: 1,
      duration: 500,
      delay: 760,
      useNativeDriver: true,
      easing: bezier,
    }).start();

    // 3 staggered bouncing dots
    makeDotLoop(dot0, 0).start();
    makeDotLoop(dot1, 160).start();
    makeDotLoop(dot2, 320).start();
  }, []);

  // ── Routing with dissolve exit ────────────────────────────────────
  useEffect(() => {
    if (loading || hasRedirectedFromSplash.current) return;

    const t = setTimeout(() => {
      hasRedirectedFromSplash.current = true;

      Animated.parallel([
        Animated.timing(exitOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }),
        Animated.timing(exitScale, {
          toValue: 1.06,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }),
      ]).start(() => {
        if (suspendedUntil && new Date(suspendedUntil) > new Date()) {
          router.replace("/(auth)/suspended");
        } else if (!tourComplete) {
          router.replace("/tour");
        } else if (!user) {
          router.replace("/(auth)/login");
        } else if (user.is_first_login) {
          // Any system-created account must reset their temporary password first
          router.replace("/(auth)/employee-setup");
        } else if (!user.profile_complete) {
          router.replace("/(auth)/complete-profile");
        } else if (biometricsEnabled) {
          router.replace("/lock");
        } else if (['employee', 'hr', 'finance', 'operations', 'secretary', 'dept_manager'].includes(user.role)) {
          router.replace("/(employee)");
        } else {
          router.replace("/(tabs)");
        }
      });
    }, 400);
    return () => clearTimeout(t);
  }, [loading, user, tourComplete, biometricsEnabled, suspendedUntil]);

  const makeDotStyle = (anim: Animated.Value) => ({
    opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
    transform: [
      { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) },
    ],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          opacity: exitOpacity,
          transform: [{ scale: exitScale }],
        },
      ]}
    >
      {/* ── Logo Mark ── */}
      <Animated.View
        style={{
          alignItems: "center",
          opacity: logoOpacity,
          transform: [{ scale: logoScale }],
          marginBottom: 28,
        }}
      >
        <LogoMark size={144} tint={logoTint} />
      </Animated.View>

      {/* ── Title (Frame 2) ── */}
      <Animated.View
        style={{
          opacity: titleOpacity,
          transform: [{ translateY: titleTranslateY }],
        }}
      >
        <Text
          style={[
            styles.title,
            {
              fontFamily: "Inter_700Bold",
              color: colors.foreground,
            },
          ]}
        >
          Admin Suite
        </Text>
      </Animated.View>

      {/* ── Subtitle (Frame 3) ── */}
      <Animated.View
        style={{
          opacity: subOpacity,
          transform: [{ translateY: subTranslateY }],
        }}
      >
        <Text
          style={[
            styles.tag,
            {
              fontFamily: "Inter_500Medium",
              color: colors.mutedForeground,
            },
          ]}
        >
          Run the entire company
        </Text>
      </Animated.View>

      {/* ── Three Bouncing Dots ── */}
      <Animated.View style={[styles.loadingRow, { opacity: subOpacity }]}>
        {[dot0, dot1, dot2].map((anim, i) => (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: isDark ? "#3f3f46" : "#d4d4d8",
              },
              makeDotStyle(anim),
            ]}
          />
        ))}
      </Animated.View>

      {/* ── Footer ── */}
      <Animated.View style={[styles.footer, { opacity: footerOpacity }]}>
        <Text style={[styles.poweredText, { color: colors.mutedForeground }]}>
          Powered by
        </Text>
        <Text style={styles.dimaCodeText}>
          <Text style={{ color: colors.foreground }}>Dima</Text>
          <Text style={{ color: "#3b82f6" }}>Code</Text>
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  markRing: {
    width: 172,
    height: 172,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  title: {
    fontSize: 36,
    letterSpacing: -0.8,
    textAlign: "center",
  },
  tag: {
    fontSize: 16,
    marginTop: 8,
    letterSpacing: 0.2,
    textAlign: "center",
  },
  loadingRow: {
    position: "absolute",
    bottom: 120,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  footer: {
    position: "absolute",
    bottom: 50,
    alignItems: "center",
  },
  poweredText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  dimaCodeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    marginTop: 2,
  },
});
