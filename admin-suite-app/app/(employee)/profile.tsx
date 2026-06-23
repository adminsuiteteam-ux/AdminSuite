import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState, useRef, useCallback } from "react";
import {
  Alert,
  Animated,
  Image,
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
import * as LocalAuthentication from "expo-local-authentication";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useToast } from "@/context/ToastContext";
import { useSettings } from "@/context/SettingsContext";
import { apiService, appendFileToFormData, getMediaUrl } from "@/services/api";
import * as ImagePicker from "expo-image-picker";
import { spacing, motion, shadows } from "@/constants/theme";

type ThemeMode = "light" | "dark" | "system";

export default function EmployeeProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, setUser, logout } = useAuth();
  const { showToast } = useToast();
  const { theme, setTheme, biometricsEnabled, setBiometricsEnabled } = useSettings();

  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [location, setLocation] = useState(user?.location || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [photoUri, setPhotoUri] = useState<string | null>(user?.avatar ? getMediaUrl(user.avatar) : null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Animation values for input glow
  const nameGlow = useRef(new Animated.Value(0)).current;
  const phoneGlow = useRef(new Animated.Value(0)).current;
  const locGlow = useRef(new Animated.Value(0)).current;
  const bioGlow = useRef(new Animated.Value(0)).current;
  const passGlow = useRef(new Animated.Value(0)).current;
  const [btnPressAnim = new Animated.Value(0)] = useState(() => new Animated.Value(0));

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

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

  // ─── Prompt biometric enrolment after password change ───────────────────────
  const promptBiometricEnrolment = async () => {
    if (Platform.OS === "web") return;

    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!compatible || !enrolled) return;

    Alert.alert(
      "Enable Biometric Login",
      "Would you like to use Face ID / Fingerprint to unlock your account next time?",
      [
        { text: "Not Now", style: "cancel" },
        {
          text: "Enable",
          onPress: async () => {
            const result = await LocalAuthentication.authenticateAsync({
              promptMessage: "Verify your identity to enable biometric login",
              cancelLabel: "Cancel",
              disableDeviceFallback: false,
            });
            if (result.success) {
              setBiometricsEnabled(true);
              showToast({
                title: "Biometrics Enabled",
                message: "You can now unlock your account with Face ID / Fingerprint.",
                type: "success",
              });
            }
          },
        },
      ]
    );
  };

  const onSave = async () => {
    setError("");
    if (password) {
      if (password.length < 8) {
        setError("Password must be at least 8 characters long.");
        return;
      }
      if (!/[A-Z]/.test(password)) {
        setError("Password must contain at least one capital letter (A-Z).");
        return;
      }
      if (!/[0-9]/.test(password)) {
        setError("Password must contain at least one number (0-9).");
        return;
      }
      if (!/[!@#]/.test(password)) {
        setError("Password must contain at least one special character (! @ #).");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
    }

    setSaving(true);
    const didChangePassword = !!password;
    try {
      const formData = new FormData();
      formData.append("first_name", name);
      formData.append("phone", phone);
      formData.append("location", location);
      formData.append("bio", bio);

      if (password) {
        formData.append("password", password);
      }

      await appendFileToFormData(formData, "avatar", photoUri);

      const res = await apiService.updateMe(formData);
      const updatedUser = res.data;
      updatedUser.initials = (
        updatedUser.name || updatedUser.username || updatedUser.email || "US"
      )
        .slice(0, 2)
        .toUpperCase();

      setUser(updatedUser);
      setPassword("");
      setConfirmPassword("");

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }

      showToast({
        title: "Profile Updated",
        message: "Your changes have been saved successfully.",
        type: "success",
      });

      // Offer biometric enrolment only after a password change and not already enabled
      if (didChangePassword && !biometricsEnabled) {
        setTimeout(promptBiometricEnrolment, 600);
      }
    } catch (err: any) {
      const errorData = err.response?.data;
      setError(
        errorData?.message ||
          errorData?.password?.[0] ||
          err.message ||
          "Failed to update profile. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const getBorderColor = (anim: Animated.Value) => {
    return anim.interpolate({
      inputRange: [0, 1],
      outputRange: [colors.inputGlassBorder, colors.accent],
    });
  };

  const getShadowOpacity = (anim: Animated.Value) => {
    return anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.15],
    });
  };

  const btnTranslateY = btnPressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, motion.press.translateY],
  });
  const btnScale = btnPressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, motion.press.scale],
  });

  const tabBarPad = (Platform.OS === "web" ? 96 : 100) + 24;

  const THEME_OPTIONS: { id: ThemeMode; label: string; icon: keyof typeof Feather.glyphMap }[] = [
    { id: "light", label: "Light", icon: "sun" },
    { id: "dark", label: "Dark", icon: "moon" },
    { id: "system", label: "Auto", icon: "smartphone" },
  ];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        contentContainerStyle={{
          paddingBottom: tabBarPad,
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            My Profile
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Edit your profile details or change password
          </Text>
        </View>

        {/* ── Avatar initials / image ── */}
        <View style={styles.avatarRow}>
          <Pressable onPress={pickImage} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
            <View style={[styles.avatarCircle, { backgroundColor: colors.primary, overflow: "hidden" }]}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={{ width: "100%", height: "100%" }} />
              ) : (
                <Text style={[styles.avatarTxt, { fontFamily: "Inter_700Bold" }]}>
                  {user?.initials || "ME"}
                </Text>
              )}
            </View>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[styles.avatarName, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              {user?.name || user?.email}
            </Text>
            <Text style={[styles.avatarRole, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Employee
            </Text>
            <Pressable onPress={pickImage} hitSlop={10}>
              <Text style={{ color: colors.accent, fontFamily: "Inter_600SemiBold", fontSize: 13, marginTop: 4 }}>
                Change Profile Photo
              </Text>
            </Pressable>
          </View>
        </View>

        {/* ── Appearance ── */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
            Appearance
          </Text>
          <View style={styles.themeRow}>
            {THEME_OPTIONS.map((opt) => {
              const active = theme === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => setTheme(opt.id)}
                  style={({ pressed }) => [
                    styles.themeBtn,
                    {
                      backgroundColor: active ? colors.primary : colors.inputGlass,
                      borderColor: active ? colors.primary : colors.border,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <Feather
                    name={opt.icon}
                    size={16}
                    color={active ? colors.primaryForeground : colors.foreground}
                  />
                  <Text
                    style={[
                      styles.themeTxt,
                      {
                        color: active ? colors.primaryForeground : colors.foreground,
                        fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular",
                      },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.form}>
          {/* Full Name */}
          <Text style={[styles.inputLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
            Full Name
          </Text>
          <Animated.View
            style={[
              styles.inputWrap,
              {
                backgroundColor: colors.inputGlass,
                borderColor: getBorderColor(nameGlow),
                borderWidth: 1.5,
                shadowColor: colors.accent,
                shadowOpacity: getShadowOpacity(nameGlow),
                shadowRadius: 12,
              },
            ]}
          >
            <Feather name="user" size={14} color={colors.mutedForeground} />
            <TextInput
              value={name}
              onChangeText={setName}
              onFocus={() => nameGlow.setValue(1)}
              onBlur={() => nameGlow.setValue(0)}
              placeholder="Full Name"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { color: colors.text, fontFamily: "Inter_500Medium" }]}
            />
          </Animated.View>

          {/* Phone Number */}
          <Text style={[styles.inputLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium", marginTop: 16 }]}>
            Phone Number
          </Text>
          <Animated.View
            style={[
              styles.inputWrap,
              {
                backgroundColor: colors.inputGlass,
                borderColor: getBorderColor(phoneGlow),
                borderWidth: 1.5,
                shadowColor: colors.accent,
                shadowOpacity: getShadowOpacity(phoneGlow),
                shadowRadius: 12,
              },
            ]}
          >
            <Feather name="phone" size={14} color={colors.mutedForeground} />
            <TextInput
              value={phone}
              onChangeText={setPhone}
              onFocus={() => phoneGlow.setValue(1)}
              onBlur={() => phoneGlow.setValue(0)}
              placeholder="Phone Number"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="phone-pad"
              style={[styles.input, { color: colors.text, fontFamily: "Inter_500Medium" }]}
            />
          </Animated.View>

          {/* Location */}
          <Text style={[styles.inputLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium", marginTop: 16 }]}>
            Location
          </Text>
          <Animated.View
            style={[
              styles.inputWrap,
              {
                backgroundColor: colors.inputGlass,
                borderColor: getBorderColor(locGlow),
                borderWidth: 1.5,
                shadowColor: colors.accent,
                shadowOpacity: getShadowOpacity(locGlow),
                shadowRadius: 12,
              },
            ]}
          >
            <Feather name="map-pin" size={14} color={colors.mutedForeground} />
            <TextInput
              value={location}
              onChangeText={setLocation}
              onFocus={() => locGlow.setValue(1)}
              onBlur={() => locGlow.setValue(0)}
              placeholder="Office Location"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { color: colors.text, fontFamily: "Inter_500Medium" }]}
            />
          </Animated.View>

          {/* Bio */}
          <Text style={[styles.inputLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium", marginTop: 16 }]}>
            Bio Description
          </Text>
          <Animated.View
            style={[
              styles.inputWrap,
              styles.textArea,
              {
                backgroundColor: colors.inputGlass,
                borderColor: getBorderColor(bioGlow),
                borderWidth: 1.5,
                shadowColor: colors.accent,
                shadowOpacity: getShadowOpacity(bioGlow),
                shadowRadius: 12,
              },
            ]}
          >
            <TextInput
              value={bio}
              onChangeText={setBio}
              onFocus={() => bioGlow.setValue(1)}
              onBlur={() => bioGlow.setValue(0)}
              placeholder="Write a brief bio about your role..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={4}
              style={[styles.input, { color: colors.text, fontFamily: "Inter_500Medium", height: 80 }]}
            />
          </Animated.View>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Password Updates */}
          <Text style={[styles.inputLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
            Change Password (Optional)
          </Text>
          <Animated.View
            style={[
              styles.inputWrap,
              {
                backgroundColor: colors.inputGlass,
                borderColor: getBorderColor(passGlow),
                borderWidth: 1.5,
                shadowColor: colors.accent,
                shadowOpacity: getShadowOpacity(passGlow),
                shadowRadius: 12,
              },
            ]}
          >
            <Feather name="lock" size={14} color={colors.mutedForeground} />
            <TextInput
              value={password}
              onChangeText={setPassword}
              onFocus={() => passGlow.setValue(1)}
              onBlur={() => passGlow.setValue(0)}
              placeholder="New Password"
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry={!showPass}
              style={[styles.input, { color: colors.text, fontFamily: "Inter_500Medium" }]}
            />
            <Pressable onPress={() => setShowPass((v) => !v)} hitSlop={8}>
              <Feather name={showPass ? "eye-off" : "eye"} size={14} color={colors.mutedForeground} />
            </Pressable>
          </Animated.View>

          <Animated.View
            style={[
              styles.inputWrap,
              {
                marginTop: 12,
                backgroundColor: colors.inputGlass,
                borderColor: getBorderColor(passGlow),
                borderWidth: 1.5,
                shadowColor: colors.accent,
                shadowOpacity: getShadowOpacity(passGlow),
                shadowRadius: 12,
              },
            ]}
          >
            <Feather name="lock" size={14} color={colors.mutedForeground} />
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm New Password"
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry={!showConfirmPass}
              style={[styles.input, { color: colors.text, fontFamily: "Inter_500Medium" }]}
            />
            <Pressable onPress={() => setShowConfirmPass((v) => !v)} hitSlop={8}>
              <Feather name={showConfirmPass ? "eye-off" : "eye"} size={14} color={colors.mutedForeground} />
            </Pressable>
          </Animated.View>

          {/* Biometric status hint */}
          {biometricsEnabled && (
            <View style={[styles.bioHint, { backgroundColor: colors.success + "15", borderColor: colors.success + "40" }]}>
              <Feather name="shield" size={14} color={colors.success} />
              <Text style={[styles.bioHintText, { color: colors.success, fontFamily: "Inter_500Medium" }]}>
                Biometric login is enabled for this account
              </Text>
            </View>
          )}

          {error ? (
            <Text style={[styles.errorText, { color: colors.danger, fontFamily: "Inter_500Medium" }]}>
              {error}
            </Text>
          ) : null}

          {/* Save Button */}
          <View style={styles.submitRow}>
            <Pressable
              onPress={() => {
                if (Platform.OS !== "web") {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                }
                onSave();
              }}
              onPressIn={handleBtnPressIn}
              onPressOut={handleBtnPressOut}
              disabled={saving}
              style={{ flex: 1 }}
            >
              <Animated.View
                style={[
                  styles.primaryBtn,
                  {
                    backgroundColor: colors.primary,
                    opacity: saving ? 0.7 : 1,
                    transform: [{ translateY: btnTranslateY }, { scale: btnScale }],
                  },
                  shadows.btnResting,
                ]}
              >
                <Text style={[styles.primaryBtnText, { fontFamily: "Inter_600SemiBold", color: colors.primaryForeground }]}>
                  {saving ? "Saving Changes..." : "Save Profile"}
                </Text>
              </Animated.View>
            </Pressable>
          </View>

          {/* Sign Out Button */}
          <Pressable
            onPress={async () => {
              if (Platform.OS !== "web") {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
              }
              Alert.alert("Sign Out", "Are you sure you want to sign out?", [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Sign Out",
                  style: "destructive",
                  onPress: async () => {
                    await logout();
                    router.replace("/(auth)/login");
                  },
                },
              ]);
            }}
            style={({ pressed }) => [
              styles.logoutBtn,
              {
                borderColor: colors.danger,
                backgroundColor: colors.isDark ? "rgba(239, 68, 68, 0.1)" : "rgba(239, 68, 68, 0.05)",
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Feather name="log-out" size={16} color={colors.danger} />
            <Text style={[styles.logoutBtnText, { color: colors.danger, fontFamily: "Inter_600SemiBold" }]}>
              Sign Out
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 20 },
  title: { fontSize: 26, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, marginTop: 4 },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 20,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTxt: { color: "#fff", fontSize: 22 },
  avatarName: { fontSize: 16 },
  avatarRole: { fontSize: 13, marginTop: 2 },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: { fontSize: 14, marginBottom: 12 },
  themeRow: { flexDirection: "row", gap: 10 },
  themeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  themeTxt: { fontSize: 13 },
  form: { width: "100%" },
  inputLabel: {
    fontSize: 12,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    height: 56,
    paddingHorizontal: 16,
    gap: 12,
  },
  textArea: {
    height: 100,
    alignItems: "flex-start",
    paddingVertical: 12,
  },
  input: { flex: 1, fontSize: 15 },
  divider: { height: 1, marginVertical: 24 },
  bioHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginTop: 14,
  },
  bioHintText: { fontSize: 13 },
  errorText: {
    fontSize: 13,
    textAlign: "center",
    marginVertical: 12,
  },
  submitRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    marginTop: 16,
  },
  primaryBtn: {
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  primaryBtnText: { fontSize: 16 },
  logoutBtn: {
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
  },
  logoutBtnText: {
    fontSize: 16,
  },
});
