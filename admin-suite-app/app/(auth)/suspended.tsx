import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function SuspendedScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { suspendedUntil, setSuspendedUntil } = useAuth();
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!suspendedUntil) {
      router.replace("/(auth)/login");
      return;
    }

    const target = new Date(suspendedUntil).getTime();
    
    const updateTimer = () => {
      const now = new Date().getTime();
      const diff = Math.max(0, Math.floor((target - now) / 1000));
      setTimeLeft(diff);
      
      if (diff <= 0) {
        setSuspendedUntil(null);
        clearInterval(interval);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [suspendedUntil]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleTryAgain = () => {
    router.replace("/(auth)/login");
  };

  return (
    <View style={[styles.container, { backgroundColor: "#09090b", paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Feather name="shield-off" size={32} color="#ef4444" />
        </View>
        
        <Text style={styles.title}>Account Locked</Text>
        <Text style={styles.subtitle}>
          Your account has been temporarily suspended due to 7 consecutive failed login attempts. To protect your data, security measures have locked access.
        </Text>

        <View style={styles.timerContainer}>
          <Text style={styles.timerLabel}>ACCESS RESTORES IN</Text>
          <Text style={styles.timerValue}>{formatTime(timeLeft)}</Text>
        </View>

        <View style={styles.instructionWrap}>
          <Feather name="info" size={14} color="#a1a1aa" style={{ marginTop: 2 }} />
          <Text style={styles.instructionText}>
            You will be able to retry with the correct password after the timer expires, or reset your password if you forgot it.
          </Text>
        </View>

        <Pressable
          disabled={timeLeft > 0}
          onPress={handleTryAgain}
          style={({ pressed }) => [
            styles.btn,
            {
              backgroundColor: timeLeft > 0 ? "rgba(255,255,255,0.08)" : "#ffffff",
              opacity: pressed && timeLeft === 0 ? 0.9 : 1,
            },
          ]}
        >
          <Text
            style={[
              styles.btnText,
              { color: timeLeft > 0 ? "#71717a" : "#09090b" },
            ]}
          >
            {timeLeft > 0 ? "Locked" : "Try Logging In"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    backgroundColor: "#18181b",
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "rgba(239,68,68,0.2)",
    padding: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#a1a1aa",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  timerContainer: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  timerLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "#71717a",
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  timerValue: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
    fontVariant: ["tabular-nums"],
  },
  instructionWrap: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  instructionText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#71717a",
    lineHeight: 18,
  },
  btn: {
    width: "100%",
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
