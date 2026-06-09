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
  Modal,
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

interface EmployeeDashboardTourProps {
  active: boolean;
  step: number;
  layouts: Record<string, TourLayout>;
  scrollOffset: number;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export const EMPLOYEE_TOUR_STEPS = [
  {
    key: "header",
    title: "Employee Portal Header",
    body: "Greeting, name, and company context are displayed here. Use the logout button on the right to sign out.",
    icon: "user" as const,
  },
  {
    key: "stats",
    title: "Task Performance",
    body: "Summary counts of your pending vs completed tasks. Watch your completed count grow!",
    icon: "award" as const,
  },
  {
    key: "actions",
    title: "Quick Actions",
    body: "One-tap navigation shortcuts to access Tasks, Team Chat, Finance, or your Profile.",
    icon: "zap" as const,
  },
  {
    key: "active_tasks",
    title: "Active Tasks List",
    body: "Preview your top active tasks here. Tap on any task card to see details or complete them.",
    icon: "clipboard" as const,
  },
  {
    key: "nav_dashboard",
    title: "Dashboard Tab",
    body: "Your central hub showing stats, active tasks, quick actions, and recent activities.",
    icon: "grid" as const,
  },
  {
    key: "nav_tasks",
    title: "Tasks Tab",
    body: "View all tasks assigned to you. Sort through all, active, or completed tasks and update their status.",
    icon: "check-square" as const,
  },
  {
    key: "nav_chat",
    title: "Team Chat Tab",
    body: "Connect with the admin and other team members in real-time. Edit, delete, copy, or pin messages WhatsApp-style.",
    icon: "message-square" as const,
  },
  {
    key: "nav_finance",
    title: "Finance Tab",
    body: "Review financial trends and request or check performance grid metrics relevant to you.",
    icon: "credit-card" as const,
  },
  {
    key: "nav_profile",
    title: "Profile Tab",
    body: "Edit your name, phone, location, bio, customize your theme (light/dark/auto), and enable secure biometric login.",
    icon: "user" as const,
  },
];

const NAV_STEPS = new Set([
  "nav_dashboard",
  "nav_tasks",
  "nav_chat",
  "nav_finance",
  "nav_profile",
]);

export function EmployeeDashboardTour({
  active,
  step,
  layouts,
  scrollOffset,
  onNext,
  onBack,
  onSkip,
}: EmployeeDashboardTourProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width: currentWidth, height: currentHeight } = useWindowDimensions();

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

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

  const currentStepData = EMPLOYEE_TOUR_STEPS[step];
  if (!currentStepData) return null;

  const isNavStep = NAV_STEPS.has(currentStepData.key);
  const layout = layouts[currentStepData.key];

  // Constants
  const pad = 8;
  const TOOLTIP_ESTIMATED_HEIGHT = 240;
  const TOOLTIP_MARGIN = 16;
  const NAV_BAR_H = insets.bottom + 68;

  let targetTop: number;
  let targetHeight: number;
  let targetLeft: number;
  let targetWidth: number;

  if (isNavStep) {
    const outerWidth = Math.min(currentWidth - 28, 520);
    const barLeft = (currentWidth - outerWidth) / 2;
    const innerLeft = barLeft + 8;
    const innerWidth = outerWidth - 16;
    const btnWidth = (innerWidth - 16) / 5;

    let tabIndex = 0;
    if (currentStepData.key === "nav_dashboard") tabIndex = 0;
    else if (currentStepData.key === "nav_tasks") tabIndex = 1;
    else if (currentStepData.key === "nav_chat") tabIndex = 2;
    else if (currentStepData.key === "nav_finance") tabIndex = 3;
    else if (currentStepData.key === "nav_profile") tabIndex = 4;

    targetTop = currentHeight - Math.max(insets.bottom, 14) - 54;
    targetHeight = 46;
    targetLeft = innerLeft + tabIndex * (btnWidth + 4) - 2;
    targetWidth = btnWidth + 4;
  } else {
    targetTop = layout ? layout.y - scrollOffset : currentHeight / 2 - 100;
    targetHeight = layout ? layout.height : 200;
    targetLeft = layout ? layout.x : 16;
    targetWidth = layout ? layout.width : currentWidth - 32;
  }

  // Mask positions
  const topMaskHeight = Math.max(0, targetTop - pad);
  const bottomMaskTop = Math.min(currentHeight, targetTop + targetHeight + pad);
  const bottomMaskHeight = Math.max(0, currentHeight - bottomMaskTop);

  const sideMaskTop = topMaskHeight;
  const sideMaskHeight = Math.max(0, bottomMaskTop - topMaskHeight);
  const leftMaskWidth = isNavStep ? 0 : Math.max(0, targetLeft - pad);
  const rightMaskLeft = isNavStep ? currentWidth : Math.min(currentWidth, targetLeft + targetWidth + pad);
  const rightMaskWidth = isNavStep ? 0 : Math.max(0, currentWidth - rightMaskLeft);

  const isDark = colors.isDark;
  const maskColor = isDark ? "rgba(3, 3, 4, 0.82)" : "rgba(10, 10, 15, 0.74)";

  // Tooltip placement
  let placeAbove: boolean;
  if (isNavStep) {
    placeAbove = true;
  } else {
    const spaceBelow = currentHeight - (targetTop + targetHeight + pad);
    const spaceAbove = targetTop - pad;
    placeAbove = spaceAbove > spaceBelow;
  }

  let tooltipTop: number | undefined;
  let tooltipBottom: number | undefined;

  if (placeAbove) {
    const bottomFromTop = currentHeight - (targetTop - pad - TOOLTIP_MARGIN);
    tooltipBottom = Math.max(
      bottomMaskHeight + TOOLTIP_MARGIN + 4,
      bottomFromTop
    );
    tooltipBottom = Math.min(tooltipBottom, currentHeight - insets.top - TOOLTIP_MARGIN);
  } else {
    tooltipTop = targetTop + targetHeight + pad + TOOLTIP_MARGIN;
    const maxTop = currentHeight - NAV_BAR_H - TOOLTIP_ESTIMATED_HEIGHT - TOOLTIP_MARGIN;
    tooltipTop = Math.min(tooltipTop, maxTop);
    tooltipTop = Math.max(tooltipTop, insets.top + TOOLTIP_MARGIN);
  }

  const neonGlowColor = pulseAnim.interpolate({
    inputRange: [0.4, 1],
    outputRange: ["rgba(94, 106, 210, 0.35)", "rgba(94, 106, 210, 1)"],
  });

  const cardTranslateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [placeAbove ? 20 : -20, 0],
  });

  const cardOpacity = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <Modal visible={active} transparent animationType="none" onRequestClose={onSkip}>
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
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
          pointerEvents="none"
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
          pointerEvents="none"
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
          pointerEvents="none"
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
          pointerEvents="none"
        />

        {/* Outline spotlight */}
        {(layout || isNavStep) && (
          <Animated.View
            style={[
              styles.spotlightOutline,
              {
                top: targetTop - pad,
                left: isNavStep ? 0 : targetLeft - pad,
                width: isNavStep ? currentWidth : targetWidth + pad * 2,
                height: targetHeight + pad * 2,
                borderColor: neonGlowColor,
              },
            ]}
            pointerEvents="none"
          />
        )}

        {/* Tooltip Card */}
        <Animated.View
          style={[
            styles.tooltipContainer,
            placeAbove ? { bottom: tooltipBottom } : { top: tooltipTop },
            {
              transform: [{ translateY: cardTranslateY }],
              opacity: cardOpacity,
              zIndex: 99999,
              elevation: 99,
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
              <View style={[styles.badge, { backgroundColor: isDark ? "rgba(94,106,210,0.15)" : "rgba(94,106,210,0.08)" }]}>
                <Feather name={currentStepData.icon} size={10} color={colors.accent} style={{ marginRight: 4 }} />
                <Text style={[styles.badgeText, { color: colors.accent, fontFamily: "Inter_700Bold" }]}>
                  STEP {step + 1} OF {EMPLOYEE_TOUR_STEPS.length}
                </Text>
              </View>

              <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                {currentStepData.title}
              </Text>

              <Text style={[styles.body, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {currentStepData.body}
              </Text>

              <View style={styles.progressRow}>
                {EMPLOYEE_TOUR_STEPS.map((_, i) => {
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

              <View style={styles.btnRow}>
                <Pressable
                  onPress={onSkip}
                  style={({ pressed }) => [styles.skipBtn, { opacity: pressed ? 0.6 : 1 }]}
                  hitSlop={14}
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
                      hitSlop={14}
                    >
                      <Feather name="arrow-left" size={16} color={colors.foreground} />
                    </Pressable>
                  )}

                  <Pressable
                    onPress={onNext}
                    style={({ pressed }) => [
                      styles.primaryBtn,
                      {
                        backgroundColor: colors.primary,
                        transform: [{ scale: pressed ? 0.95 : 1 }],
                      },
                    ]}
                    hitSlop={14}
                  >
                    <Text
                      style={[
                        styles.primaryBtnText,
                        { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" },
                      ]}
                    >
                      {step === EMPLOYEE_TOUR_STEPS.length - 1 ? "FINISH" : "NEXT"}
                    </Text>
                    <Feather
                      name={step === EMPLOYEE_TOUR_STEPS.length - 1 ? "check" : "arrow-right"}
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  mask: {
    position: "absolute",
    zIndex: 9999,
    elevation: 10,
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
    zIndex: 10000,
    elevation: 11,
  },
  tooltipContainer: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 99999,
    elevation: 99,
    alignItems: "center",
  },
  cardOuter: {
    width: "100%",
    maxWidth: 480,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 99,
  },
  cardGlowBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    borderWidth: 1,
  },
  cardInner: {
    padding: 22,
  },
  badge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
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
    marginBottom: 16,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 18,
    flexWrap: "wrap",
  },
  dot: {
    height: 5,
    borderRadius: 3,
  },
  btnRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  skipBtn: {
    paddingVertical: 10,
    paddingRight: 8,
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
    paddingVertical: 11,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  primaryBtnText: {
    fontSize: 12,
    letterSpacing: 0.5,
  },
});
