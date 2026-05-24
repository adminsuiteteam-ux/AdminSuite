import { Feather, AntDesign } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import * as LocalAuthentication from "expo-local-authentication";
import { router } from "expo-router";
import React, { useState, useRef } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Dimensions,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LogoMark } from "@/components/Brand";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useSettings } from "@/context/SettingsContext";
import { apiService } from "@/services/api";

const { width } = Dimensions.get("window");

// Discovery Sources
const HEARD_FROM_OPTIONS = [
  { value: "youtube", label: "YouTube", icon: "youtube", color: "#ef4444" },
  { value: "tiktok", label: "TikTok", icon: "music", color: "#00f2fe" },
  { value: "facebook", label: "Facebook & Socials", icon: "facebook", color: "#1877f2" },
  { value: "friend", label: "A Friend / Colleague", icon: "users", color: "#10b981" },
  { value: "others", label: "Other Sources", icon: "more-horizontal", color: "#6366f1" },
] as const;

// Roles
const ROLE_OPTIONS = [
  {
    value: "admin",
    title: "Company Administrator",
    desc: "Manage finances, assign budgets, set up integrations, and view full workspace metrics.",
    icon: "shield",
    gradient: ["#4f46e5", "#312e81"],
  },
  {
    value: "hr",
    title: "HR & People Manager",
    desc: "Oversee employee onboarding, track leave requests, manage initials, performance and shares.",
    icon: "users",
    gradient: ["#10b981", "#064e3b"],
  },
  {
    value: "manager",
    title: "Project / Team Lead",
    desc: "Manage client deliverables, track ongoing projects, assign tasks, and coordinate with clients.",
    icon: "briefcase",
    gradient: ["#f59e0b", "#78350f"],
  },
] as const;

export default function CompleteProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, setUser } = useAuth();
  const { setBiometricsEnabled } = useSettings();

  const [currentSlide, setCurrentSlide] = useState(0);
  const slideProgress = useRef(new Animated.Value(0)).current;

  // Form State
  const [heardFrom, setHeardFrom] = useState<string>("");
  const [role, setRole] = useState<string>("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [socialLink, setSocialLink] = useState("");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  
  // Toggles
  const [biometricsActive, setBiometricsActive] = useState(false);
  const [notificationsActive, setNotificationsActive] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const totalSlides = 5;

  const animateToSlide = (index: number) => {
    setCurrentSlide(index);
    Animated.timing(slideProgress, {
      toValue: index / (totalSlides - 1),
      duration: 350,
      useNativeDriver: false,
    }).start();
  };

  const handleNext = () => {
    setError("");
    if (currentSlide === 0 && !heardFrom) {
      setError("Please select how you heard about us.");
      return;
    }
    if (currentSlide === 1 && !role) {
      setError("Please select your primary role.");
      return;
    }
    if (currentSlide === 2) {
      if (!location.trim()) {
        setError("Please enter your location.");
        return;
      }
      if (!phone.trim()) {
        setError("Please enter your phone number.");
        return;
      }
    }

    if (currentSlide < totalSlides - 1) {
      animateToSlide(currentSlide + 1);
    } else {
      onSubmit();
    }
  };

  const handleBack = () => {
    setError("");
    if (currentSlide > 0) {
      animateToSlide(currentSlide - 1);
    }
  };

  // Pick Avatar
  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  // Trigger Local Auth to check biometrics
  const enableBiometrics = async () => {
    setError("");
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        setError("Biometric authentication is not set up on this device.");
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Enable quick access to Admin Suite",
        fallbackLabel: "Use passcode",
      });

      if (result.success) {
        setBiometricsActive(true);
        await setBiometricsEnabled(true);
        setSuccess("Biometric lock enabled successfully!");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError("Authentication failed.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to set up biometrics.");
    }
  };

  // Simulated Push Notification Prompt
  const enableNotifications = () => {
    setNotificationsActive(true);
    setSuccess("Notifications enabled successfully!");
    setTimeout(() => setSuccess(""), 3000);
  };

  // Final Profile Submit to Backend DB
  const onSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("location", location.trim());
      formData.append("heard_from", heardFrom);
      formData.append("role", role);
      formData.append("phone", phone.trim());
      formData.append("bio", bio.trim());
      formData.append("social_link", socialLink.trim());
      formData.append("biometrics_enabled", biometricsActive ? "true" : "false");
      formData.append("notifications_enabled", notificationsActive ? "true" : "false");

      if (avatarUri) {
        const filename = avatarUri.split("/").pop() || "avatar.jpg";
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : "image/jpeg";
        formData.append("avatar", {
          uri: avatarUri,
          name: filename,
          type,
        } as any);
      }

      const res = await apiService.updateMe(formData);

      if (user) {
        setUser({
          ...user,
          profile_complete: true,
          ...res.data,
          initials: ((res.data.name || user.name || user.username || user.email || "US")).slice(0, 2).toUpperCase(),
        });
      }

      // Finish Onboarding and redirect directly to Tabs
      router.replace("/(tabs)");
    } catch (err: any) {
      console.error("Profile submit error:", err);
      const backendErrors = err.response?.data;
      if (backendErrors) {
        const firstError = Object.values(backendErrors)[0];
        setError(Array.isArray(firstError) ? (firstError as string[])[0] : "Failed to save profile.");
      } else {
        setError(err.message || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Render slides dynamically
  const renderSlideContent = () => {
    switch (currentSlide) {
      case 0:
        return (
          <View style={styles.slideContainer}>
            <Text style={[styles.slideTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              Where did you hear about us?
            </Text>
            <Text style={[styles.slideSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Help us customize your workspace journey.
            </Text>
            <View style={styles.optionsList}>
              {HEARD_FROM_OPTIONS.map((opt) => {
                const isSelected = heardFrom === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setHeardFrom(opt.value)}
                    style={({ pressed }) => [
                      styles.choiceCard,
                      {
                        backgroundColor: isSelected ? colors.primary + "12" : colors.muted,
                        borderColor: isSelected ? colors.primary : colors.border,
                        opacity: pressed ? 0.9 : 1,
                      },
                    ]}
                  >
                    <View style={[styles.iconCircle, { backgroundColor: opt.color + "18" }]}>
                      <Feather name={opt.icon as any} size={18} color={opt.color} />
                    </View>
                    <Text style={[styles.choiceText, { color: colors.foreground, fontFamily: isSelected ? "Inter_600SemiBold" : "Inter_500Medium" }]}>
                      {opt.label}
                    </Text>
                    {isSelected && (
                      <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
                        <Feather name="check" size={12} color="#fff" />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        );

      case 1:
        return (
          <View style={styles.slideContainer}>
            <Text style={[styles.slideTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              What is your primary role?
            </Text>
            <Text style={[styles.slideSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              We'll tailor your dashboard apps based on your choice.
            </Text>
            <View style={styles.optionsList}>
              {ROLE_OPTIONS.map((opt) => {
                const isSelected = role === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setRole(opt.value)}
                    style={({ pressed }) => [
                      styles.roleCard,
                      {
                        backgroundColor: isSelected ? colors.primary + "06" : colors.muted,
                        borderColor: isSelected ? colors.primary : colors.border,
                        borderWidth: isSelected ? 2 : 1,
                        opacity: pressed ? 0.95 : 1,
                      },
                    ]}
                  >
                    <LinearGradient
                      colors={opt.gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.roleGradient}
                    >
                      <Feather name={opt.icon as any} size={20} color="#fff" />
                    </LinearGradient>
                    <View style={styles.roleTextContainer}>
                      <Text style={[styles.roleTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                        {opt.title}
                      </Text>
                      <Text style={[styles.roleDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                        {opt.desc}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.slideContainer}>
            <Text style={[styles.slideTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              Tell us about yourself
            </Text>
            <Text style={[styles.slideSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              This will update your public profile workspace.
            </Text>

            {/* Avatar Section */}
            <View style={styles.avatarWrap}>
              <Pressable onPress={pickAvatar} style={styles.avatarCircle}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                ) : (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: colors.muted }]}>
                    <Feather name="camera" size={32} color={colors.mutedForeground} />
                  </View>
                )}
                <View style={[styles.avatarBadge, { backgroundColor: colors.primary }]}>
                  <Feather name="plus" size={14} color="#fff" />
                </View>
              </Pressable>
              <Text style={[styles.avatarSubtext, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                Add Profile Photo
              </Text>
            </View>

            {/* Fields */}
            <Text style={[styles.inputLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
              Location
            </Text>
            <View style={[styles.inputContainer, { borderColor: colors.border, borderRadius: colors.radius }]}>
              <Feather name="map-pin" size={16} color={colors.mutedForeground} />
              <TextInput
                value={location}
                onChangeText={setLocation}
                placeholder="e.g. Lagos, Nigeria"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.input, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}
              />
            </View>

            <Text style={[styles.inputLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold", marginTop: 16 }]}>
              Phone Number
            </Text>
            <View style={[styles.inputContainer, { borderColor: colors.border, borderRadius: colors.radius }]}>
              <Feather name="phone" size={16} color={colors.mutedForeground} />
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="+234 80 1234 5678"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="phone-pad"
                style={[styles.input, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}
              />
            </View>

            <Text style={[styles.inputLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold", marginTop: 16 }]}>
              Short Bio (Optional)
            </Text>
            <View style={[styles.inputContainer, { borderColor: colors.border, borderRadius: colors.radius, height: 70, alignItems: "flex-start", paddingVertical: 10 }]}>
              <TextInput
                value={bio}
                onChangeText={setBio}
                placeholder="Brief summary..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={2}
                style={[styles.input, { color: colors.foreground, fontFamily: "Inter_500Medium", height: "100%" }]}
              />
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.slideContainer}>
            <Text style={[styles.slideTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              Secure Your Workspace
            </Text>
            <Text style={[styles.slideSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Keep employee details, shares, budgets, and transactions safe with biometrics.
            </Text>

            <View style={styles.heroCenter}>
              <View style={styles.shieldRing}>
                <Feather name="lock" size={64} color={biometricsActive ? "#10b981" : colors.primary} />
              </View>
              <Text style={[styles.heroHeading, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                {biometricsActive ? "Biometrics Active" : "Instant Authentication"}
              </Text>
              <Text style={[styles.heroText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                Use your device's Touch ID or Face ID fingerprint lock for instant security verification.
              </Text>

              <Pressable
                onPress={enableBiometrics}
                style={({ pressed }) => [
                  styles.actionBtn,
                  {
                    backgroundColor: biometricsActive ? "#10b981" : colors.primary,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Feather name={biometricsActive ? "check" : "smartphone"} size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={[styles.actionBtnText, { fontFamily: "Inter_600SemiBold" }]}>
                  {biometricsActive ? "Enabled" : "Enable Biometrics"}
                </Text>
              </Pressable>
            </View>
          </View>
        );

      case 4:
        return (
          <View style={styles.slideContainer}>
            <Text style={[styles.slideTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              Never Miss a Beat
            </Text>
            <Text style={[styles.slideSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Stay updated with team requests, task completions, and budget notifications.
            </Text>

            <View style={styles.heroCenter}>
              <View style={styles.shieldRing}>
                <Feather name="bell" size={64} color={notificationsActive ? "#10b981" : colors.primary} />
              </View>
              <Text style={[styles.heroHeading, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                {notificationsActive ? "Notifications Active" : "Stay Alerted"}
              </Text>
              <Text style={[styles.heroText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                Get real-time updates regarding company deliverables, payroll status, and net profits directly.
              </Text>

              <Pressable
                onPress={enableNotifications}
                style={({ pressed }) => [
                  styles.actionBtn,
                  {
                    backgroundColor: notificationsActive ? "#10b981" : colors.primary,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Feather name={notificationsActive ? "check" : "bell-off"} size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={[styles.actionBtnText, { fontFamily: "Inter_600SemiBold" }]}>
                  {notificationsActive ? "Enabled" : "Enable Push Notifications"}
                </Text>
              </Pressable>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Onboarding Header */}
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <View style={styles.topRow}>
            <Pressable onPress={handleBack} disabled={currentSlide === 0} style={{ opacity: currentSlide === 0 ? 0.2 : 1 }}>
              <Feather name="arrow-left" size={24} color={colors.foreground} />
            </Pressable>
            <View style={styles.headerLogo}>
              <LogoMark size={28} tint={colors.primary} />
              <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                Admin Suite
              </Text>
            </View>
            <Text style={[styles.stepIndicator, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
              {currentSlide + 1} / {totalSlides}
            </Text>
          </View>

          {/* Progress bar */}
          <View style={[styles.progressBarBg, { backgroundColor: colors.muted }]}>
            <Animated.View
              style={[
                styles.progressBarFill,
                {
                  backgroundColor: colors.primary,
                  width: slideProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["20%", "100%"],
                  }),
                },
              ]}
            />
          </View>
        </View>

        {/* Slide Content Card */}
        <View style={styles.card}>
          {renderSlideContent()}

          {/* Notification Messages */}
          {error ? (
            <View style={[styles.messageBox, { backgroundColor: colors.danger + "12" }]}>
              <Feather name="alert-circle" size={14} color={colors.danger} style={{ marginRight: 6 }} />
              <Text style={[styles.messageText, { color: colors.danger, fontFamily: "Inter_500Medium" }]}>
                {error}
              </Text>
            </View>
          ) : null}

          {success ? (
            <View style={[styles.messageBox, { backgroundColor: "#10b98112" }]}>
              <Feather name="check-circle" size={14} color="#10b981" style={{ marginRight: 6 }} />
              <Text style={[styles.messageText, { color: "#10b981", fontFamily: "Inter_500Medium" }]}>
                {success}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Footer Navigation */}
        <View style={styles.footer}>
          <PrimaryButton
            label={currentSlide === totalSlides - 1 ? "Finish Onboarding" : "Next Step"}
            onPress={handleNext}
            loading={loading}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLogo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    letterSpacing: -0.4,
  },
  stepIndicator: {
    fontSize: 13,
  },
  progressBarBg: {
    height: 4,
    borderRadius: 2,
    marginTop: 18,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 2,
  },
  card: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  slideContainer: {
    flex: 1,
  },
  slideTitle: {
    fontSize: 24,
    letterSpacing: -0.6,
    marginBottom: 8,
  },
  slideSub: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  optionsList: {
    gap: 12,
  },
  choiceCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  choiceText: {
    fontSize: 15,
    marginLeft: 14,
    flex: 1,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  roleCard: {
    flexDirection: "row",
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    gap: 16,
  },
  roleGradient: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  roleTextContainer: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  roleDesc: {
    fontSize: 12,
    lineHeight: 18,
  },
  avatarWrap: {
    alignItems: "center",
    marginBottom: 20,
  },
  avatarCircle: {
    position: "relative",
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  avatarSubtext: {
    fontSize: 12,
    marginTop: 8,
  },
  inputLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
  },
  heroCenter: {
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  shieldRing: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "#312e8110",
    borderWidth: 1,
    borderColor: "#312e8118",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  heroHeading: {
    fontSize: 20,
    marginBottom: 8,
    textAlign: "center",
  },
  heroText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  actionBtn: {
    flexDirection: "row",
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  actionBtnText: {
    color: "#fff",
    fontSize: 14,
  },
  messageBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginTop: 18,
  },
  messageText: {
    fontSize: 13,
    flex: 1,
  },
  footer: {
    paddingHorizontal: 24,
    marginTop: 20,
  },
});
