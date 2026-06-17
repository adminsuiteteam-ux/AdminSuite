import { Feather, FontAwesome6 } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { PLANS } from "@/constants/premiumPlans";

export { PLANS };

const { width } = Dimensions.get("window");


export default function PremiumScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [selectedPlan, setSelectedPlan] = useState("pro");

  // Entrance animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          hitSlop={10}
        >
          <Feather name="chevron-left" size={22} color={colors.foreground} />
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <View style={styles.crownRow}>
            <FontAwesome6 name="crown" size={18} color="#fbbf24" solid />
            <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              AdminSuite Premium
            </Text>
          </View>
          <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12 }}>
            Unlock the full power of your workspace
          </Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* Hero banner */}
          <View
            style={[
              styles.heroBanner,
              { backgroundColor: colors.card, borderColor: "rgba(251,191,36,0.3)" },
            ]}
          >
            <BlurView intensity={Platform.OS === "web" ? 20 : 40} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={styles.heroBannerInner}>
              <View style={styles.heroBadge}>
                <FontAwesome6 name="crown" size={12} color="#fbbf24" solid />
                <Text style={{ color: "#fbbf24", fontFamily: "Inter_700Bold", fontSize: 11, marginLeft: 5 }}>
                  PREMIUM PLANS
                </Text>
              </View>
              <Text style={[styles.heroTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                Supercharge Your{"\n"}Business Operations
              </Text>
              <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 20 }}>
                From HR to Finance, unlock every tool your team needs to grow — without limits.
              </Text>
            </View>
          </View>

          {/* Plan cards */}
          {PLANS.map((plan, index) => {
            const isSelected = selectedPlan === plan.id;
            const cardAnim = useRef(new Animated.Value(0)).current;

            useEffect(() => {
              Animated.timing(cardAnim, {
                toValue: 1,
                duration: 500,
                delay: index * 120,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
              }).start();
            }, []);

            return (
              <Animated.View
                key={plan.id}
                style={{
                  opacity: cardAnim,
                  transform: [{ translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
                }}
              >
                <Pressable
                  onPress={() => setSelectedPlan(plan.id)}
                  style={[
                    styles.planCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: isSelected ? plan.color : colors.border,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                >
                  {/* Card header gradient strip */}
                  <LinearGradient
                    colors={[plan.gradientFrom + "22", plan.gradientTo + "05"]}
                    style={styles.cardGradientHeader}
                  />

                  {/* Badge */}
                  {plan.badge && (
                    <View style={[styles.planBadge, { backgroundColor: plan.color }]}>
                      <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 10 }}>
                        {plan.badge}
                      </Text>
                    </View>
                  )}

                  {/* Plan icon + name */}
                  <View style={styles.planTopRow}>
                    <View style={[styles.planIconWrap, { backgroundColor: plan.color + "20" }]}>
                      <FontAwesome6 name={plan.icon as any} size={18} color={plan.color} solid />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.planName, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                        {plan.name}
                      </Text>
                      <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12 }}>
                        {plan.tagline}
                      </Text>
                    </View>
                    {isSelected && (
                      <View style={[styles.checkCircle, { backgroundColor: plan.color }]}>
                        <Feather name="check" size={12} color="#fff" />
                      </View>
                    )}
                  </View>

                  {/* Price */}
                  <View style={styles.priceRow}>
                    <Text style={[styles.priceAmount, { color: plan.color, fontFamily: "Inter_700Bold" }]}>
                      {plan.price}
                    </Text>
                    <Text style={[styles.pricePeriod, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                      {plan.period}
                    </Text>
                  </View>

                  {/* Features */}
                  <View style={{ gap: 8, marginBottom: 16 }}>
                    {plan.features.map((f) => (
                      <View key={f} style={styles.featureRow}>
                        <View style={[styles.featureDot, { backgroundColor: plan.color + "30" }]}>
                          <Feather name="check" size={10} color={plan.color} />
                        </View>
                        <Text style={{ color: colors.foreground, fontFamily: "Inter_500Medium", fontSize: 13, flex: 1 }}>
                          {f}
                        </Text>
                      </View>
                    ))}
                    {plan.missing.map((f) => (
                      <View key={f} style={styles.featureRow}>
                        <View style={[styles.featureDot, { backgroundColor: colors.muted }]}>
                          <Feather name="x" size={10} color={colors.mutedForeground} />
                        </View>
                        <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13, flex: 1 }}>
                          {f}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* CTA Buttons */}
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <Pressable
                      onPress={() =>
                        router.push({
                          pathname: "/premium/pay" as any,
                          params: { planId: plan.id },
                        })
                      }
                      style={({ pressed }) => [
                        styles.proceedBtn,
                        {
                          backgroundColor: plan.color,
                          flex: 1,
                          opacity: pressed ? 0.85 : 1,
                          transform: [{ scale: pressed ? 0.97 : 1 }],
                        },
                      ]}
                    >
                      <FontAwesome6 name="crown" size={12} color="#fff" solid />
                      <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 13, marginLeft: 6 }}>
                        Get {plan.name}
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() =>
                        router.push({
                          pathname: "/premium/learn-more" as any,
                          params: { planId: plan.id },
                        })
                      }
                      style={({ pressed }) => [
                        styles.learnBtn,
                        {
                          borderColor: plan.color + "60",
                          backgroundColor: plan.color + "10",
                          opacity: pressed ? 0.85 : 1,
                        },
                      ]}
                    >
                      <Text style={{ color: plan.color, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
                        Learn More
                      </Text>
                    </Pressable>
                  </View>
                </Pressable>
              </Animated.View>
            );
          })}

          {/* Footer note */}
          <View style={[styles.footerNote, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Feather name="shield" size={14} color={colors.mutedForeground} />
            <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12, flex: 1, lineHeight: 18 }}>
              All plans include a 14-day free trial. No credit card required to start. Cancel anytime.
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  crownRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  headerTitle: { fontSize: 18 },
  heroBanner: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    marginBottom: 8,
  },
  heroBannerInner: { padding: 20, gap: 10 },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(251,191,36,0.15)",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.3)",
  },
  heroTitle: { fontSize: 22, lineHeight: 30 },
  planCard: {
    borderRadius: 20,
    padding: 18,
    overflow: "hidden",
  },
  cardGradientHeader: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
  },
  planBadge: {
    position: "absolute",
    top: 14,
    right: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  planTopRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  planIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  planName: { fontSize: 18 },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    marginBottom: 16,
  },
  priceAmount: { fontSize: 38, lineHeight: 44 },
  pricePeriod: { fontSize: 15, paddingBottom: 6 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  featureDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  proceedBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 12,
  },
  learnBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  footerNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
});
