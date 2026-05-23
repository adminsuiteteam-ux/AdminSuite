import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Link, router } from "expo-router";
import React, { useState } from "react";
import {
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

import { LogoMark } from "@/components/Brand";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signUpWithClerk, verifyClerkEmailCode } = useAuth();

  const [step, setStep] = useState<"credentials" | "code">("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleCreateAccount = async () => {
    setError("");
    setSuccess("");

    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await signUpWithClerk(email.trim().toLowerCase(), password);
      setSuccess("Verification code sent to your email!");
      setStep("code");
    } catch (err: any) {
      const clerkErrors = err?.errors;
      if (clerkErrors && clerkErrors.length > 0) {
        setError(clerkErrors[0].longMessage || clerkErrors[0].message || "Sign up failed.");
      } else {
        setError(err.message || "Failed to create account. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setError("");
    setSuccess("");

    if (code.length !== 6) {
      setError("Please enter the 6-digit verification code.");
      return;
    }

    setLoading(true);
    try {
      await verifyClerkEmailCode(email.trim().toLowerCase(), code, password);
      // After verification, AuthContext login sets user with profile_complete
      // Navigate to splash gate which routes to complete-profile
      router.replace("/");
    } catch (err: any) {
      const clerkErrors = err?.errors;
      if (clerkErrors && clerkErrors.length > 0) {
        setError(clerkErrors[0].longMessage || clerkErrors[0].message || "Verification failed.");
      } else {
        setError(err.message || "Invalid or expired verification code.");
      }
    } finally {
      setLoading(false);
    }
  };

  const getSubtext = () => {
    switch (step) {
      case "code":
        return `We've sent a 6-digit code to ${email}`;
      default:
        return "Start managing employees, clients, projects and finances";
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <LinearGradient
            colors={["#312e81", "#4f46e5"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.headerInner}>
            <View style={styles.logoChip}>
              <LogoMark size={32} tint="#ffffff" />
            </View>
            <Text style={[styles.welcome, { fontFamily: "Inter_700Bold" }]}>
              {step === "code" ? "Verify Your Email" : "Create Account"}
            </Text>
            <Text style={[styles.sub, { fontFamily: "Inter_400Regular" }]}>
              {getSubtext()}
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.background }]}>
          {step === "credentials" && (
            <View>
              <Text
                style={[
                  styles.label,
                  { color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
                ]}
              >
                Email address
              </Text>
              <View
                style={[
                  styles.inputWrap,
                  { borderColor: colors.border, borderRadius: colors.radius },
                ]}
              >
                <Feather name="mail" size={16} color={colors.mutedForeground} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@company.com"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={[
                    styles.input,
                    { color: colors.foreground, fontFamily: "Inter_500Medium" },
                  ]}
                />
              </View>

              <Text
                style={[
                  styles.label,
                  {
                    color: colors.mutedForeground,
                    fontFamily: "Inter_500Medium",
                    marginTop: 16,
                  },
                ]}
              >
                Password
              </Text>
              <View
                style={[
                  styles.inputWrap,
                  { borderColor: colors.border, borderRadius: colors.radius },
                ]}
              >
                <Feather name="lock" size={16} color={colors.mutedForeground} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="At least 8 characters"
                  placeholderTextColor={colors.mutedForeground}
                  secureTextEntry={!showPwd}
                  style={[
                    styles.input,
                    { color: colors.foreground, fontFamily: "Inter_500Medium" },
                  ]}
                />
                <Pressable onPress={() => setShowPwd((s) => !s)} hitSlop={10}>
                  <Feather
                    name={showPwd ? "eye-off" : "eye"}
                    size={16}
                    color={colors.mutedForeground}
                  />
                </Pressable>
              </View>

              <Text
                style={[
                  styles.label,
                  {
                    color: colors.mutedForeground,
                    fontFamily: "Inter_500Medium",
                    marginTop: 16,
                  },
                ]}
              >
                Confirm Password
              </Text>
              <View
                style={[
                  styles.inputWrap,
                  { borderColor: colors.border, borderRadius: colors.radius },
                ]}
              >
                <Feather name="lock" size={16} color={colors.mutedForeground} />
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Re-enter your password"
                  placeholderTextColor={colors.mutedForeground}
                  secureTextEntry={!showConfirmPwd}
                  style={[
                    styles.input,
                    { color: colors.foreground, fontFamily: "Inter_500Medium" },
                  ]}
                />
                <Pressable onPress={() => setShowConfirmPwd((s) => !s)} hitSlop={10}>
                  <Feather
                    name={showConfirmPwd ? "eye-off" : "eye"}
                    size={16}
                    color={colors.mutedForeground}
                  />
                </Pressable>
              </View>

              <View style={{ marginTop: 22 }}>
                <PrimaryButton
                  label="Create Account"
                  onPress={handleCreateAccount}
                  loading={loading}
                />
              </View>
            </View>
          )}

          {step === "code" && (
            <View>
              <Text
                style={[
                  styles.label,
                  { color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
                ]}
              >
                Verification Code
              </Text>
              <View
                style={[
                  styles.inputWrap,
                  { borderColor: colors.border, borderRadius: colors.radius },
                ]}
              >
                <Feather name="key" size={16} color={colors.mutedForeground} />
                <TextInput
                  value={code}
                  onChangeText={setCode}
                  placeholder="123456"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="number-pad"
                  maxLength={6}
                  style={[
                    styles.input,
                    { color: colors.foreground, fontFamily: "Inter_500Medium", letterSpacing: 4 },
                  ]}
                />
              </View>

              <View style={{ marginTop: 22 }}>
                <PrimaryButton
                  label="Verify & Create Account"
                  onPress={handleVerifyCode}
                  loading={loading}
                />
              </View>

              <Pressable
                onPress={() => {
                  setError("");
                  setSuccess("");
                  setCode("");
                  setStep("credentials");
                }}
                style={[styles.actionLink, { alignSelf: "center", marginTop: 16 }]}
              >
                <Text style={[styles.linkText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                  ← Back to Sign Up
                </Text>
              </Pressable>
            </View>
          )}

          {error ? (
            <View
              style={[
                styles.errorWrap,
                { backgroundColor: colors.danger + "15" },
              ]}
            >
              <Feather name="alert-circle" size={14} color={colors.danger} />
              <Text
                style={{
                  color: colors.danger,
                  fontFamily: "Inter_500Medium",
                  fontSize: 13,
                  flex: 1,
                }}
              >
                {error}
              </Text>
            </View>
          ) : null}

          {success ? (
            <View
              style={[
                styles.successWrap,
                { backgroundColor: "#10b98115" },
              ]}
            >
              <Feather name="check-circle" size={14} color="#10b981" />
              <Text
                style={{
                  color: "#10b981",
                  fontFamily: "Inter_500Medium",
                  fontSize: 13,
                  flex: 1,
                }}
              >
                {success}
              </Text>
            </View>
          ) : null}

          <View style={styles.footer}>
            <Text
              style={{
                color: colors.mutedForeground,
                fontFamily: "Inter_400Regular",
              }}
            >
              Already have an account?{" "}
            </Text>
            <Link href="/(auth)/login" asChild>
              <Pressable hitSlop={6}>
                <Text
                  style={{
                    color: colors.primary,
                    fontFamily: "Inter_600SemiBold",
                  }}
                >
                  Sign in
                </Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingBottom: 80,
    paddingHorizontal: 24,
    overflow: "hidden",
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerInner: { gap: 14 },
  logoChip: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  welcome: {
    color: "#fff",
    fontSize: 26,
    letterSpacing: -0.5,
    marginTop: 8,
  },
  sub: { color: "rgba(255,255,255,0.75)", fontSize: 14 },
  card: {
    marginTop: -56,
    marginHorizontal: 20,
    padding: 24,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  label: {
    fontSize: 12,
    marginBottom: 6,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    height: 50,
    borderWidth: 1,
  },
  input: { flex: 1, fontSize: 15 },
  errorWrap: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
  },
  successWrap: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
  },
  actionLink: {
    paddingVertical: 4,
  },
  linkText: {
    fontSize: 14,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
});
