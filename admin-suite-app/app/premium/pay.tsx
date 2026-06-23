import { Feather, FontAwesome6 } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useToast } from "@/context/ToastContext";
import { PLANS } from "@/constants/premiumPlans";

const { width, height } = Dimensions.get("window");

type PayMethod = "stripe" | "transfer";

// ─── Stripe card input ────────────────────────────────────────────────────────
function CardForm({
  colors,
  cardNumber,
  setCardNumber,
  cardExpiry,
  setCardExpiry,
  cardCvc,
  setCardCvc,
  cardName,
  setCardName,
}: {
  colors: any;
  cardNumber: string;
  setCardNumber: (v: string) => void;
  cardExpiry: string;
  setCardExpiry: (v: string) => void;
  cardCvc: string;
  setCardCvc: (v: string) => void;
  cardName: string;
  setCardName: (v: string) => void;
}) {
  const formatCard = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(.{4})/g, "$1 ").trim();
  };

  const formatExpiry = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 3) return digits.slice(0, 2) + "/" + digits.slice(2);
    return digits;
  };

  const inputStyle = [
    styles.input,
    { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground, fontFamily: "Inter_500Medium" },
  ];

  return (
    <View style={{ gap: 12 }}>
      <View>
        <Text style={[styles.inputLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
          Cardholder Name
        </Text>
        <TextInput
          value={cardName}
          onChangeText={setCardName}
          placeholder="John Doe"
          placeholderTextColor={colors.mutedForeground}
          style={inputStyle}
          autoCapitalize="words"
        />
      </View>
      <View>
        <Text style={[styles.inputLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
          Card Number
        </Text>
        <View style={{ position: "relative" }}>
          <TextInput
            value={cardNumber}
            onChangeText={(t) => setCardNumber(formatCard(t))}
            placeholder="1234 5678 9012 3456"
            placeholderTextColor={colors.mutedForeground}
            style={[inputStyle, { paddingRight: 50 }]}
            keyboardType="numeric"
            maxLength={19}
          />
          <View style={styles.cardTypeIcon}>
            <Feather name="credit-card" size={20} color={colors.mutedForeground} />
          </View>
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.inputLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
            Expiry
          </Text>
          <TextInput
            value={cardExpiry}
            onChangeText={(t) => setCardExpiry(formatExpiry(t))}
            placeholder="MM/YY"
            placeholderTextColor={colors.mutedForeground}
            style={inputStyle}
            keyboardType="numeric"
            maxLength={5}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.inputLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
            CVC
          </Text>
          <TextInput
            value={cardCvc}
            onChangeText={(t) => setCardCvc(t.replace(/\D/g, "").slice(0, 3))}
            placeholder="123"
            placeholderTextColor={colors.mutedForeground}
            style={inputStyle}
            keyboardType="numeric"
            maxLength={3}
            secureTextEntry
          />
        </View>
      </View>
    </View>
  );
}

// ─── Bank Transfer Form ───────────────────────────────────────────────────────
function TransferForm({ colors, ref1, setRef1 }: { colors: any; ref1: string; setRef1: (v: string) => void }) {
  const inputStyle = [
    styles.input,
    { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground, fontFamily: "Inter_500Medium" },
  ];

  return (
    <View style={{ gap: 12 }}>
      <View style={[styles.transferInfoBox, { backgroundColor: colors.accent + "12", borderColor: colors.accent + "40" }]}>
        <Feather name="info" size={14} color={colors.accent} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.accent, fontFamily: "Inter_700Bold", fontSize: 13 }}>
            Bank Details
          </Text>
          <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 4, lineHeight: 18 }}>
            {"Bank: GTBank Nigeria\nAccount Name: AdminSuite Technologies Ltd\nAccount No: 0123456789\nSort Code: 058-152-937"}
          </Text>
        </View>
      </View>
      <View>
        <Text style={[styles.inputLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
          Your Name / Company
        </Text>
        <TextInput
          value={ref1}
          onChangeText={setRef1}
          placeholder="e.g. Chukwuemeka Obi Ltd"
          placeholderTextColor={colors.mutedForeground}
          style={inputStyle}
          autoCapitalize="words"
        />
      </View>
      <View>
        <Text style={[styles.inputLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
          Payment Reference
        </Text>
        <View style={[inputStyle, { justifyContent: "center" }]}>
          <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 14 }}>
            AS-{Math.floor(Math.random() * 900000 + 100000)}-PRO
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Success Overlay ──────────────────────────────────────────────────────────
function SuccessOverlay({
  plan,
  payMethod,
  onDone,
}: {
  plan: (typeof PLANS)[0];
  payMethod: PayMethod;
  onDone: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }),
      ]),
      Animated.timing(checkAnim, { toValue: 1, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(ring1, { toValue: 1, duration: 800, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.delay(200),
      ]),
      Animated.timing(ring2, { toValue: 1, duration: 800, delay: 200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    ]).start();
  }, []);

  const ring1Scale = ring1.interpolate({ inputRange: [0, 1], outputRange: [0.8, 2.4] });
  const ring1Opacity = ring1.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.6, 0.3, 0] });
  const ring2Scale = ring2.interpolate({ inputRange: [0, 1], outputRange: [0.8, 2.0] });
  const ring2Opacity = ring2.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.4, 0.2, 0] });

  return (
    <Animated.View
      style={[
        styles.successOverlay,
        { opacity: fadeAnim, paddingBottom: insets.bottom + 20, paddingTop: insets.top + 20 },
      ]}
    >
      {/* Deep dark background */}
      <LinearGradient colors={["#0a0a0f", "#0f0a2e", "#0a1628"]} style={StyleSheet.absoluteFill} />

      {/* Glow rings */}
      <Animated.View
        style={[
          styles.ring,
          { width: 160, height: 160, borderRadius: 80, borderColor: plan.color + "80", opacity: ring1Opacity, transform: [{ scale: ring1Scale }] },
        ]}
      />
      <Animated.View
        style={[
          styles.ring,
          { width: 160, height: 160, borderRadius: 80, borderColor: plan.color + "50", opacity: ring2Opacity, transform: [{ scale: ring2Scale }] },
        ]}
      />

      <Animated.View
        style={[
          styles.successInner,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        {/* Check circle */}
        <Animated.View
          style={[
            styles.checkCircle,
            {
              backgroundColor: plan.color + "20",
              borderColor: plan.color + "60",
              transform: [{ scale: checkAnim }],
              opacity: checkAnim,
            },
          ]}
        >
          <LinearGradient
            colors={[plan.gradientFrom, plan.gradientTo]}
            style={styles.checkGradient}
          >
            <Feather name="check" size={36} color="#fff" />
          </LinearGradient>
        </Animated.View>

        <Text style={[styles.successTitle, { fontFamily: "Inter_700Bold", color: "#fff" }]}>
          Payment {payMethod === "transfer" ? "Submitted" : "Successful"}! 🎉
        </Text>
        <Text style={[styles.successSub, { color: "rgba(255,255,255,0.65)", fontFamily: "Inter_400Regular" }]}>
          {payMethod === "transfer"
            ? "Your bank transfer request has been received. Your plan will be activated once payment is confirmed, usually within 1–2 business hours."
            : `You're now on the ${plan.name} plan. All premium features are unlocked and ready to use.`}
        </Text>

        {/* Plan pill */}
        <View style={[styles.planPill, { backgroundColor: plan.color + "20", borderColor: plan.color + "50" }]}>
          <FontAwesome6 name={plan.icon as any} size={14} color={plan.color} solid />
          <Text style={{ color: plan.color, fontFamily: "Inter_700Bold", fontSize: 14, marginLeft: 8 }}>
            {plan.name} Plan — {plan.price}/mo
          </Text>
        </View>

        {/* What's next */}
        <View style={[styles.nextStepsBox, { backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.1)" }]}>
          <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 14, marginBottom: 12 }}>What's next?</Text>
          {[
            { icon: "zap", text: "All premium features are now unlocked" },
            { icon: "mail", text: "Check your email for your receipt" },
            { icon: "settings", text: "Manage your plan in Settings → Subscription" },
          ].map((step) => (
            <View key={step.text} style={{ flexDirection: "row", gap: 10, alignItems: "center", marginBottom: 8 }}>
              <View style={[styles.nextStepDot, { backgroundColor: plan.color + "25" }]}>
                <Feather name={step.icon as any} size={12} color={plan.color} />
              </View>
              <Text style={{ color: "rgba(255,255,255,0.75)", fontFamily: "Inter_400Regular", fontSize: 13, flex: 1 }}>
                {step.text}
              </Text>
            </View>
          ))}
        </View>

        <Pressable
          onPress={onDone}
          style={({ pressed }) => [
            styles.doneBtn,
            { backgroundColor: plan.color, opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
          ]}
        >
          <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 }}>
            Go to Dashboard
          </Text>
          <Feather name="arrow-right" size={18} color="#fff" style={{ marginLeft: 8 }} />
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

import * as WebBrowser from 'expo-web-browser';
import { apiService } from '@/services/api';

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function PayScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { planId } = useLocalSearchParams<{ planId?: string }>();

  const plan = PLANS.find((p) => p.id === planId) ?? PLANS[1];

  const [payMethod, setPayMethod] = useState<PayMethod>("stripe");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Card fields
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");

  // Transfer fields
  const [transferRef, setTransferRef] = useState("");

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 480, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 480, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);

  const handlePay = async () => {
    if (payMethod === "stripe") {
      if (!cardName.trim() || cardNumber.replace(/\s/g, "").length < 16 || cardExpiry.length < 5 || cardCvc.length < 3) {
        showToast({ title: "Incomplete Details", message: "Please fill in all card fields to proceed.", type: "error" });
        return;
      }
    } else {
      if (!transferRef.trim()) {
        showToast({ title: "Name Required", message: "Please enter your name or company name.", type: "error" });
        return;
      }
    }

    setLoading(true);
    try {
      const res = await apiService.upgradeSubscription({ plan: plan.id });
      const data = res.data as any;

      // If Stripe returns a checkout URL, open it in the in-app browser
      if (data?.url) {
        setLoading(false);
        await WebBrowser.openBrowserAsync(data.url);
        // After the browser closes, show success (Stripe webhook handles actual activation)
        setSuccess(true);
        return;
      }

      // Fallback: immediate mock upgrade succeeded
      setLoading(false);
      setSuccess(true);
    } catch (err: any) {
      setLoading(false);
      const message = err?.response?.data?.error || err?.message || 'Payment failed. Please try again.';
      showToast({ title: "Payment Failed", message, type: "error" });
    }
  };

  const handleDone = () => {
    router.replace("/(tabs)" as any);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
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
            Complete Payment
          </Text>
          <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12 }}>
            Secure checkout
          </Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 100, gap: 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], gap: 16 }}>

          {/* Order summary */}
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: plan.color + "50" }]}>
            <LinearGradient
              colors={[plan.gradientFrom + "15", plan.gradientTo + "05"]}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.summaryRow}>
              <View style={[styles.planIconSm, { backgroundColor: plan.color + "20" }]}>
                <FontAwesome6 name={plan.icon as any} size={16} color={plan.color} solid />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.summaryPlanName, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                  {plan.name} Plan
                </Text>
                <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12 }}>
                  Billed monthly · Cancel anytime
                </Text>
              </View>
              <Text style={{ color: plan.color, fontFamily: "Inter_700Bold", fontSize: 22 }}>
                {plan.price}
              </Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.summaryRow}>
              <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13 }}>
                Subtotal
              </Text>
              <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
                {plan.price}
              </Text>
            </View>
            <View style={[styles.summaryRow, { marginTop: 4 }]}>
              <Text style={{ color: "#22c55e", fontFamily: "Inter_500Medium", fontSize: 13 }}>
                14-day free trial
              </Text>
              <Text style={{ color: "#22c55e", fontFamily: "Inter_700Bold", fontSize: 13 }}>
                — Free
              </Text>
            </View>
            <View style={[styles.summaryRow, { marginTop: 6 }]}>
              <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 14 }}>
                Due today
              </Text>
              <Text style={{ color: plan.color, fontFamily: "Inter_700Bold", fontSize: 18 }}>
                $0.00
              </Text>
            </View>
          </View>

          {/* Payment method selector */}
          <View>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
              Payment Method
            </Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {(["stripe", "transfer"] as PayMethod[]).map((m) => {
                const isActive = payMethod === m;
                return (
                  <Pressable
                    key={m}
                    onPress={() => setPayMethod(m)}
                    style={[
                      styles.methodBtn,
                      {
                        flex: 1,
                        backgroundColor: isActive ? plan.color + "18" : colors.card,
                        borderColor: isActive ? plan.color : colors.border,
                      },
                    ]}
                  >
                    <View style={[styles.methodIconWrap, { backgroundColor: isActive ? plan.color + "22" : colors.muted }]}>
                      {m === "stripe" ? (
                        <Feather name="credit-card" size={20} color={isActive ? plan.color : colors.mutedForeground} />
                      ) : (
                        <Feather name="send" size={18} color={isActive ? plan.color : colors.mutedForeground} />
                      )}
                    </View>
                    <Text style={{ color: isActive ? plan.color : colors.foreground, fontFamily: isActive ? "Inter_700Bold" : "Inter_500Medium", fontSize: 13, marginTop: 6 }}>
                      {m === "stripe" ? "Card / Stripe" : "Direct Transfer"}
                    </Text>
                    {isActive && (
                      <View style={[styles.methodCheck, { backgroundColor: plan.color }]}>
                        <Feather name="check" size={10} color="#fff" />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Form */}
          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.foreground, fontFamily: "Inter_700Bold", marginBottom: 14 }]}>
              {payMethod === "stripe" ? "Card Details" : "Transfer Details"}
            </Text>
            {payMethod === "stripe" ? (
              <CardForm
                colors={colors}
                cardName={cardName}
                setCardName={setCardName}
                cardNumber={cardNumber}
                setCardNumber={setCardNumber}
                cardExpiry={cardExpiry}
                setCardExpiry={setCardExpiry}
                cardCvc={cardCvc}
                setCardCvc={setCardCvc}
              />
            ) : (
              <TransferForm colors={colors} ref1={transferRef} setRef1={setTransferRef} />
            )}
          </View>

          {/* Security badges */}
          <View style={styles.securityRow}>
            {[
              { icon: "lock", label: "256-bit Encrypted" },
              { icon: "shield", label: "Fraud Protected" },
              { icon: "check-circle", label: "SSL Secured" },
            ].map((b) => (
              <View key={b.label} style={styles.secBadge}>
                <Feather name={b.icon as any} size={12} color="#22c55e" />
                <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 11, marginLeft: 4 }}>
                  {b.label}
                </Text>
              </View>
            ))}
          </View>
        </Animated.View>
      </ScrollView>

      {/* Pay Button */}
      <View
        style={[
          styles.payBtnWrap,
          { paddingBottom: insets.bottom + 16, backgroundColor: colors.background + "f5", borderColor: colors.border },
        ]}
      >
        <Pressable
          onPress={handlePay}
          disabled={loading}
          style={({ pressed }) => [
            styles.payBtn,
            {
              backgroundColor: plan.color,
              opacity: loading ? 0.7 : pressed ? 0.88 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            },
          ]}
        >
          {loading ? (
            <LoadingDots color="#fff" />
          ) : (
            <>
              <Feather name="lock" size={16} color="#fff" />
              <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16, marginLeft: 8 }}>
                {payMethod === "transfer" ? "Confirm Transfer" : `Pay ${plan.price} — Start Trial`}
              </Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Success overlay */}
      {success && (
        <SuccessOverlay plan={plan} payMethod={payMethod} onDone={handleDone} />
      )}
    </KeyboardAvoidingView>
  );
}

// ─── Loading dots ─────────────────────────────────────────────────────────────
function LoadingDots({ color }: { color: string }) {
  const d1 = useRef(new Animated.Value(0)).current;
  const d2 = useRef(new Animated.Value(0)).current;
  const d3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const dot = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: -6, duration: 300, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600),
        ])
      );
    const a1 = dot(d1, 0);
    const a2 = dot(d2, 150);
    const a3 = dot(d3, 300);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, []);

  return (
    <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
      {[d1, d2, d3].map((d, i) => (
        <Animated.View
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: color,
            transform: [{ translateY: d }],
          }}
        />
      ))}
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
  sectionLabel: { fontSize: 13, marginBottom: 8 },
  summaryCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    overflow: "hidden",
    gap: 4,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  planIconSm: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryPlanName: { fontSize: 16 },
  divider: { height: 1, marginVertical: 10 },
  methodBtn: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    alignItems: "center",
    position: "relative",
  },
  methodIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  methodCheck: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  formCard: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  inputLabel: { fontSize: 12, marginBottom: 6 },
  cardTypeIcon: {
    position: "absolute",
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  transferInfoBox: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  securityRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    paddingTop: 4,
    flexWrap: "wrap",
  },
  secBadge: { flexDirection: "row", alignItems: "center" },
  payBtnWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  payBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  // Success overlay
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  ring: {
    position: "absolute",
    borderWidth: 2,
  },
  successInner: {
    width: "100%",
    alignItems: "center",
    gap: 16,
  },
  checkCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  checkGradient: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: { fontSize: 24, textAlign: "center" },
  successSub: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    maxWidth: 320,
  },
  planPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 30,
    borderWidth: 1,
  },
  nextStepsBox: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  nextStepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  doneBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 10,
    width: "100%",
  },
});
