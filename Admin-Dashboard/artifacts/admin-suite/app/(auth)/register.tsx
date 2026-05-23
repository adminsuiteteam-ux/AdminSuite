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

const ROLES = [
  { id: "admin", label: "Admin", icon: "shield" },
  { id: "manager", label: "Manager", icon: "briefcase" },
  { id: "hr", label: "HR", icon: "users" },
];

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("admin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async () => {
    setError("");
    if (!name.trim()) return setError("Enter your full name");
    if (!email.includes("@")) return setError("Enter a valid email");
    if (password.length < 6) return setError("Password must be 6+ characters");

    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    await login({ email, name, role });
    setLoading(false);
    router.replace("/tour");
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
              Create your account
            </Text>
            <Text style={[styles.sub, { fontFamily: "Inter_400Regular" }]}>
              Start managing employees, clients, projects and finances
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
            Full name
          </Text>
          <View
            style={[
              styles.inputWrap,
              { borderColor: colors.border, borderRadius: colors.radius },
            ]}
          >
            <Feather name="user" size={16} color={colors.mutedForeground} />
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Jane Doe"
              placeholderTextColor={colors.mutedForeground}
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
              placeholder="At least 6 characters"
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry
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
                marginTop: 18,
              },
            ]}
          >
            Choose your role
          </Text>
          <View style={styles.roleRow}>
            {ROLES.map((r) => {
              const active = role === r.id;
              return (
                <Pressable
                  key={r.id}
                  onPress={() => setRole(r.id)}
                  style={[
                    styles.roleChip,
                    {
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active
                        ? colors.primary + "12"
                        : colors.background,
                      borderRadius: colors.radius,
                    },
                  ]}
                >
                  <Feather
                    name={r.icon as any}
                    size={16}
                    color={active ? colors.primary : colors.mutedForeground}
                  />
                  <Text
                    style={{
                      color: active ? colors.primary : colors.foreground,
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 13,
                    }}
                  >
                    {r.label}
                  </Text>
                </Pressable>
              );
            })}
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

          <View style={{ marginTop: 22 }}>
            <PrimaryButton
              label="Create account"
              onPress={onSubmit}
              loading={loading}
            />
          </View>

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
  roleRow: { flexDirection: "row", gap: 10 },
  roleChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderWidth: 1.5,
  },
  errorWrap: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
  },
});
