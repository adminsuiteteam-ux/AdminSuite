import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState, useRef, useCallback, useEffect } from "react";
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
import { apiService } from "../../services/api";
import { shadows, spacing, motion } from "@/constants/theme";

export default function EmployeeSetupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, setUser } = useAuth();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [passFocused, setPassFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);

  // Focus glow animations
  const passGlow = useRef(new Animated.Value(0)).current;
  const confirmGlow = useRef(new Animated.Value(0)).current;
  const btnPressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(passGlow, {
      toValue: passFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [passFocused]);

  useEffect(() => {
    Animated.timing(confirmGlow, {
      toValue: confirmFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [confirmFocused]);

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

  const onSubmit = async () => {
    setError("");
    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await apiService.updateMe({ password });
      
      // Update local state
      if (user) {
        setUser({ ...user, is_first_login: false });
      }

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      
      // Redirect
      router.replace("/");
    } catch (err: any) {
      const errorData = err.response?.data;
      setError(
        errorData?.password?.[0] || 
        errorData?.message || 
        err.message || 
        "Failed to update password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const passBorderColor = passGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.inputGlassBorder, colors.accent],
  });
  const passShadowOpacity = passGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.15],
  });

  const confirmBorderColor = confirmGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.inputGlassBorder, colors.accent],
  });
  const confirmShadowOpacity = confirmGlow.interpolate({
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
              Secure Account
            </Text>
            <Text style={[styles.subtitle, { fontFamily: "Inter_400Regular", color: colors.mutedForeground }]}>
              Welcome! Please choose a new secure{"\n"}password for your profile.
            </Text>
          </View>

          <View style={styles.form}>
            {/* ── Password Input (Glass) ── */}
            <Animated.View
              style={[
                styles.inputWrap,
                {
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
                placeholder="New Password"
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

            {/* ── Confirm Password Input (Glass) ── */}
            <Animated.View
              style={[
                styles.inputWrap,
                {
                  marginTop: 12,
                  backgroundColor: colors.inputGlass,
                  borderColor: confirmBorderColor,
                  borderWidth: 1.5,
                  shadowColor: colors.accent,
                  shadowOpacity: confirmShadowOpacity,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 0 },
                },
              ]}
            >
              <View style={[styles.iconCircle, { backgroundColor: colors.primary }]}>
                <Feather name="lock" size={14} color={colors.primaryForeground} />
              </View>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                onFocus={() => setConfirmFocused(true)}
                onBlur={() => setConfirmFocused(false)}
                placeholder="Confirm Password"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry={!showPwd}
                style={[styles.input, { fontFamily: "Inter_500Medium", color: colors.text }]}
              />
            </Animated.View>

            {error ? (
              <Text style={[styles.errorText, { fontFamily: "Inter_500Medium", color: colors.danger }]}>
                {error}
              </Text>
            ) : null}

            {/* ── Submit Button ── */}
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
                    {loading ? "Updating..." : "Save and Continue"}
                  </Text>
                </Animated.View>
              </Pressable>
            </View>
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
  errorText: {
    fontSize: 13,
    textAlign: "center",
    marginVertical: 12,
  },
  submitRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    marginTop: 20,
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
});
