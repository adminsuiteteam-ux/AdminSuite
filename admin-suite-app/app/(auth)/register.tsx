import { Feather, AntDesign } from "@expo/vector-icons";
import { LinearGradient as ExpoLinearGradient } from "expo-linear-gradient";
import { Link, router } from "expo-router";
import React, { useState, useEffect, useRef } from "react";
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
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Polygon, Line } from "react-native-svg";

import { LogoMark } from "@/components/Brand";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import AsyncStorage from '@react-native-async-storage/async-storage';

function GeometricBackground() {
  return (
    <View style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox="0 0 500 1000" preserveAspectRatio="xMidYMid slice">
        <Defs>
          <SvgLinearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#080710" />
            <Stop offset="100%" stopColor="#0f172a" />
          </SvgLinearGradient>
          <SvgLinearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#1e3a8a" stopOpacity={0.8} />
            <Stop offset="100%" stopColor="#0f172a" stopOpacity={0.9} />
          </SvgLinearGradient>
          <SvgLinearGradient id="g3" x1="100%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#0f766e" stopOpacity={0.7} />
            <Stop offset="100%" stopColor="#1e1b4b" stopOpacity={0.9} />
          </SvgLinearGradient>
          <SvgLinearGradient id="g4" x1="0%" y1="100%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#0369a1" stopOpacity={0.6} />
            <Stop offset="100%" stopColor="#082f49" stopOpacity={0.9} />
          </SvgLinearGradient>
          <SvgLinearGradient id="g5" x1="50%" y1="0%" x2="50%" y2="100%">
            <Stop offset="0%" stopColor="#1e293b" stopOpacity={0.8} />
            <Stop offset="100%" stopColor="#020617" stopOpacity={0.95} />
          </SvgLinearGradient>
          <SvgLinearGradient id="g6" x1="100%" y1="100%" x2="0%" y2="0%">
            <Stop offset="0%" stopColor="#2563eb" stopOpacity={0.4} />
            <Stop offset="100%" stopColor="#1e3a8a" stopOpacity={0} />
          </SvgLinearGradient>
        </Defs>

        {/* Base fill */}
        <Polygon points="0,0 500,0 500,1000 0,1000" fill="url(#g1)" />

        {/* Facet Polygons */}
        <Polygon points="0,0 500,0 320,280 0,180" fill="url(#g2)" />
        <Polygon points="500,0 500,480 320,280" fill="url(#g3)" />
        <Polygon points="0,180 320,280 180,620 0,520" fill="url(#g4)" />
        <Polygon points="320,280 500,480 380,780 180,620" fill="url(#g5)" />
        <Polygon points="0,520 180,620 0,880" fill="url(#g3)" />
        <Polygon points="180,620 380,780 500,1000 220,1000 0,880" fill="url(#g2)" />
        <Polygon points="380,780 500,480 500,1000" fill="url(#g4)" />

        {/* Highlight Overlays */}
        <Polygon points="0,180 320,280 180,620 0,520" fill="url(#g6)" />
        <Polygon points="320,280 500,480 380,780 180,620" fill="url(#g6)" />

        {/* Structural lines */}
        <Line x1="0" y1="180" x2="320" y2="280" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.12" />
        <Line x1="500" y1="0" x2="320" y2="280" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.12" />
        <Line x1="0" y1="0" x2="320" y2="280" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.12" />
        <Line x1="320" y1="280" x2="180" y2="620" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.12" />
        <Line x1="500" y1="480" x2="320" y2="280" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.12" />
        <Line x1="180" y1="620" x2="0" y2="520" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.12" />
        <Line x1="180" y1="620" x2="0" y2="880" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.12" />
        <Line x1="380" y1="780" x2="180" y2="620" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.12" />
        <Line x1="500" y1="480" x2="380" y2="780" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.12" />
        <Line x1="380" y1="780" x2="500" y2="1000" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.12" />
        <Line x1="180" y1="620" x2="220" y2="1000" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.12" />
      </Svg>
    </View>
  );
}

function MobileAnimatedBackground({ isDark }: { isDark: boolean }) {
  const blob1Pos = useRef(new Animated.ValueXY({ x: -40, y: -40 })).current;
  const blob2Pos = useRef(new Animated.ValueXY({ x: 220, y: 380 })).current;

  useEffect(() => {
    const createMoveAnimation = (value: Animated.ValueXY, start: { x: number; y: number }, end: { x: number; y: number }, duration: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(value, {
            toValue: end,
            duration: duration,
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: start,
            duration: duration,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const anim1 = createMoveAnimation(blob1Pos, { x: -40, y: -40 }, { x: 80, y: 120 }, 14000);
    const anim2 = createMoveAnimation(blob2Pos, { x: 220, y: 380 }, { x: 30, y: 220 }, 16000);

    anim1.start();
    anim2.start();

    return () => {
      anim1.stop();
      anim2.stop();
    };
  }, []);

  return (
    <View style={StyleSheet.absoluteFill}>
      <ExpoLinearGradient
        colors={isDark ? ["#09090b", "#18181b", "#09090b"] : ["#f8fafc", "#f1f5f9", "#e2e8f0"]}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View
        style={[
          styles.floatingBlob,
          {
            backgroundColor: isDark ? "#4f46e5" : "#c7d2fe",
            opacity: isDark ? 0.08 : 0.4,
            width: 280,
            height: 280,
            borderRadius: 140,
            transform: [
              { translateX: blob1Pos.x },
              { translateY: blob1Pos.y },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.floatingBlob,
          {
            backgroundColor: isDark ? "#3b82f6" : "#bfdbfe",
            opacity: isDark ? 0.08 : 0.4,
            width: 220,
            height: 220,
            borderRadius: 110,
            transform: [
              { translateX: blob2Pos.x },
              { translateY: blob2Pos.y },
            ],
          },
        ]}
      />
    </View>
  );
}

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { signUpWithSupabase, resendSupabaseOTP, verifySupabaseOTP, loginWithSocial } = useAuth();

  const rawKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const isDemoKey = !rawKey || rawKey.includes("placeholder");

  const [step, setStep] = useState<"credentials" | "code">("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // OTP 8-digit states (matches Supabase config)
  const [otpValues, setOtpValues] = useState<string[]>(Array(8).fill(""));
  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [hasOtpError, setHasOtpError] = useState(false);
  const [activeFocusedIndex, setActiveFocusedIndex] = useState(0);

  const tickScale = useRef(new Animated.Value(0)).current;
  const tickOpacity = useRef(new Animated.Value(0)).current;
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const isVerifyingRef = useRef(false);

  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isTablet = width >= 768;
  const boxWidth = Math.min(36, Math.floor((width - (isTablet ? 140 : 80)) / 11));
  const [mobileIntro, setMobileIntro] = useState(!isTablet);

  const introOpacity = useRef(new Animated.Value(1)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isTablet) {
      const timer = setTimeout(() => {
        Animated.timing(introOpacity, {
          toValue: 0,
          duration: 450,
          useNativeDriver: true,
        }).start(() => {
          setMobileIntro(false);
          Animated.timing(formOpacity, {
            toValue: 1,
            duration: 450,
            useNativeDriver: true,
          }).start();
        });
      }, 2500);
      return () => clearTimeout(timer);
    } else {
      setMobileIntro(false);
      formOpacity.setValue(1);
    }
  }, [isTablet]);

  // Countdown timer for resending OTP
  useEffect(() => {
    let timer: any;
    if (step === "code" && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [countdown, step]);

  const handleCreateAccount = async () => {
    setError("");
    setSuccess("");

    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await signUpWithSupabase(email.trim().toLowerCase(), password);
      
      const debugCode = await AsyncStorage.getItem("auth.debug_otp_code");
      if (debugCode) {
        setSuccess(`Verification code (DEV): ${debugCode}`);
        await AsyncStorage.removeItem("auth.debug_otp_code");
      } else {
        setSuccess("Verification code sent to your email!");
      }
      
      setStep("code");
      setCountdown(30);
      setCanResend(false);
      setIsVerified(false);
      setHasOtpError(false);
      setOtpValues(Array(8).fill(""));
    } catch (err: any) {
      setError(err.message || "Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;
    setError("");
    setSuccess("");
    setOtpValues(Array(8).fill(""));
    setCountdown(30);
    setCanResend(false);
    setHasOtpError(false);
    try {
      await resendSupabaseOTP(email.trim().toLowerCase());
      
      const debugCode = await AsyncStorage.getItem("auth.debug_otp_code");
      if (debugCode) {
        setSuccess(`New verification code (DEV): ${debugCode}`);
        await AsyncStorage.removeItem("auth.debug_otp_code");
      } else {
        setSuccess("New 8-digit verification code sent!");
      }
    } catch (err: any) {
      setError(err.message || "Failed to resend verification code.");
    }
  };

  const handleVerifyCode = async (codeToVerify?: string) => {
    if (isVerifyingRef.current || isVerified) return;
    isVerifyingRef.current = true;

    setError("");
    setSuccess("");
    setHasOtpError(false);

    const codeString = codeToVerify || otpValues.join("");
    if (codeString.length !== 8) {
      setError("Please enter the 8-digit verification code.");
      setHasOtpError(true);
      isVerifyingRef.current = false;
      return;
    }

    setLoading(true);
    try {
      await verifySupabaseOTP(email.trim().toLowerCase(), codeString, password);
      
      // Success triggers green glow and tick animation
      setIsVerified(true);
      Animated.parallel([
        Animated.spring(tickScale, {
          toValue: 1.2,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(tickOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setTimeout(() => {
          router.replace("/");
        }, 1200);
      });

    } catch (err: any) {
      setHasOtpError(true);
      setError(err.message || "Invalid or expired verification code.");
    } finally {
      setLoading(false);
      isVerifyingRef.current = false;
    }
  };

  const handleOtpChange = (text: string, idx: number) => {
    const cleaned = text.replace(/[^0-9]/g, "");
    const newValues = [...otpValues];
    
    if (cleaned.length === 0) {
      // User cleared the box
      newValues[idx] = "";
      setOtpValues(newValues);
      return;
    }

    // Take the last digit typed (handles overwrite when box already has a value)
    const digit = cleaned[cleaned.length - 1];
    newValues[idx] = digit;
    setOtpValues(newValues);
    
    if (idx < 7) {
      inputRefs.current[idx + 1]?.focus();
    } else {
      const fullCode = newValues.join("");
      if (fullCode.length === 8) {
        handleVerifyCode(fullCode);
      }
    }
  };

  const handleOtpKeyPress = (e: any, idx: number) => {
    if (e.nativeEvent.key === "Backspace") {
      const newValues = [...otpValues];
      
      if (newValues[idx] !== "") {
        newValues[idx] = "";
        setOtpValues(newValues);
      } else if (idx > 0) {
        newValues[idx - 1] = "";
        setOtpValues(newValues);
        inputRefs.current[idx - 1]?.focus();
      }
    }
  };

  const handleOAuthLogin = async (provider: "google" | "apple") => {
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const targetEmail = `${provider}_user_${Date.now()}@adminsuite.com`;
      const targetName = `${provider === 'google' ? 'Google' : 'Apple'} User`;
      await loginWithSocial(targetEmail, targetName, provider);
      router.replace("/");
    } catch (err: any) {
      console.error("Social login/signup error:", err);
      setError(err.message || "Social sign up failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderFormContent = () => {
    if (step === "credentials") {
      return (
        <View style={styles.formContainer}>
          <Text style={[styles.formTitle, { color: colors.foreground }]}>
            Create Account
          </Text>
          <Text style={[styles.formSubtitle, { color: colors.mutedForeground }]}>
            Sign up to start managing your business with ease.
          </Text>

          {isDemoKey && (
            <View style={styles.demoBanner}>
              <View style={styles.demoIconCircle}>
                <Feather name="alert-triangle" size={14} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.demoBannerTitle}>
                  Demo Auth Active
                </Text>
                <Text style={styles.demoBannerText}>
                  Please configure EXPO_PUBLIC_SUPABASE_ANON_KEY in .env.
                </Text>
              </View>
            </View>
          )}

          <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
            Email
          </Text>
          <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Input your email"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              keyboardType="email-address"
              style={[styles.textInput, { color: colors.foreground }]}
            />
          </View>

          <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
            Password
          </Text>
          <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Input your password"
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry={!showPwd}
              style={[styles.textInput, { color: colors.foreground }]}
            />
            <Pressable onPress={() => setShowPwd((s) => !s)} hitSlop={10} style={styles.eyeBtn}>
              <Feather name={showPwd ? "eye-off" : "eye"} size={16} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
            Confirm Password
          </Text>
          <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Input your password name"
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry={!showConfirmPwd}
              style={[styles.textInput, { color: colors.foreground }]}
            />
            <Pressable onPress={() => setShowConfirmPwd((s) => !s)} hitSlop={10} style={styles.eyeBtn}>
              <Feather name={showConfirmPwd ? "eye-off" : "eye"} size={16} color={colors.mutedForeground} />
            </Pressable>
          </View>

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: colors.danger + "15" }]}>
              <Feather name="alert-circle" size={14} color={colors.danger} />
              <Text style={[styles.errorText, { color: colors.danger }]}>
                {error}
              </Text>
            </View>
          ) : null}

          {success ? (
            <View style={[styles.successBox, { backgroundColor: colors.success + "15" }]}>
              <Feather name="check-circle" size={14} color={colors.success} />
              <Text style={[styles.successText, { color: colors.success }]}>
                {success}
              </Text>
            </View>
          ) : null}

          <Pressable
            onPress={handleCreateAccount}
            disabled={loading}
            style={({ pressed }) => [
              styles.submitButton,
              {
                backgroundColor: colors.primary,
                opacity: pressed || loading ? 0.85 : 1,
                transform: [{ scale: pressed && !loading ? 0.96 : 1 }],
              }
            ]}
          >
            <Text style={[styles.submitButtonText, { color: colors.primaryForeground }]}>
              {loading ? "Creating..." : "Sign up"}
            </Text>
          </Pressable>



          <View style={styles.footerLinkRow}>
            <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
              Already have an account?{" "}
            </Text>
            <Link href="/(auth)/login" asChild>
              <Pressable hitSlop={6}>
                <Text style={[styles.footerLinkText, { color: colors.primary }]}>
                  Sign in here
                </Text>
              </Pressable>
            </Link>
          </View>
        </View>
      );
    }

    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    return (
      <View style={styles.formContainer}>
        <Text style={[styles.formTitle, { color: colors.foreground }]}>
          Verify Your Email
        </Text>
        <Text style={[styles.formSubtitle, { color: colors.mutedForeground }]}>
          We've sent an 8-digit code to {email}
        </Text>

        <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
          Verification Code
        </Text>

        <View style={styles.otpGrid}>
          {Array.from({ length: 8 }).map((_, idx) => {
            const isBoxFocused = activeFocusedIndex === idx;
            let borderColor = colors.border;
            if (isVerified) {
              borderColor = colors.success;
            } else if (hasOtpError) {
              borderColor = colors.danger;
            } else if (isBoxFocused) {
              borderColor = colors.accent || "#3b82f6";
            }
            
            return (
              <React.Fragment key={idx}>
                <TextInput
                  ref={(ref) => { inputRefs.current[idx] = ref; }}
                  value={otpValues[idx]}
                  onChangeText={(text) => handleOtpChange(text, idx)}
                  onKeyPress={(e) => handleOtpKeyPress(e, idx)}
                  onFocus={() => setActiveFocusedIndex(idx)}
                  maxLength={2}
                  keyboardType="number-pad"
                  style={[
                    styles.otpBox,
                    {
                      borderColor,
                      backgroundColor: colors.card,
                      color: colors.foreground,
                      width: boxWidth,
                    }
                  ]}
                />
                {idx === 3 && (
                  <Text style={[styles.otpSeparator, { color: colors.mutedForeground }]}>
                    -
                  </Text>
                )}
              </React.Fragment>
            );
          })}
        </View>

        <View style={styles.timerRow}>
          {countdown > 0 ? (
            <Text style={[styles.timerText, { color: colors.mutedForeground }]}>
              Resend code in {formatTime(countdown)}
            </Text>
          ) : (
            <Pressable onPress={handleResendOtp} disabled={loading}>
              <Text style={[styles.resendLink, { color: colors.accent || "#3b82f6" }]}>
                Resend code
              </Text>
            </Pressable>
          )}
        </View>

        {isVerified && (
          <Animated.View
            style={[
              styles.successAnimationContainer,
              {
                opacity: tickOpacity,
                transform: [{ scale: tickScale }],
                backgroundColor: colors.card === "#ffffff" ? "rgba(255, 255, 255, 0.95)" : "rgba(24, 24, 27, 0.95)",
              },
            ]}
          >
            <View style={[styles.successCircle, { backgroundColor: colors.success }]}>
              <Feather name="check" size={32} color="#ffffff" />
            </View>
            <Text style={[styles.successAnimationText, { color: colors.success, fontFamily: "Inter_700Bold" }]}>
              Verified!
            </Text>
          </Animated.View>
        )}

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: colors.danger + "15" }]}>
            <Feather name="alert-circle" size={14} color={colors.danger} />
            <Text style={[styles.errorText, { color: colors.danger }]}>
              {error}
            </Text>
          </View>
        ) : null}

        {success ? (
          <View style={[styles.successBox, { backgroundColor: colors.success + "15" }]}>
            <Feather name="check-circle" size={14} color={colors.success} />
            <Text style={[styles.successText, { color: colors.success }]}>
              {success}
            </Text>
          </View>
        ) : null}

        <Pressable
          onPress={() => handleVerifyCode()}
          disabled={loading || isVerified}
          style={({ pressed }) => [
            styles.submitButton,
            {
              backgroundColor: colors.primary,
              opacity: pressed || loading || isVerified ? 0.85 : 1,
              transform: [{ scale: pressed && !loading && !isVerified ? 0.96 : 1 }],
            }
          ]}
        >
          <Text style={[styles.submitButtonText, { color: colors.primaryForeground }]}>
            {loading ? "Verifying..." : "Verify & Create Account"}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setError("");
            setSuccess("");
            setOtpValues(Array(6).fill(""));
            setStep("credentials");
          }}
          disabled={loading || isVerified}
          style={{ alignSelf: "center", marginTop: 20 }}
          hitSlop={10}
        >
          <Text style={{ color: "#8e8e93", fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
            ← Back to Sign Up
          </Text>
        </Pressable>
      </View>
    );
  };

  if (!isTablet && mobileIntro) {
    return (
      <View style={styles.introContainer}>
        <GeometricBackground />
        <Animated.View style={[styles.introContent, { opacity: introOpacity }]}>
          <View style={styles.introHeader}>
            <LogoMark size={48} tint="#ffffff" />
            <Text style={styles.introBrandText}>AdminSuite</Text>
          </View>
          
          <View style={styles.introMain}>
            <Text style={styles.introTitle}>
              Manage Smarter.{"\n"}Grow Faster.{"\n"}Scale Anywhere.
            </Text>
            <Text style={styles.introSub}>
              A centralized control center to manage your employees, clients, projects, and finances seamlessly in one beautiful platform.
            </Text>
          </View>

          <View style={{ height: 20 }} />
        </Animated.View>
      </View>
    );
  }

  const isDarkTheme = colors.isDark;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: isTablet ? (isDarkTheme ? "#18181b" : "#f4f4f5") : colors.background }}
    >
      {!isTablet && <MobileAnimatedBackground isDark={isDarkTheme} />}

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: isTablet ? 12 : 0 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {isTablet ? (
          <View style={[styles.splitFrame, { borderColor: colors.border, backgroundColor: colors.card }]}>
            {/* Left Panel */}
            <View style={styles.leftPanel}>
              <GeometricBackground />
              <View style={styles.leftContent}>
                {/* Header (No Back Link) */}
                <View style={styles.leftHeader}>
                  <View style={styles.logoRow}>
                    <LogoMark size={28} tint="#ffffff" />
                    <Text style={[styles.leftBrandText, { fontFamily: "Inter_700Bold" }]}>AdminSuite</Text>
                  </View>
                </View>

                {/* Hero Middle Content */}
                <View style={styles.leftMain}>
                  <Text style={[styles.heroTitle, { fontFamily: "Inter_700Bold" }]}>
                    Manage Smarter.{"\n"}Grow Faster.{"\n"}Scale Anywhere.
                  </Text>
                  <Text style={[styles.heroSub, { fontFamily: "Inter_400Regular" }]}>
                    A centralized control center to manage your employees, clients, projects, and finances seamlessly in one beautiful platform.
                  </Text>
                </View>
                
                <View style={{ height: 4 }} />
              </View>
            </View>

            {/* Right Panel containing the form */}
            <View style={[styles.rightPanel, { backgroundColor: colors.card }]}>
              {renderFormContent()}
            </View>
          </View>
        ) : (
          // Mobile Layout (Form view after intro)
          <Animated.View style={{ flex: 1, opacity: formOpacity }}>
            {/* Logo and Name on Top for phone screen */}
            <View style={[styles.mobileLogoHeader, { paddingTop: insets.top + 32 }]}>
              <LogoMark size={36} tint={isDarkTheme ? "#ffffff" : "#1c1c1e"} />
              <Text style={[styles.mobileLogoHeaderTitle, { color: colors.foreground }]}>AdminSuite</Text>
            </View>

            <View style={[styles.mobileFormCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
              {renderFormContent()}
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  splitFrame: {
    flexDirection: "row",
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 25,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
    width: "100%",
    maxWidth: 1100, // expanded width to occupy more screen size
    alignSelf: "center",
    minHeight: 620,
    borderWidth: 1,
    borderColor: "#e4e4e7",
  },
  leftPanel: {
    flex: 1.1,
    position: "relative",
    backgroundColor: "#09090b",
  },
  leftContent: {
    ...StyleSheet.absoluteFillObject,
    padding: 36,
    justifyContent: "space-between",
  },
  leftHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  leftBrandText: {
    color: "#ffffff",
    fontSize: 18,
    letterSpacing: -0.5,
  },
  leftMain: {
    marginVertical: "auto",
    gap: 12,
  },
  heroTitle: {
    color: "#ffffff",
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.8,
  },
  heroSub: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 14,
    lineHeight: 20,
  },
  rightPanel: {
    flex: 1,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingVertical: 32,
  },
  formContainer: {
    width: "100%",
    maxWidth: 380,
    alignSelf: "center",
  },
  formTitle: {
    fontSize: 26,
    letterSpacing: -0.5,
    marginBottom: 6,
    color: "#1c1c1e",
    fontFamily: "Inter_700Bold",
  },
  formSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
    color: "#636366",
    fontFamily: "Inter_400Regular",
  },
  fieldLabel: {
    fontSize: 12,
    marginBottom: 6,
    fontFamily: "Inter_600SemiBold",
    color: "#2c2c2e",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    height: 48,
    paddingHorizontal: 12,
    backgroundColor: "#ffffff",
    borderColor: "#d1d1d6",
    borderRadius: 12,
    marginBottom: 16,
  },
  textInput: {
    flex: 1,
    height: "100%",
    fontSize: 14,
    color: "#1c1c1e",
    fontFamily: "Inter_500Medium",
  },
  eyeBtn: {
    paddingLeft: 8,
  },
  submitButton: {
    height: 48,
    backgroundColor: "#1c1c1e",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  submitButtonText: {
    fontSize: 14,
    letterSpacing: 0.1,
    color: "#ffffff",
    fontFamily: "Inter_600SemiBold",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e5e5ea",
  },
  dividerText: {
    fontSize: 12,
    color: "#8e8e93",
    fontFamily: "Inter_400Regular",
  },
  socialRow: {
    flexDirection: "row",
    gap: 12,
  },
  socialButton: {
    flex: 1,
    height: 48,
    borderWidth: 1.5,
    borderColor: "#d1d1d6",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  socialButtonText: {
    fontSize: 14,
    color: "#1c1c1e",
    fontFamily: "Inter_600SemiBold",
  },
  footerLinkRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  footerText: {
    fontSize: 13,
    color: "#8e8e93",
    fontFamily: "Inter_400Regular",
  },
  footerLinkText: {
    fontSize: 13,
    color: "#1c1c1e",
    fontFamily: "Inter_600SemiBold",
    textDecorationLine: "underline",
  },
  demoBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 8,
    borderColor: "#f59e0b",
    backgroundColor: "#fffbeb",
  },
  demoIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f59e0b",
  },
  demoBannerTitle: {
    fontSize: 11,
    marginBottom: 1,
    color: "#78350f",
    fontFamily: "Inter_600SemiBold",
  },
  demoBannerText: {
    fontSize: 9,
    lineHeight: 12,
    color: "#92400e",
    fontFamily: "Inter_400Regular",
  },
  errorBox: {
    marginTop: 8,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 10,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 12,
    flex: 1,
  },
  successBox: {
    marginTop: 8,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 10,
    borderRadius: 8,
  },
  successText: {
    fontSize: 12,
    flex: 1,
  },
  
  // Mobile specific intro styles
  introContainer: {
    flex: 1,
    backgroundColor: "#09090b",
  },
  introContent: {
    flex: 1,
    padding: 30,
    justifyContent: "space-between",
  },
  introHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 40,
  },
  introBrandText: {
    color: "#ffffff",
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  introMain: {
    gap: 16,
  },
  introTitle: {
    color: "#ffffff",
    fontSize: 36,
    lineHeight: 46,
    fontFamily: "Inter_700Bold",
  },
  introSub: {
    color: "rgba(255, 255, 255, 0.75)",
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
  },
  
  // Mobile form header after intro
  mobileLogoHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
  },
  mobileLogoHeaderTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#1c1c1e",
  },
  mobileFormCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 20,
    marginBottom: 30,
    backgroundColor: "#ffffff",
  },
  floatingBlob: {
    position: "absolute",
  },
  otpGrid: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 16,
    width: "100%",
    gap: 5,
  },
  otpBox: {
    height: 48,
    borderWidth: 1.5,
    borderRadius: 8,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "bold",
  },
  otpSeparator: {
    fontSize: 20,
    fontWeight: "bold",
    marginHorizontal: 1,
  },
  timerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  timerText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  resendLink: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    textDecorationLine: "underline",
  },
  successAnimationContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    borderRadius: 20,
  },
  successCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#10b981",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  successAnimationText: {
    fontSize: 18,
    letterSpacing: 0.2,
  },
});
