import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const { height: screenHeight, width: screenWidth } = Dimensions.get("window");

export interface TourLayout {
  y: number;
  height: number;
  width: number;
  x: number;
}

interface DashboardTourProps {
  active: boolean;
  step: number;
  layouts: Record<string, TourLayout>;
  scrollOffset: number;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

const TOUR_STEPS = [
  {
    key: "header",
    title: "Profile & Navigation",
    body: "Access your personal admin settings, view your security role, and check active workspace alerts instantly.",
  },
  {
    key: "profit",
    title: "Net Profit Overview",
    body: "Track your real-time net profit, monthly earnings, and operating expenses synced from active databases.",
  },
  {
    key: "chart",
    title: "Financial Trends",
    body: "A dynamic cashflow projection. Re-evaluate monthly financial history and view visual representations.",
  },
  {
    key: "stats",
    title: "Performance Grid",
    body: "Monitor team size, active project progress, active client portfolios, and gross income statistics live.",
  },
  {
    key: "actions",
    title: "Quick Operations",
    body: "Create employee profiles, log income, onboard new clients, or export raw reports with simple one-click triggers.",
  },
];

export function DashboardTour({
  active,
  step,
  layouts,
  scrollOffset,
  onNext,
  onBack,
  onSkip,
}: DashboardTourProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width: currentWidth, height: currentHeight } = useWindowDimensions();

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current; // For card entrance

  // Pulse effect for the spotlight border
  useEffect(() => {
    if (active) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.4,
            duration: 1200,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [active, pulseAnim]);

  // Stagger/Slide in tooltip card when step changes
  useEffect(() => {
    slideAnim.setValue(0);
    if (active) {
      Animated.spring(slideAnim, {
        toValue: 1,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }
  }, [step, active, slideAnim]);

  if (!active) return null;

  const currentStepData = TOUR_STEPS[step];
  if (!currentStepData) return null;

  const layout = layouts[currentStepData.key];

  // Fallback default coordinates if element layout has not loaded yet
  const pad = 8;
  const targetTop = layout ? layout.y - scrollOffset : currentHeight / 2 - 100;
  const targetHeight = layout ? layout.height : 200;
  const targetLeft = layout ? layout.x : 16;
  const targetWidth = layout ? layout.width : currentWidth - 32;

  // Mask positions
  const topMaskHeight = Math.max(0, targetTop - pad);
  const bottomMaskTop = Math.min(currentHeight, targetTop + targetHeight + pad);
  const bottomMaskHeight = Math.max(0, currentHeight - bottomMaskTop);

  const sideMaskTop = topMaskHeight;
  const sideMaskHeight = Math.max(0, bottomMaskTop - topMaskHeight);
  const leftMaskWidth = Math.max(0, targetLeft - pad);
  const rightMaskLeft = Math.min(currentWidth, targetLeft + targetWidth + pad);
  const rightMaskWidth = Math.max(0, currentWidth - rightMaskLeft);

  const isDark = colors.isDark;
  const maskColor = isDark ? "rgba(3, 3, 4, 0.76)" : "rgba(10, 10, 15, 0.68)";

  // Determine whether to place tooltip card above or below highlighted element
  const placeAbove = targetTop + targetHeight / 2 > currentHeight / 2;

  // Pulse interpolate
  const neonGlowColor = pulseAnim.interpolate({
    inputRange: [0.4, 1],
    outputRange: ["rgba(94, 106, 210, 0.35)", "rgba(94, 106, 210, 1)"],
  });

  const cardTranslateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [placeAbove ? 24 : -24, 0],
  });

  const cardOpacity = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* ── Spotlight Mask Overlays ── */}
      {/* Top Mask */}
      <View
        style={[
          styles.mask,
          {
            top: 0,
            left: 0,
            width: currentWidth,
            height: topMaskHeight,
            backgroundColor: maskColor,
          },
        ]}
      />
      {/* Bottom Mask */}
      <View
        style={[
          styles.mask,
          {
            top: bottomMaskTop,
            left: 0,
            width: currentWidth,
            height: bottomMaskHeight,
            backgroundColor: maskColor,
          },
        ]}
      />
      {/* Left Mask */}
      <View
        style={[
          styles.mask,
          {
            top: sideMaskTop,
            left: 0,
            width: leftMaskWidth,
            height: sideMaskHeight,
            backgroundColor: maskColor,
          },
        ]}
      />
      {/* Right Mask */}
      <View
        style={[
          styles.mask,
          {
            top: sideMaskTop,
            left: rightMaskLeft,
            width: rightMaskWidth,
            height: sideMaskHeight,
            backgroundColor: maskColor,
          },
        ]}
      />

      {/* ── Spotlight Active Outline Layer ── */}
      {layout && (
        <Animated.View
          style={[
            styles.spotlightOutline,
            {
              top: targetTop - pad,
              left: targetLeft - pad,
              width: targetWidth + pad * 2,
              height: targetHeight + pad * 2,
              borderColor: neonGlowColor,
            },
          ]}
          pointerEvents="none"
        />
      )}

      {/* ── Glassmorphic Tooltip Card ── */}
      <Animated.View
        style={[
          styles.tooltipContainer,
          placeAbove
            ? { bottom: currentHeight - targetTop + 14 }
            : { top: targetTop + targetHeight + pad + 14 },
          {
            transform: [{ translateY: cardTranslateY }],
            opacity: cardOpacity,
          },
        ]}
      >
        <View style={styles.cardOuter}>
          <BlurView
            intensity={Platform.OS === "web" ? 30 : 65}
            tint={isDark ? "dark" : "light"}
            style={StyleSheet.absoluteFill}
          />
          <View
            style={[
              styles.cardGlowBorder,
              { borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)" },
            ]}
          />
          
          <View style={styles.cardInner}>
            {/* Step Badge */}
            <View style={[styles.badge, { backgroundColor: isDark ? "rgba(94,106,210,0.15)" : "rgba(94,106,210,0.08)" }]}>
              <Text style={[styles.badgeText, { color: colors.accent, fontFamily: "Inter_700Bold" }]}>
                STEP {step + 1} OF {TOUR_STEPS.length}
              </Text>
            </View>

            {/* Title */}
            <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              {currentStepData.title}
            </Text>

            {/* Body */}
            <Text style={[styles.body, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {currentStepData.body}
            </Text>

            {/* Dots Progress Row */}
            <View style={styles.progressRow}>
              {TOUR_STEPS.map((_, i) => {
                const isActive = i === step;
                const isCompleted = i < step;
                return (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      {
                        backgroundColor: isActive
                          ? colors.accent
                          : isCompleted
                          ? colors.success
                          : isDark
                          ? "rgba(255,255,255,0.12)"
                          : "rgba(0,0,0,0.1)",
                        width: isActive ? 20 : 6,
                      },
                    ]}
                  />
                );
              })}
            </View>

            {/* Actions Row */}
            <View style={styles.btnRow}>
              {/* Skip Button */}
              <Pressable
                onPress={onSkip}
                style={({ pressed }) => [
                  styles.skipBtn,
                  {
                    opacity: pressed ? 0.6 : 1,
                  },
                ]}
                hitSlop={12}
              >
                <Text style={[styles.skipText, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
                  SKIP TOUR
                </Text>
              </Pressable>

              <View style={styles.rightNavRow}>
                {step > 0 && (
                  <Pressable
                    onPress={onBack}
                    style={({ pressed }) => [
                      styles.backBtn,
                      {
                        backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)",
                        borderColor: colors.border,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <Feather name="arrow-left" size={16} color={colors.foreground} />
                  </Pressable>
                )}

                {/* Continue/Finish Button */}
                <Pressable
                  onPress={onNext}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    {
                      backgroundColor: colors.primary,
                      transform: [{ scale: pressed ? 0.95 : 1 }],
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.primaryBtnText,
                      { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" },
                    ]}
                  >
                    {step === TOUR_STEPS.length - 1 ? "FINISH" : "NEXT"}
                  </Text>
                  <Feather
                    name={step === TOUR_STEPS.length - 1 ? "check" : "arrow-right"}
                    size={13}
                    color={colors.primaryForeground}
                    style={{ marginLeft: 4 }}
                  />
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  mask: {
    position: "absolute",
  },
  spotlightOutline: {
    position: "absolute",
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: "solid",
    shadowColor: "#5E6AD2",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  tooltipContainer: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 10010,
    alignItems: "center",
  },
  cardOuter: {
    width: "100%",
    maxWidth: 480,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  cardGlowBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    borderWidth: 1,
  },
  cardInner: {
    padding: 24,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 10,
  },
  badgeText: {
    fontSize: 10,
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 18,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  body: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 18,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 20,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  btnRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  skipBtn: {
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 11,
    letterSpacing: 0.8,
  },
  rightNavRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 19,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  primaryBtnText: {
    fontSize: 12,
    letterSpacing: 0.5,
  },
});
