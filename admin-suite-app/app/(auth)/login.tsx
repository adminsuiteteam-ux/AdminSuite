import { Feather } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import { Link, router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
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

import { LogoMark } from "../../components/Brand";
import { useAuth } from "../../context/AuthContext";
import { useColors } from "../../hooks/useColors";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login, tourComplete, user } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [hasStoredCredentials, setHasStoredCredentials] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        setIsBiometricSupported(hasHardware && isEnrolled);
        
        const storedUser = await SecureStore.getItemAsync("admin-suite.username");
        const storedPass = await SecureStore.getItemAsync("admin-suite.password");
        setHasStoredCredentials(!!(storedUser && storedPass));
      } catch (e) {
        // Biometric check unavailable
      }
    })();
  }, []);

  const handleBiometricLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Sign in with Biometrics",
        fallbackLabel: "Use Password",
        disableDeviceFallback: false,
      });

      if (result.success) {
        const u = await SecureStore.getItemAsync("admin-suite.username");
        const p = await SecureStore.getItemAsync("admin-suite.password");
        if (u && p) {
          await login({ username: u, password: p });
          navigateAfterLogin();
        } else {
          setError("No credentials found. Please sign in with password first.");
        }
      } else {
        setError("Biometric authentication failed.");
      }
    } catch (err: any) {
      setError("Biometric sign-in failed. Please use your password.");
    } finally {
      setLoading(false);
    }
  };

  const navigateAfterLogin = () => {
    // user object may not be updated yet — rely on the freshest state from context
    // The index.tsx splash gate handles profile_complete + tour routing.
    // After login, we go to the splash gate which re-evaluates routing.
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
      const clerkErrors = err?.errors;
      if (clerkErrors && clerkErrors.length > 0) {
        setError(clerkErrors[0].longMessage || clerkErrors[0].message || "Invalid credentials.");
      } else {
        setError(err.response?.data?.non_field_errors?.[0] || err.message || "Invalid credentials. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
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

          <View style={styles.form}>
            <View style={[styles.inputWrap, { backgroundColor: colors.muted }]}>
              <View style={[styles.iconCircle, { backgroundColor: colors.primary }]}>
                <Feather name="mail" size={14} color={colors.primaryForeground} />
              </View>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email address"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                keyboardType="email-address"
                style={[styles.input, { fontFamily: "Inter_500Medium", color: colors.text }]}
              />
            </View>

            <View style={[styles.inputWrap, { marginTop: 12, backgroundColor: colors.muted }]}>
              <View style={[styles.iconCircle, { backgroundColor: colors.primary }]}>
                <Feather name="lock" size={14} color={colors.primaryForeground} />
              </View>
              <TextInput
                value={password}
                onChangeText={setPassword}
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
            </View>

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

            <View style={styles.submitRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { flex: 1, opacity: pressed || loading ? 0.8 : 1, backgroundColor: colors.primary },
                ]}
                onPress={onSubmit}
                disabled={loading}
              >
                <Text style={[styles.primaryBtnText, { fontFamily: "Inter_600SemiBold", color: colors.primaryForeground }]}>
                  {loading ? "Signing in..." : "Continue"}
                </Text>
              </Pressable>

              {isBiometricSupported && hasStoredCredentials && (
                <Pressable
                  onPress={handleBiometricLogin}
                  disabled={loading}
                  style={({ pressed }) => [
                    styles.biometricBtn,
                    { opacity: pressed || loading ? 0.7 : 1, backgroundColor: colors.muted, borderColor: colors.border },
                  ]}
                >
                  <Feather name="shield" size={24} color={colors.text} />
                </Pressable>
              )}
            </View>

            <View style={styles.divider}>
              <View style={[styles.line, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { fontFamily: "Inter_400Regular", color: colors.mutedForeground }]}>
                Don't have an account yet?
              </Text>
              <View style={[styles.line, { backgroundColor: colors.border }]} />
            </View>

            <Link href="/(auth)/register" asChild>
              <Pressable style={[styles.secondaryBtn, { backgroundColor: colors.muted }]}>
                <Text style={[styles.secondaryBtnText, { fontFamily: "Inter_500Medium", color: colors.text }]}>
                  Create an account
                </Text>
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
  biometricBtn: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  primaryBtn: {
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
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
});
