import { Feather } from "@expo/vector-icons";
import React, { useState, useRef, useEffect, useCallback } from "react";
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

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useToast } from "@/context/ToastContext";
import { apiService } from "@/services/api";
import { spacing, motion, shadows } from "@/constants/theme";

export default function EmployeeProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, setUser } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [location, setLocation] = useState(user?.location || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Animation values for input glow
  const nameGlow = useRef(new Animated.Value(0)).current;
  const phoneGlow = useRef(new Animated.Value(0)).current;
  const locGlow = useRef(new Animated.Value(0)).current;
  const bioGlow = useRef(new Animated.Value(0)).current;
  const passGlow = useRef(new Animated.Value(0)).current;
  const btnPressAnim = useRef(new Animated.Value(0)).current;

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

  const onSave = async () => {
    setError("");
    if (password && password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        first_name: name,
        phone,
        location,
        bio,
      };

      if (password) {
        payload.password = password;
      }

      const res = await apiService.updateMe(payload);
      const updatedUser = res.data;
      updatedUser.initials = ((updatedUser.name || updatedUser.username || updatedUser.email || "US")).slice(0, 2).toUpperCase();
      
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
              secureTextEntry
              style={[styles.input, { color: colors.text, fontFamily: "Inter_500Medium" }]}
            />
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
              secureTextEntry
              style={[styles.input, { color: colors.text, fontFamily: "Inter_500Medium" }]}
            />
          </Animated.View>

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
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  form: {
    width: "100%",
  },
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
  input: {
    flex: 1,
    fontSize: 15,
  },
  divider: {
    height: 1,
    marginVertical: 24,
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
    marginTop: 16,
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
