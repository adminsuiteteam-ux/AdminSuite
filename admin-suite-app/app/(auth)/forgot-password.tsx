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
import { useToast } from "@/context/ToastContext";
import { apiService } from "@/services/api";

type Stage = "email" | "otp" | "new-password";

export default function ForgotPasswordScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  const [stage, setStage] = useState<Stage>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  const handleSendCode = async () => {
    if (!email.includes("@")) {
      showToast({ title: "Error", message: "Please enter a valid email address.", type: "error" });
      return;
    }
    setLoading(true);
    try {
      const res = await apiService.sendPasswordResetCode({ email: email.trim().toLowerCase() });
      showToast({
        title: "Code Sent",
        message: res.data.message || "A 6-digit OTP has been sent to your email.",
        type: "success",
      });
      // Dev helper notice if code is returned in dev mode
      if (res.data.code) {
        console.log("DEV RESET CODE:", res.data.code);
        showToast({
          title: "[DEV MODE] Code",
          message: `OTP is: ${res.data.code}`,
          type: "info",
        });
      }
      setStage("otp");
    } catch (err: any) {
      showToast({
        title: "Failed to Send",
        message: err.response?.data?.error || err.message || "Something went wrong.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (code.length !== 6) {
      showToast({ title: "Error", message: "OTP must be exactly 6 digits.", type: "error" });
      return;
    }
    setLoading(true);
    try {
      await apiService.verifyPasswordResetCode({
        email: email.trim().toLowerCase(),
        code: code.trim(),
      });
      showToast({
        title: "Verified",
        message: "Code verified successfully.",
        type: "success",
      });
      setStage("new-password");
    } catch (err: any) {
      showToast({
        title: "Verification Failed",
        message: err.response?.data?.error || err.message || "Invalid OTP code.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 8) {
      showToast({ title: "Error", message: "Password must be at least 8 characters.", type: "error" });
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      showToast({ title: "Error", message: "Password must contain at least one capital letter (A-Z).", type: "error" });
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      showToast({ title: "Error", message: "Password must contain at least one number (0-9).", type: "error" });
      return;
    }
    if (!/[!@#]/.test(newPassword)) {
      showToast({ title: "Error", message: "Password must contain at least one special character (! @ #).", type: "error" });
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast({ title: "Error", message: "Passwords do not match.", type: "error" });
      return;
    }
    setLoading(true);
    try {
      await apiService.confirmPasswordReset({
        email: email.trim().toLowerCase(),
        code: code.trim(),
        new_password: newPassword,
      });
      showToast({
        title: "Success",
        message: "Password reset successfully. You can now log in.",
        type: "success",
      });
      router.replace("/(auth)/login");
    } catch (err: any) {
      showToast({
        title: "Reset Failed",
        message: err.response?.data?.error || err.message || "Could not reset password.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    switch (stage) {
      case "email":
        return (
          <>
            <View style={styles.iconCircle}>
              <Feather name="mail" size={28} color="#ffffff" />
            </View>
            <Text style={[styles.title, { fontFamily: "Inter_700Bold", color: colors.foreground }]}>
              Password Recovery
            </Text>
            <Text style={[styles.subtitle, { fontFamily: "Inter_400Regular", color: colors.mutedForeground }]}>
              Enter the email address you registered with to receive a 6-digit verification code.
            </Text>
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
                onPress={handleSendCode}
                disabled={loading || !email}
              >
                <Text style={[styles.primaryBtnText, { fontFamily: "Inter_600SemiBold" }]}>
                  {loading ? "Sending Code..." : "Send Verification Code"}
                </Text>
              </Pressable>
            </View>
          </>
        );

      case "otp":
        return (
          <>
            <View style={styles.iconCircle}>
              <Feather name="key" size={28} color="#ffffff" />
            </View>
            <Text style={[styles.title, { fontFamily: "Inter_700Bold", color: colors.foreground }]}>
              Enter OTP
            </Text>
            <Text style={[styles.subtitle, { fontFamily: "Inter_400Regular", color: colors.mutedForeground }]}>
              Please enter the 6-digit OTP code sent to {email}.
            </Text>
            <View style={styles.form}>
              <View style={[styles.inputWrap, { backgroundColor: colors.input }]}>
                <View style={styles.inputIcon}>
                  <Feather name="lock" size={14} color="#ffffff" />
                </View>
                <TextInput
                  value={code}
                  onChangeText={setCode}
                  placeholder="6-digit code"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="number-pad"
                  maxLength={6}
                  style={[styles.input, { fontFamily: "Inter_500Medium", color: colors.foreground, letterSpacing: 4 }]}
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
                onPress={handleVerifyCode}
                disabled={loading || code.length !== 6}
              >
                <Text style={[styles.primaryBtnText, { fontFamily: "Inter_600SemiBold" }]}>
                  {loading ? "Verifying..." : "Verify Code"}
                </Text>
              </Pressable>
              <Pressable
                style={{ alignSelf: "center", marginTop: 8 }}
                onPress={() => setStage("email")}
              >
                <Text style={{ fontFamily: "Inter_500Medium", color: colors.primary, fontSize: 14 }}>
                  Change Email
                </Text>
              </Pressable>
            </View>
          </>
        );

      case "new-password":
        return (
          <>
            <View style={styles.iconCircle}>
              <Feather name="lock" size={28} color="#ffffff" />
            </View>
            <Text style={[styles.title, { fontFamily: "Inter_700Bold", color: colors.foreground }]}>
              New Password
            </Text>
            <Text style={[styles.subtitle, { fontFamily: "Inter_400Regular", color: colors.mutedForeground }]}>
              Enter a secure new password for your account.
            </Text>
            <View style={styles.form}>
              <View style={[styles.inputWrap, { backgroundColor: colors.input }]}>
                <View style={styles.inputIcon}>
                  <Feather name="lock" size={14} color="#ffffff" />
                </View>
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="e.g. #Password2431"
                  placeholderTextColor={colors.mutedForeground}
                  secureTextEntry={!showPwd}
                  autoCapitalize="none"
                  style={[styles.input, { fontFamily: "Inter_500Medium", color: colors.foreground }]}
                />
                <Pressable onPress={() => setShowPwd(!showPwd)} hitSlop={10}>
                  <Feather name={showPwd ? "eye-off" : "eye"} size={16} color={colors.mutedForeground} />
                </Pressable>
              </View>

              <View style={[styles.inputWrap, { backgroundColor: colors.input, marginTop: 4 }]}>
                <View style={styles.inputIcon}>
                  <Feather name="check-square" size={14} color="#ffffff" />
                </View>
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm new password"
                  placeholderTextColor={colors.mutedForeground}
                  secureTextEntry={!showConfirmPwd}
                  autoCapitalize="none"
                  style={[styles.input, { fontFamily: "Inter_500Medium", color: colors.foreground }]}
                />
                <Pressable onPress={() => setShowConfirmPwd(!showConfirmPwd)} hitSlop={10}>
                  <Feather name={showConfirmPwd ? "eye-off" : "eye"} size={16} color={colors.mutedForeground} />
                </Pressable>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.primaryBtn,
                  {
                    opacity: pressed || loading ? 0.85 : 1,
                    transform: [{ scale: pressed && !loading ? 0.96 : 1 }],
                  },
                ]}
                onPress={handleResetPassword}
                disabled={loading || !newPassword || !confirmPassword}
              >
                <Text style={[styles.primaryBtnText, { fontFamily: "Inter_600SemiBold" }]}>
                  {loading ? "Resetting..." : "Reset Password"}
                </Text>
              </Pressable>
            </View>
          </>
        );
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable
          onPress={() => {
            if (stage === "otp") setStage("email");
            else if (stage === "new-password") setStage("otp");
            else router.back();
          }}
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
        {renderContent()}
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
