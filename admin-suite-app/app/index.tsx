import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

import { LogoMark } from "@/components/Brand";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { useColors } from "@/hooks/useColors";

export default function SplashGate() {
  const colors = useColors();
  const { user, tourComplete, loading } = useAuth();
  const { biometricsEnabled } = useSettings();

  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.85)).current;
  const dot = useRef(new Animated.Value(0)).current;
  const hasRedirectedFromSplash = useRef(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(dot, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(dot, {
          toValue: 0,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [fade, scale, dot]);

  useEffect(() => {
    if (loading || hasRedirectedFromSplash.current) return;
    const t = setTimeout(() => {
      hasRedirectedFromSplash.current = true;
      if (!tourComplete) {
        router.replace("/tour");
      } else if (!user) {
        router.replace("/(auth)/login");
      } else if (!user.profile_complete) {
        router.replace("/(auth)/complete-profile");
      } else if (biometricsEnabled) {
        router.replace("/lock");
      } else {
        router.replace("/(tabs)");
      }
    }, 1900);
    return () => clearTimeout(t);
  }, [loading, user, tourComplete, biometricsEnabled]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={{
          alignItems: "center",
          opacity: fade,
          transform: [{ scale }],
        }}
      >
        <View style={styles.markRing}>
          <LogoMark size={144} tint="#000000" />
        </View>
        <Text style={[styles.title, { fontFamily: "Inter_700Bold" }]}>
          Admin Suite
        </Text>
        <Text style={[styles.tag, { fontFamily: "Inter_500Medium" }]}>
          Run the entire company
        </Text>
      </Animated.View>


      <Animated.View
        style={[
          styles.loadingRow,
          {
            opacity: fade,
          },
        ]}
      >
        {[0, 1, 2].map((i) => (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              {
                opacity: dot.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.3, 1],
                }),
                transform: [
                  {
                    translateY: dot.interpolate({
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

      <Animated.View style={[styles.footer, { opacity: fade }]}>
        <Text style={styles.poweredText}>Powered by</Text>
        <Text style={styles.dimaCodeText}>
          <Text style={{ color: "#000" }}>Dima</Text>
          <Text style={{ color: "#3b82f6" }}>Code</Text>
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  markRing: {
    width: 176,
    height: 176,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f4f4f5",
    marginBottom: 28,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  title: {
    color: "#0a0a0a",
    fontSize: 36,
    letterSpacing: -0.8,
  },
  tag: {
    color: "#a1a1aa",
    fontSize: 16,
    marginTop: 8,
    letterSpacing: 0.2,
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
    backgroundColor: "#d4d4d8",
  },
  footer: {
    position: "absolute",
    bottom: 50,
    alignItems: "center",
  },
  poweredText: {
    fontFamily: "Inter_500Medium",
    color: "#a1a1aa",
    fontSize: 12,
  },
  dimaCodeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    marginTop: 2,
  },
});
