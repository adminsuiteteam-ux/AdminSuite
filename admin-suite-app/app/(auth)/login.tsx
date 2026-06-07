import { Feather } from "@expo/vector-icons";

import { Link, router } from "expo-router";
import * as SecureStore from "@/services/storage";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
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
import * as Haptics from "expo-haptics";

import { LogoMark } from "../../components/Brand";
import { useAuth } from "../../context/AuthContext";
import { useColors } from "../../hooks/useColors";
import { shadows, spacing, motion } from "@/constants/theme";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login, tourComplete, user, loginWithSocial } = useAuth();

  const rawKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const isDemoKey = !rawKey || rawKey.includes("placeholder");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);

  // ── Animated values for glassmorphic focus glow ──────────────────
  const emailGlow = useRef(new Animated.Value(0)).current;
  const passGlow = useRef(new Animated.Value(0)).current;

  // ── 3D button press animation ───────────────────────────────────
  const btnPressAnim = useRef(new Animated.Value(0)).current;
  const secondaryPressAnim = useRef(new Animated.Value(0)).current;

  // Prefill email from last successful login
  useEffect(() => {
    (async () => {
      try {
        const storedUser = await SecureStore.getItemAsync("admin-suite.username");
        if (storedUser && !email) {
          setEmail(storedUser);
        }
      } catch (e) {
        // SecureStore unavailable
      }
    })();
  }, []);

  // Animate focus glow
  useEffect(() => {
    Animated.timing(emailGlow, {
      toValue: emailFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [emailFocused]);

  useEffect(() => {
    Animated.timing(passGlow, {
      toValue: passFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [passFocused]);

  const navigateAfterLogin = () => {
    router.replace("/");
  };

  const onSubmit = async () => {
    setError("");
    if (!email.trim()) {
      setError("Enter your email");
      return;
    }
    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      await login({ username: email.trim().toLowerCase(), password });
      navigateAfterLogin();
    } catch (err: any) {
      const errorData = err.response?.data;
      if (err.response?.status === 423 || errorData?.error === "suspended") {
        router.replace("/(auth)/suspended");
      } else {
        setError(errorData?.message || errorData?.non_field_errors?.[0] || err.message || "Invalid credentials. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: "google" | "apple") => {
    setError("");
    setLoading(true);
    try {
      const targetEmail = `${provider}_user_${Date.now()}@adminsuite.com`;
      const targetName = `${provider === 'google' ? 'Google' : 'Apple'} User`;
      await loginWithSocial(targetEmail, targetName, provider);
      navigateAfterLogin();
    } catch (err: any) {
      console.error("Social login error:", err);
      setError(err.message || "Social login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── 3D Button handlers ────────────────────────────────────────────
  const handleBtnPressIn = useCallback(() => {
    Animated.spring(btnPressAnim, {
      toValue: 1,
      friction: motion.springPress.friction,
      tension: motion.springPress.tension,
      useNativeDriver: true,
    }).start();
  }, [btnPressAnim]);

  const handleBtnPressOut = useCallback(() => {
    Animated.spring(btnPressAnim, {
      toValue: 0,
      friction: motion.springSnappy.friction,
      tension: motion.springSnappy.tension,
      useNativeDriver: true,
    }).start();
  }, [btnPressAnim]);

  const handleSecondaryPressIn = useCallback(() => {
    Animated.spring(secondaryPressAnim, {
      toValue: 1,
      friction: motion.springPress.friction,
      tension: motion.springPress.tension,
      useNativeDriver: true,
    }).start();
  }, [secondaryPressAnim]);

  const handleSecondaryPressOut = useCallback(() => {
    Animated.spring(secondaryPressAnim, {
      toValue: 0,
      friction: motion.springSnappy.friction,
      tension: motion.springSnappy.tension,
      useNativeDriver: true,
    }).start();
  }, [secondaryPressAnim]);

  // Interpolations
  const emailBorderColor = emailGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.inputGlassBorder, colors.accent],
  });
  const emailShadowOpacity = emailGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.15],
  });
  const passBorderColor = passGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.inputGlassBorder, colors.accent],
  });
  const passShadowOpacity = passGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.15],
  });

  const btnTranslateY = btnPressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, motion.press.translateY],
  });
  const btnScale = btnPressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, motion.press.scale],
  });
  const secScale = secondaryPressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.97],
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.container, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.header}>
            <View style={[styles.logoChip, { backgroundColor: colors.primary }]}>
              <LogoMark size={28} tint={colors.primaryForeground} />
            </View>
            <Text style={[styles.title, { fontFamily: "Inter_700Bold", color: colors.text }]}>
              Sign In
            </Text>
            <Text style={[styles.subtitle, { fontFamily: "Inter_400Regular", color: colors.mutedForeground }]}>
              Enter your email and password{"\n"}to access your account
            </Text>
          </View>

          {isDemoKey && (
            <View style={[styles.demoBanner, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <View style={[styles.demoIconCircle, { backgroundColor: "#f59e0b" }]}>
                <Feather name="alert-triangle" size={14} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.demoBannerTitle, { fontFamily: "Inter_600SemiBold", color: colors.text }]}>
                  Demo Auth Active
                </Text>
                <Text style={[styles.demoBannerText, { fontFamily: "Inter_400Regular", color: colors.mutedForeground }]}>
                  Please configure <Text style={{ fontFamily: "Inter_600SemiBold" }}>EXPO_PUBLIC_SUPABASE_ANON_KEY</Text> in your <Text style={{ fontFamily: "Inter_600SemiBold" }}>.env</Text> file to use your own Supabase keys.
                </Text>
              </View>
            </View>
          )}

          <View style={styles.form}>
            {/* ── Email Input (Glass) ── */}
            <Animated.View
              style={[
                styles.inputWrap,
                {
                  backgroundColor: colors.inputGlass,
                  borderColor: emailBorderColor,
                  borderWidth: 1.5,
                  shadowColor: colors.accent,
                  shadowOpacity: emailShadowOpacity,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 0 },
                },
              ]}
            >
              <View style={[styles.iconCircle, { backgroundColor: colors.primary }]}>
                <Feather name="mail" size={14} color={colors.primaryForeground} />
              </View>
              <TextInput
                value={email}
                onChangeText={setEmail}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                placeholder="Email address"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                keyboardType="email-address"
                style={[styles.input, { fontFamily: "Inter_500Medium", color: colors.text }]}
              />
            </Animated.View>

            {/* ── Password Input (Glass) ── */}
            <Animated.View
              style={[
                styles.inputWrap,
                {
                  marginTop: 12,
                  backgroundColor: colors.inputGlass,
                  borderColor: passBorderColor,
                  borderWidth: 1.5,
                  shadowColor: colors.accent,
                  shadowOpacity: passShadowOpacity,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 0 },
                },
              ]}
            >
              <View style={[styles.iconCircle, { backgroundColor: colors.primary }]}>
                <Feather name="lock" size={14} color={colors.primaryForeground} />
              </View>
              <TextInput
                value={password}
                onChangeText={setPassword}
                onFocus={() => setPassFocused(true)}
                onBlur={() => setPassFocused(false)}
                placeholder="Password"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry={!showPwd}
                style={[styles.input, { fontFamily: "Inter_500Medium", color: colors.text }]}
              />
              <Pressable onPress={() => setShowPwd((s) => !s)} hitSlop={10}>
                <Feather
                  name={(showPwd ? "eye-off" : "eye") as any}
                  size={16}
                  color={colors.mutedForeground}
                />
              </Pressable>
            </Animated.View>

            <Link href="/(auth)/forgot-password" asChild>
              <Pressable style={styles.forgotBtn} hitSlop={10}>
                <Text style={[styles.forgotText, { fontFamily: "Inter_500Medium", color: colors.text }]}>
                  Forgot password?
                </Text>
              </Pressable>
            </Link>

            {error ? (
              <Text style={[styles.errorText, { fontFamily: "Inter_500Medium", color: colors.danger }]}>
                {error}
              </Text>
            ) : null}

            {/* ── 3D Primary Button ── */}
            <View style={styles.submitRow}>
              <Pressable
                onPress={() => {
                  if (Platform.OS !== "web") {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  }
                  onSubmit();
                }}
                onPressIn={handleBtnPressIn}
                onPressOut={handleBtnPressOut}
                disabled={loading}
                style={{ flex: 1 }}
              >
                <Animated.View
                  style={[
                    styles.primaryBtn,
                    {
                      backgroundColor: colors.primary,
                      opacity: loading ? 0.7 : 1,
                      transform: [{ translateY: btnTranslateY }, { scale: btnScale }],
                    },
                    shadows.btnResting,
                  ]}
                >
                  <Text style={[styles.primaryBtnText, { fontFamily: "Inter_600SemiBold", color: colors.primaryForeground }]}>
                    {loading ? "Signing in..." : "Continue"}
                  </Text>
                </Animated.View>
              </Pressable>
            </View>

            <View style={styles.divider}>
              <View style={[styles.line, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { fontFamily: "Inter_400Regular", color: colors.mutedForeground }]}>
                Don't have an account yet?
              </Text>
              <View style={[styles.line, { backgroundColor: colors.border }]} />
            </View>

            {/* ── Secondary Button (3D) ── */}
            <Link href="/(auth)/register" asChild>
              <Pressable
                onPressIn={handleSecondaryPressIn}
                onPressOut={handleSecondaryPressOut}
              >
                <Animated.View
                  style={[
                    styles.secondaryBtn,
                    {
                      backgroundColor: colors.muted,
                      transform: [{ scale: secScale }],
                    },
                  ]}
                >
                  <Text style={[styles.secondaryBtnText, { fontFamily: "Inter_500Medium", color: colors.text }]}>
                    Create an account
                  </Text>
                </Animated.View>
              </Pressable>
            </Link>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { fontFamily: "Inter_400Regular", color: colors.mutedForeground }]}>
              By clicking "Continue", I have read and agree{"\n"}with the <Text style={{ textDecorationLine: "underline" }}>Term Sheet</Text>, <Text style={{ textDecorationLine: "underline" }}>Privacy Policy</Text>
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoChip: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  form: {
    width: "100%",
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    height: 56,
    paddingHorizontal: 16,
    gap: 12,
  },
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    fontSize: 15,
  },
  forgotBtn: {
    alignSelf: "center",
    paddingVertical: 16,
  },
  forgotText: {
    fontSize: 14,
  },
  errorText: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: 12,
  },
  submitRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  primaryBtn: {
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  primaryBtnText: {
    fontSize: 16,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
    gap: 12,
  },
  line: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 13,
  },
  secondaryBtn: {
    height: 56,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: {
    fontSize: 15,
  },
  footer: {
    marginTop: "auto",
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
  demoBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
    gap: 12,
  },
  demoIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  demoBannerTitle: {
    fontSize: 13,
    marginBottom: 2,
  },
  demoBannerText: {
    fontSize: 11,
    lineHeight: 16,
  },
  socialDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 16,
    gap: 12,
  },
  socialRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 8,
  },
  socialBtn: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  socialBtnText: {
    fontSize: 14,
  },
});
