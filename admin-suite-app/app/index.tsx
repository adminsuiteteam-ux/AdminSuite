import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

import { LogoMark } from "@/components/Brand";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { useColors } from "@/hooks/useColors";
import { motion, typography } from "@/constants/theme";

export default function SplashGate() {
  const colors = useColors();
  const { user, tourComplete, loading, suspendedUntil } = useAuth();
  const { biometricsEnabled } = useSettings();

  // ── Staggered entrance animations ─────────────────────────────────
  // Frame 1: Logo ring — scale + opacity
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.6)).current;

  // Frame 2: Title — drift up + opacity
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(20)).current;

  // Frame 3: Subtitle + footer
  const subOpacity = useRef(new Animated.Value(0)).current;
  const subTranslateY = useRef(new Animated.Value(16)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;

  // Shimmer pulse on logo ring
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  // Loading dots
  const dotAnim = useRef(new Animated.Value(0)).current;

  // Exit dissolve
  const exitOpacity = useRef(new Animated.Value(1)).current;
  const exitScale = useRef(new Animated.Value(1)).current;

  const hasRedirectedFromSplash = useRef(false);

  const isDark = colors.isDark;
  const logoBg = isDark ? "#111113" : "#f4f4f5";
  const logoTint = isDark ? "#EDEDEF" : "#000000";

  useEffect(() => {
    const [x1, y1, x2, y2] = motion.floatIn.easing;
    const bezier = Easing.bezier(x1, y1, x2, y2);

    // Frame 1: Logo entrance (0ms)
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
        easing: bezier,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 7,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();

    // Frame 2: Title entrance (350ms stagger)
    Animated.parallel([
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 500,
        delay: 350,
        useNativeDriver: true,
        easing: bezier,
      }),
      Animated.timing(titleTranslateY, {
        toValue: 0,
        duration: 500,
        delay: 350,
        useNativeDriver: true,
        easing: bezier,
      }),
    ]).start();

    // Frame 3: Subtitle + footer (600ms stagger)
    Animated.parallel([
      Animated.timing(subOpacity, {
        toValue: 1,
        duration: 500,
        delay: 600,
        useNativeDriver: true,
        easing: bezier,
      }),
      Animated.timing(subTranslateY, {
        toValue: 0,
        duration: 500,
        delay: 600,
        useNativeDriver: true,
        easing: bezier,
      }),
      Animated.timing(footerOpacity, {
        toValue: 1,
        duration: 600,
        delay: 800,
        useNativeDriver: true,
        easing: bezier,
      }),
    ]).start();

    // Shimmer pulse loop on logo ring
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Loading dots
    Animated.loop(
      Animated.sequence([
        Animated.timing(dotAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(dotAnim, {
          toValue: 0,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // ── Routing with dissolve exit ────────────────────────────────────
  useEffect(() => {
    if (loading || hasRedirectedFromSplash.current) return;

    const t = setTimeout(() => {
      hasRedirectedFromSplash.current = true;

      // Dissolve exit animation
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
        // Navigate after dissolve completes
        if (suspendedUntil && new Date(suspendedUntil) > new Date()) {
          router.replace("/(auth)/suspended");
        } else if (!tourComplete) {
          router.replace("/tour");
        } else if (!user) {
          router.replace("/(auth)/login");
        } else if (user.role === 'employee' && user.is_first_login) {
          router.replace("/(auth)/employee-setup");
        } else if (!user.profile_complete) {
          router.replace("/(auth)/complete-profile");
        } else if (biometricsEnabled) {
          router.replace("/lock");
        } else if (user.role === 'employee') {
          router.replace("/(employee)");
        } else {
          router.replace("/(tabs)");
        }
      });
    }, 400);
    return () => clearTimeout(t);
  }, [loading, user, tourComplete, biometricsEnabled, suspendedUntil]);

  // Shimmer glow interpolation
  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });
  const shimmerScale = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
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
      {/* ── Logo Mark with Shimmer Glow Ring ── */}
      <Animated.View
        style={{
          alignItems: "center",
          opacity: logoOpacity,
          transform: [{ scale: logoScale }],
        }}
      >
        <View style={styles.markContainer}>
          {/* Shimmer glow ring behind the logo */}
          <Animated.View
            style={[
              styles.shimmerRing,
              {
                borderColor: colors.accent,
                opacity: shimmerOpacity,
                transform: [{ scale: shimmerScale }],
              },
            ]}
            pointerEvents="none"
          />
          <View
            style={[
              styles.markRing,
              {
                backgroundColor: logoBg,
              },
            ]}
          >
            <LogoMark size={144} tint={logoTint} />
          </View>
        </View>
      </Animated.View>

      {/* ── Title (staggered Frame 2) ── */}
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

      {/* ── Subtitle (staggered Frame 3) ── */}
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

      {/* ── Loading Dots ── */}
      <Animated.View
        style={[
          styles.loadingRow,
          { opacity: subOpacity },
        ]}
      >
        {[0, 1, 2].map((i) => (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: isDark ? "#3f3f46" : "#d4d4d8",
                opacity: dotAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.3, 1],
                }),
                transform: [
                  {
                    translateY: dotAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -4 - i * 1.5],
                    }),
                  },
                ],
              },
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
  markContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  shimmerRing: {
    position: "absolute",
    width: 196,
    height: 196,
    borderRadius: 44,
    borderWidth: 2,
  },
  markRing: {
    width: 176,
    height: 176,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
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
