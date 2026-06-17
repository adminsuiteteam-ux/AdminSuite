import { Feather, FontAwesome6 } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { PLANS } from "@/constants/premiumPlans";

// Enable LayoutAnimation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FAQ_DATA = [
  {
    q: "Can I switch plans later?",
    a: "Absolutely. You can upgrade or downgrade your plan at any time from Settings → Subscription. Changes take effect immediately and billing is prorated.",
  },
  {
    q: "What payment methods are accepted?",
    a: "We accept all major credit/debit cards (via Stripe), and direct bank transfers. All transactions are encrypted end-to-end.",
  },
  {
    q: "Is my data secure?",
    a: "Yes. All data is stored in encrypted databases with SOC-2 compliant infrastructure. We never sell or share your business data with third parties.",
  },
  {
    q: "What happens after the free trial?",
    a: "Your trial lasts 14 days with full access. At the end you'll be prompted to choose a plan. If you don't upgrade, your account shifts to a read-only mode — no data is lost.",
  },
  {
    q: "Do you offer yearly billing?",
    a: "Yes! Annual plans come with a 20% discount. You can switch to annual billing at any time from your account settings.",
  },
  {
    q: "Can I manage multiple branches?",
    a: "Multi-branch management is available on the Pro and Enterprise plans. Each branch gets its own admin scope, employee list, and financial reports.",
  },
  {
    q: "Is there a limit on storage or file uploads?",
    a: "Starter gets 5 GB. Pro gets 50 GB. Enterprise gets unlimited cloud storage for documents, employee files, and payroll records.",
  },
  {
    q: "How do I cancel my subscription?",
    a: "Cancel anytime from Settings → Subscription → Cancel Plan. You keep access until the end of your current billing period with no hidden fees.",
  },
];

const FEATURE_HIGHLIGHTS = [
  {
    icon: "users",
    color: "#6366f1",
    title: "Smart Employee Management",
    desc: "Full lifecycle HR — onboarding, payroll, performance, leave tracking, and instant search across your entire team.",
  },
  {
    icon: "trending-up",
    color: "#10b981",
    title: "Real-time Financial Analytics",
    desc: "Budget vs actuals, savings goals, debt tracking, and interactive charts that update automatically.",
  },
  {
    icon: "message-circle",
    color: "#0ea5e9",
    title: "Secure Team Chat",
    desc: "In-app encrypted messaging with read receipts, group channels, file sharing, and push notifications.",
  },
  {
    icon: "layers",
    color: "#f59e0b",
    title: "Project & Task Management",
    desc: "Assign tasks, track milestones, set deadlines, and monitor project health with visual dashboards.",
  },
  {
    icon: "globe",
    color: "#8b5cf6",
    title: "Multi-Branch Operations",
    desc: "Manage multiple offices or branches from a single workspace with per-branch reporting and admin scopes.",
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const heightAnim = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Animated.parallel([
      Animated.timing(rotateAnim, {
        toValue: open ? 0 : 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(heightAnim, {
        toValue: open ? 0 : 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
    setOpen(!open);
  };

  const rotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });

  return (
    <Pressable
      onPress={toggle}
      style={[styles.faqItem, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={styles.faqRow}>
        <Text
          style={[
            styles.faqQ,
            {
              color: colors.foreground,
              fontFamily: open ? "Inter_700Bold" : "Inter_600SemiBold",
              flex: 1,
            },
          ]}
        >
          {q}
        </Text>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
        </Animated.View>
      </View>
      {open && (
        <Text
          style={[
            styles.faqA,
            { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
          ]}
        >
          {a}
        </Text>
      )}
    </Pressable>
  );
}

export default function LearnMoreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { planId } = useLocalSearchParams<{ planId?: string }>();

  const plan = PLANS.find((p) => p.id === planId) ?? PLANS[1];

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const videoScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 480,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 480,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse the play button
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(videoScale, { toValue: 1.06, duration: 900, easing: Easing.inOut(Easing.sine), useNativeDriver: true }),
        Animated.timing(videoScale, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sine), useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
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
          <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            {plan.name} Plan
          </Text>
          <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12 }}>
            Everything included
          </Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40, gap: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], gap: 20 }}>

          {/* Plan Hero Badge */}
          <LinearGradient
            colors={[plan.gradientFrom, plan.gradientTo]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.planHeroBadge}
          >
            <FontAwesome6 name={plan.icon as any} size={28} color="#fff" solid />
            <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 22, marginTop: 8 }}>
              {plan.name}
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.8)", fontFamily: "Inter_400Regular", fontSize: 14, marginTop: 4, textAlign: "center" }}>
              {plan.tagline}
            </Text>
            <View style={styles.planHeroPrice}>
              <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 32 }}>
                {plan.price}
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.7)", fontFamily: "Inter_400Regular", fontSize: 14, paddingBottom: 4 }}>
                /month
              </Text>
            </View>
          </LinearGradient>

          {/* Video Tour Section */}
          <View>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              🎬 Video Tour
            </Text>
            <Pressable
              onPress={() => {
                /* Video player would open here */
              }}
              style={[styles.videoCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              {/* Simulated video thumbnail gradient */}
              <LinearGradient
                colors={["#1e1b4b", "#312e81", "#1e40af"]}
                style={StyleSheet.absoluteFill}
              />
              <BlurView intensity={10} tint="dark" style={StyleSheet.absoluteFill} />

              {/* Decorative shimmer lines */}
              <View style={styles.videoShimmer1} />
              <View style={styles.videoShimmer2} />

              {/* Play button */}
              <Animated.View
                style={[
                  styles.playBtnWrap,
                  { transform: [{ scale: videoScale }] },
                ]}
              >
                <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
                <Feather name="play" size={28} color="#fff" style={{ marginLeft: 4 }} />
              </Animated.View>

              {/* Label */}
              <View style={styles.videoLabel}>
                <Feather name="film" size={13} color="#fff" />
                <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 13, marginLeft: 6 }}>
                  Full Product Walkthrough — 3 mins
                </Text>
              </View>

              {/* Duration badge */}
              <View style={styles.videoDuration}>
                <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 11 }}>
                  3:24
                </Text>
              </View>
            </Pressable>
          </View>

          {/* Feature Highlights */}
          <View>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              ✨ What You Get
            </Text>
            <View style={{ gap: 10 }}>
              {FEATURE_HIGHLIGHTS.map((feat, i) => (
                <View
                  key={feat.title}
                  style={[
                    styles.featureCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <View style={[styles.featureIconWrap, { backgroundColor: feat.color + "18" }]}>
                    <Feather name={feat.icon as any} size={20} color={feat.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.featureTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                      {feat.title}
                    </Text>
                    <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19, marginTop: 3 }}>
                      {feat.desc}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* FAQ Section */}
          <View>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              💬 Frequently Asked Questions
            </Text>
            <View style={{ gap: 8 }}>
              {FAQ_DATA.map((item) => (
                <FAQItem key={item.q} q={item.q} a={item.a} />
              ))}
            </View>
          </View>

          {/* Proceed CTA */}
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/premium/pay" as any,
                params: { planId: plan.id },
              })
            }
            style={({ pressed }) => [
              styles.ctaBtn,
              {
                backgroundColor: plan.color,
                opacity: pressed ? 0.88 : 1,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              },
            ]}
          >
            <FontAwesome6 name="crown" size={16} color="#fff" solid />
            <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16, marginLeft: 10 }}>
              Get {plan.name} — {plan.price}/mo
            </Text>
          </Pressable>
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
  headerTitle: { fontSize: 18 },
  sectionTitle: { fontSize: 17, marginBottom: 12 },
  planHeroBadge: {
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    overflow: "hidden",
  },
  planHeroPrice: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    marginTop: 12,
  },
  videoCard: {
    height: 200,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  videoShimmer1: {
    position: "absolute",
    top: 20,
    left: -60,
    width: 200,
    height: 2,
    backgroundColor: "rgba(255,255,255,0.08)",
    transform: [{ rotate: "15deg" }],
  },
  videoShimmer2: {
    position: "absolute",
    top: 40,
    left: -40,
    width: 160,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    transform: [{ rotate: "15deg" }],
  },
  playBtnWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
  },
  videoLabel: {
    position: "absolute",
    bottom: 14,
    left: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  videoDuration: {
    position: "absolute",
    bottom: 14,
    right: 14,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  featureCard: {
    flexDirection: "row",
    gap: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  featureIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  featureTitle: { fontSize: 14 },
  faqItem: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 0,
  },
  faqRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  faqQ: { fontSize: 14, lineHeight: 20 },
  faqA: { fontSize: 13, lineHeight: 20, marginTop: 10 },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 14,
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
});
