import { Feather } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LogoMark } from "@/components/Brand";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function LockScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { logout, user } = useAuth();
  const [authenticating, setAuthenticating] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess] = useState(false);

  const triggerBiometricAuth = async () => {
    if (authenticating || success) return;
    setAuthenticating(true);
    setErrorMsg("");

    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        setErrorMsg("Biometrics not available or configured on this device.");
        setAuthenticating(false);
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock Admin Suite",
        fallbackLabel: "Use Password",
        disableDeviceFallback: false,
      });

      if (result.success) {
        setSuccess(true);
        if (user?.role === 'employee') {
          router.replace("/(employee)");
        } else {
          router.replace("/(tabs)");
        }
      } else {
        setErrorMsg(result.error || "Authentication failed.");
      }
    } catch (err: any) {
      setErrorMsg("An error occurred during authentication.");
    } finally {
      setAuthenticating(false);
    }
  };

  useEffect(() => {
    // Automatically trigger biometrics on mount (with a small timeout to let transition finish)
    const t = setTimeout(() => {
      triggerBiometricAuth();
    }, 300);
    return () => clearTimeout(t);
  }, []);

  const handleUsePassword = async () => {
    // Logging out returns user to standard login where they can use password
    await logout();
    router.replace("/(auth)/login");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.content, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 40 }]}>
        <View style={styles.header}>
          <View style={[styles.logoChip, { backgroundColor: colors.foreground }]}>
            <LogoMark size={32} tint={colors.background} />
          </View>
          <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            App Locked
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Verify your identity to open Admin Suite
          </Text>
        </View>

        <View style={styles.actionArea}>
          {authenticating ? (
            <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
          ) : (
            <Pressable
              onPress={triggerBiometricAuth}
              style={({ pressed }) => [
                styles.fingerprintBtn,
                {
                  backgroundColor: colors.card,
                  borderColor: errorMsg ? colors.danger : colors.border,
                  transform: [{ scale: pressed ? 0.94 : 1 }],
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <Feather
                name="shield"
                size={40}
                color={errorMsg ? colors.danger : colors.primary}
              />
              <Text
                style={[
                  styles.tapToUnlock,
                  {
                    color: errorMsg ? colors.danger : colors.foreground,
                    fontFamily: "Inter_600SemiBold",
                  },
                ]}
              >
                Tap to Unlock
              </Text>
            </Pressable>
          )}

          {errorMsg ? (
            <Text style={[styles.errorText, { color: colors.danger, fontFamily: "Inter_500Medium" }]}>
              {errorMsg}
            </Text>
          ) : null}
        </View>

        <Pressable
          onPress={handleUsePassword}
          style={({ pressed }) => [
            styles.usePasswordBtn,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              transform: [{ scale: pressed ? 0.97 : 1 }],
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <Text style={[styles.usePasswordText, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
            Use Password / Sign Out
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
    alignItems: "center",
  },
  header: {
    alignItems: "center",
    marginTop: 40,
  },
  logoChip: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
  },
  title: {
    fontSize: 26,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  actionArea: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingVertical: 20,
  },
  fingerprintBtn: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    gap: 8,
  },
  tapToUnlock: {
    fontSize: 12,
  },
  loader: {
    height: 140,
  },
  errorText: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 16,
    paddingHorizontal: 20,
  },
  usePasswordBtn: {
    width: "100%",
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  usePasswordText: {
    fontSize: 15,
  },
});
