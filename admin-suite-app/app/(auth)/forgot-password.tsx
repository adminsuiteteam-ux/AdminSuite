import { Feather } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

export default function ForgotPasswordScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async () => {
    if (!email.includes("@")) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    setSent(true);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backBtn,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              transform: [{ scale: pressed ? 0.92 : 1 }],
              opacity: pressed ? 0.8 : 1,
            },
          ]}
          hitSlop={10}
        >
          <Feather name="chevron-left" size={22} color={colors.foreground} />
        </Pressable>
      </View>

      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <Feather name="key" size={28} color="#ffffff" />
        </View>

        <Text style={[styles.title, { fontFamily: "Inter_700Bold", color: colors.foreground }]}>
          Forgot Password?
        </Text>
        <Text style={[styles.subtitle, { fontFamily: "Inter_400Regular", color: colors.mutedForeground }]}>
          {sent
            ? "We've sent a password reset link to your email address."
            : "No worries, we'll send you reset instructions. Enter your email below."}
        </Text>

        {!sent ? (
          <View style={styles.form}>
            <View style={[styles.inputWrap, { backgroundColor: colors.input }]}>
              <View style={styles.inputIcon}>
                <Feather name="mail" size={14} color="#ffffff" />
              </View>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                keyboardType="email-address"
                style={[styles.input, { fontFamily: "Inter_500Medium", color: colors.foreground }]}
              />
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                {
                  opacity: pressed || loading ? 0.85 : 1,
                  transform: [{ scale: pressed && !loading ? 0.96 : 1 }],
                },
              ]}
              onPress={onSubmit}
              disabled={loading || !email}
            >
              <Text style={[styles.primaryBtnText, { fontFamily: "Inter_600SemiBold" }]}>
                {loading ? "Sending..." : "Reset Password"}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.form}>
            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                {
                  opacity: pressed ? 0.85 : 1,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                },
              ]}
              onPress={() => router.replace("/(auth)/login")}
            >
              <Text style={[styles.primaryBtnText, { fontFamily: "Inter_600SemiBold" }]}>
                Back to log in
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
    paddingBottom: 100,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "#0a0a0a",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 32,
  },
  form: {
    width: "100%",
    gap: 16,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    height: 56,
    paddingHorizontal: 16,
    gap: 12,
  },
  inputIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#0a0a0a",
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    fontSize: 15,
  },
  primaryBtn: {
    backgroundColor: "#0a0a0a",
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  primaryBtnText: {
    color: "#ffffff",
    fontSize: 16,
  },
});
