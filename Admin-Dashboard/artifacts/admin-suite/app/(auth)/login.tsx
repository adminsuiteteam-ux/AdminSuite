import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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

import { LogoMark } from "@/components/Brand";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login, tourComplete } = useAuth();

  const [email, setEmail] = useState("admin@adminsuite.app");
  const [password, setPassword] = useState("••••••••");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async () => {
    setError("");
    if (!email.includes("@")) {
      setError("Enter a valid email");
      return;
    }
    if (!password || password.length < 4) {
      setError("Password is too short");
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    await login({ email, role: "admin" });
    setLoading(false);
    router.replace(tourComplete ? "/(tabs)" : "/tour");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}
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
            Welcome back
          </Text>
          <Text style={[styles.sub, { fontFamily: "Inter_400Regular" }]}>
            Sign in to continue managing your company
          </Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.background }]}>
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
            placeholder="Enter your password"
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

        <View style={styles.row}>
          <Pressable hitSlop={6}>
            <Text
              style={{
                color: colors.primary,
                fontFamily: "Inter_600SemiBold",
                fontSize: 13,
              }}
            >
              Forgot password?
            </Text>
          </Pressable>
        </View>

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
              }}
            >
              {error}
            </Text>
          </View>
        ) : null}

        <View style={{ marginTop: 20 }}>
          <PrimaryButton label="Sign in" onPress={onSubmit} loading={loading} />
        </View>

        <View style={styles.divider}>
          <View style={[styles.line, { backgroundColor: colors.border }]} />
          <Text
            style={{
              color: colors.mutedForeground,
              fontFamily: "Inter_500Medium",
              fontSize: 12,
            }}
          >
            OR
          </Text>
          <View style={[styles.line, { backgroundColor: colors.border }]} />
        </View>

        <View style={styles.footer}>
          <Text
            style={{
              color: colors.mutedForeground,
              fontFamily: "Inter_400Regular",
            }}
          >
            New to Admin Suite?{" "}
          </Text>
          <Link href="/(auth)/register" asChild>
            <Pressable hitSlop={6}>
              <Text
                style={{
                  color: colors.primary,
                  fontFamily: "Inter_600SemiBold",
                }}
              >
                Create account
              </Text>
            </Pressable>
          </Link>
        </View>
      </View>
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
  headerInner: {
    gap: 14,
  },
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
    fontSize: 28,
    letterSpacing: -0.5,
    marginTop: 8,
  },
  sub: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 14,
  },
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
  input: {
    flex: 1,
    fontSize: 15,
  },
  row: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
  },
  errorWrap: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 20,
  },
  line: {
    flex: 1,
    height: 1,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
  },
});
