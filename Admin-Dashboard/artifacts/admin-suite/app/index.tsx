import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

import { LogoMark } from "@/components/Brand";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function SplashGate() {
  const colors = useColors();
  const { user, tourComplete, loading } = useAuth();

  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.85)).current;
  const dot = useRef(new Animated.Value(0)).current;

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
    if (loading) return;
    const t = setTimeout(() => {
      if (!user) {
        router.replace("/(auth)/login");
      } else if (!tourComplete) {
        router.replace("/tour");
      } else {
        router.replace("/(tabs)");
      }
    }, 1900);
    return () => clearTimeout(t);
  }, [loading, user, tourComplete]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#000000", "#0a0a0a", "#1e3a8a"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View
        style={{
          alignItems: "center",
          opacity: fade,
          transform: [{ scale }],
        }}
      >
        <View style={styles.markRing}>
          <LogoMark size={88} tint="#ffffff" />
        </View>
        <Text style={[styles.title, { fontFamily: "Inter_700Bold" }]}>
          Admin Suite
        </Text>
        <Text style={[styles.tag, { fontFamily: "Inter_500Medium" }]}>
          Run the entire company.
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  markRing: {
    width: 132,
    height: 132,
    borderRadius: 66,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    marginBottom: 28,
  },
  title: {
    color: "#ffffff",
    fontSize: 32,
    letterSpacing: -0.8,
  },
  tag: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 14,
    marginTop: 8,
    letterSpacing: 0.3,
  },
  loadingRow: {
    position: "absolute",
    bottom: 80,
    flexDirection: "row",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ffffff",
  },
});
