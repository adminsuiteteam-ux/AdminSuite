import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  Vibration,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import DailyIframe from "@daily-co/react-native-daily-js";

import { useColors } from "@/hooks/useColors";
import { apiService } from "@/services/api";

// ─── Types ───────────────────────────────────────────────────────────────────

export type CallScreenParams = {
  callId: number;
  callType: "voice" | "video";
  roomUrl: string;
  roomName: string;
  token: string;
  calleeName: string;
  calleeInitials: string;
  isIncoming?: boolean;
};

type CallState =
  | "ringing"
  | "connecting"
  | "connected"
  | "ended"
  | "rejected"
  | "error";

type Participant = {
  user_id?: string;
  user_name?: string;
  audio: boolean;
  video: boolean;
  local: boolean;
};

// ─── Pulsing Ring Animation ───────────────────────────────────────────────────
function PulsingRing({ color }: { color: string }) {
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const ring3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 1800,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );

    const a1 = pulse(ring1, 0);
    const a2 = pulse(ring2, 600);
    const a3 = pulse(ring3, 1200);
    a1.start();
    a2.start();
    a3.start();
    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, []);

  const ringStyle = (anim: Animated.Value) => ({
    position: "absolute" as const,
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 2,
    borderColor: color,
    opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] }) }],
  });

  return (
    <View style={{ alignItems: "center", justifyContent: "center", width: 130, height: 130 }}>
      <Animated.View style={ringStyle(ring1)} />
      <Animated.View style={ringStyle(ring2)} />
      <Animated.View style={ringStyle(ring3)} />
    </View>
  );
}

// ─── Control Button ───────────────────────────────────────────────────────────
function ControlBtn({
  icon,
  label,
  onPress,
  active = true,
  danger = false,
  large = false,
  color,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  active?: boolean;
  danger?: boolean;
  large?: boolean;
  color?: string;
}) {
  const size = large ? 68 : 56;
  const iconSize = large ? 26 : 21;
  const bg = danger ? "#ef4444" : active ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.08)";
  const iconColor = color || (active ? "#fff" : "rgba(255,255,255,0.4)");

  return (
    <Pressable
      onPress={() => {
        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }}
      style={({ pressed }) => [
        styles.controlBtn,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg, opacity: pressed ? 0.75 : 1 },
      ]}
    >
      <Feather name={icon as any} size={iconSize} color={iconColor} />
      <Text style={styles.controlLabel}>{label}</Text>
    </Pressable>
  );
}

// ─── Main CallScreen ──────────────────────────────────────────────────────────
export default function CallScreen({ params }: { params: CallScreenParams }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const {
    callId,
    callType,
    roomUrl,
    token,
    calleeName,
    calleeInitials,
    isIncoming = false,
  } = params;

  const [callState, setCallState] = useState<CallState>(isIncoming ? "ringing" : "connecting");
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(callType === "video");
  const [speakerEnabled, setSpeakerEnabled] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  const callRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationAnim = useRef(new Animated.Value(0)).current;

  // ── Timer ──
  useEffect(() => {
    if (callState === "connected") {
      timerRef.current = setInterval(() => setCallDuration((d) => d + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [callState]);

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // ── Join Daily.co Room ──
  const joinRoom = useCallback(async () => {
    if (!roomUrl) {
      setCallState("error");
      setErrorMsg("No room URL provided. Please try again.");
      return;
    }
    try {
      setCallState("connecting");
      const call = DailyIframe.createCallObject();
      callRef.current = call;

      call.on("joined-meeting", () => {
        setCallState("connected");
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      });

      call.on("participant-joined", (e: any) => {
        setParticipants((prev) => [...prev, e.participant]);
      });

      call.on("participant-left", (e: any) => {
        setParticipants((prev) => prev.filter((p) => p.user_id !== e.participant.user_id));
      });

      call.on("participant-updated", (e: any) => {
        setParticipants((prev) =>
          prev.map((p) => (p.user_id === e.participant.user_id ? e.participant : p))
        );
      });

      call.on("left-meeting", () => {
        setCallState("ended");
      });

      call.on("error", (e: any) => {
        setCallState("error");
        setErrorMsg(e?.errorMsg || "A call error occurred.");
      });

      await call.join({
        url: roomUrl,
        ...(token ? { token } : {}),
        startVideoOff: callType === "voice",
        startAudioOff: false,
      });
    } catch (e: any) {
      setCallState("error");
      setErrorMsg(e?.message || "Failed to join call.");
    }
  }, [roomUrl, token, callType]);

  // ── Phone Ringing Cadence (Vibration loop) ──
  useEffect(() => {
    if (isIncoming && callState === "ringing") {
      // Cadence: [wait 0ms, vibrate 1000ms, pause 1000ms, vibrate 1000ms, pause 1500ms]
      const pattern = [0, 1000, 1000, 1000, 1500];
      Vibration.vibrate(pattern, true);

      // Auto missed-call timeout after 45 seconds
      const timeout = setTimeout(() => {
        Vibration.cancel();
        handleReject();
      }, 45000);

      return () => {
        Vibration.cancel();
        clearTimeout(timeout);
      };
    } else {
      Vibration.cancel();
    }
  }, [isIncoming, callState]);

  useEffect(() => {
    if (!isIncoming) {
      joinRoom();
    }
    return () => {
      Vibration.cancel();
      callRef.current?.destroy().catch(() => {});
    };
  }, []);

  // ── Hang up ──
  const handleHangUp = useCallback(async () => {
    Vibration.cancel();
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    callRef.current?.leave().catch(() => {});
    callRef.current?.destroy().catch(() => {});
    try {
      await apiService.endCall(callId, "ended");
    } catch {}
    setCallState("ended");
    setTimeout(() => router.back(), 800);
  }, [callId]);

  // ── Accept incoming ──
  const handleAccept = useCallback(() => {
    Vibration.cancel();
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    apiService.endCall(callId, "accepted").catch(() => {});
    joinRoom();
  }, [joinRoom, callId]);

  // ── Reject incoming ──
  const handleReject = useCallback(async () => {
    Vibration.cancel();
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    try {
      await apiService.endCall(callId, "rejected");
    } catch {}
    setCallState("rejected");
    setTimeout(() => router.back(), 600);
  }, [callId]);

  // ── Toggle mic ──
  const toggleMic = () => {
    if (!callRef.current) return;
    const next = !micEnabled;
    callRef.current.setLocalAudio(next);
    setMicEnabled(next);
  };

  // ── Toggle camera ──
  const toggleCamera = () => {
    if (!callRef.current) return;
    const next = !cameraEnabled;
    callRef.current.setLocalVideo(next);
    setCameraEnabled(next);
  };

  // ── Auto-end on callState ended ──
  useEffect(() => {
    if (callState === "ended" || callState === "rejected") {
      const t = setTimeout(() => router.back(), 1200);
      return () => clearTimeout(t);
    }
  }, [callState]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  const bgGradient = callType === "video"
    ? ["#09090b", "#18181b"]
    : [colors.primary + "CC", "#09090b"];

  const stateLabel = {
    ringing: isIncoming ? "Incoming call..." : "Calling...",
    connecting: "Connecting...",
    connected: formatDuration(callDuration),
    ended: "Call ended",
    rejected: "Call rejected",
    error: "Call failed",
  }[callState];

  return (
    <View style={[styles.container, { backgroundColor: "#09090b" }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Background */}
      <View style={StyleSheet.absoluteFill}>
        <View style={[styles.bgTop, { backgroundColor: callType === "video" ? "#18181b" : colors.primary + "60" }]} />
        <View style={[styles.bgBottom, { backgroundColor: "#09090b" }]} />
      </View>

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.callTypeLabel}>
          {callType === "video" ? "📹 Video Call" : "📞 Voice Call"}
        </Text>
        <Pressable onPress={() => Alert.alert("Minimize", "Minimize to continue call in background?")} style={styles.minimizeBtn} hitSlop={10}>
          <Feather name="minus" size={20} color="rgba(255,255,255,0.6)" />
        </Pressable>
      </View>

      {/* Center content */}
      <View style={styles.center}>
        {/* Avatar + pulse rings */}
        <View style={{ alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
          {callState === "ringing" || callState === "connecting" ? (
            <PulsingRing color={colors.primary} />
          ) : null}
          <View style={[styles.avatarCircle, {
            backgroundColor: colors.primary,
            position: callState === "ringing" || callState === "connecting" ? "absolute" : "relative",
          }]}>
            <Text style={styles.avatarTxt}>{calleeInitials}</Text>
          </View>
        </View>

        <Text style={styles.calleeName}>{calleeName}</Text>
        <View style={styles.stateRow}>
          {callState === "connecting" && (
            <ActivityIndicator size="small" color="rgba(255,255,255,0.6)" style={{ marginRight: 8 }} />
          )}
          <Text style={[
            styles.stateLabel,
            callState === "connected" ? styles.stateLabelConnected : {},
            (callState === "ended" || callState === "rejected" || callState === "error") ? styles.stateLabelEnded : {},
          ]}>
            {stateLabel}
          </Text>
        </View>

        {callState === "error" && (
          <Text style={styles.errorMsg}>{errorMsg}</Text>
        )}

        {/* Participants count when connected */}
        {callState === "connected" && participants.length > 0 && (
          <Text style={styles.participantsLabel}>
            {participants.length + 1} participant{participants.length > 0 ? "s" : ""}
          </Text>
        )}
      </View>

      {/* Controls */}
      <View style={[styles.controls, { paddingBottom: insets.bottom + 24 }]}>
        {/* Incoming call — accept / reject */}
        {callState === "ringing" && isIncoming ? (
          <View style={styles.incomingRow}>
            <View style={{ alignItems: "center", gap: 8 }}>
              <ControlBtn icon="phone-off" label="Decline" onPress={handleReject} danger large />
            </View>
            <View style={{ alignItems: "center", gap: 8 }}>
              <ControlBtn icon="phone" label="Accept" onPress={handleAccept} large color="#22c55e" />
            </View>
          </View>
        ) : callState === "connected" || callState === "connecting" ? (
          <>
            <View style={styles.controlsRow}>
              <ControlBtn icon={micEnabled ? "mic" : "mic-off"} label={micEnabled ? "Mute" : "Unmute"} onPress={toggleMic} active={micEnabled} />
              {callType === "video" && (
                <ControlBtn icon={cameraEnabled ? "video" : "video-off"} label={cameraEnabled ? "Camera" : "Camera off"} onPress={toggleCamera} active={cameraEnabled} />
              )}
              <ControlBtn icon={speakerEnabled ? "volume-2" : "volume-x"} label={speakerEnabled ? "Speaker" : "Earpiece"} onPress={() => setSpeakerEnabled((s) => !s)} active={speakerEnabled} />
              <ControlBtn icon="message-square" label="Chat" onPress={() => router.back()} />
            </View>
            <Pressable
              onPress={handleHangUp}
              style={({ pressed }) => [styles.hangUpBtn, { opacity: pressed ? 0.8 : 1 }]}
            >
              <Feather name="phone-off" size={28} color="#fff" />
            </Pressable>
          </>
        ) : null}

        {(callState === "ended" || callState === "rejected" || callState === "error") && (
          <Pressable onPress={() => router.back()} style={styles.backToChat}>
            <Feather name="arrow-left" size={18} color="#fff" />
            <Text style={styles.backToChatTxt}>Back to Chat</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bgTop: { position: "absolute", top: 0, left: 0, right: 0, height: "50%" },
  bgBottom: { position: "absolute", bottom: 0, left: 0, right: 0, height: "50%" },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  callTypeLabel: { color: "rgba(255,255,255,0.7)", fontSize: 13, fontFamily: "Inter_500Medium" },
  minimizeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  avatarCircle: { width: 110, height: 110, borderRadius: 55, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.4, shadowRadius: 20, elevation: 10 },
  avatarTxt: { color: "#fff", fontSize: 36, fontFamily: "Inter_700Bold" },
  calleeName: { color: "#fff", fontSize: 26, fontFamily: "Inter_700Bold", textAlign: "center", marginTop: 20 },
  stateRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  stateLabel: { color: "rgba(255,255,255,0.6)", fontSize: 15, fontFamily: "Inter_400Regular" },
  stateLabelConnected: { color: "#22c55e", fontFamily: "Inter_600SemiBold", fontSize: 16 },
  stateLabelEnded: { color: "rgba(255,255,255,0.4)", fontFamily: "Inter_500Medium" },
  errorMsg: { color: "#ef4444", fontSize: 13, textAlign: "center", paddingHorizontal: 32, marginTop: 8, fontFamily: "Inter_400Regular" },
  participantsLabel: { color: "rgba(255,255,255,0.4)", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 4 },
  controls: { paddingHorizontal: 24, gap: 24, alignItems: "center" },
  controlsRow: { flexDirection: "row", justifyContent: "space-around", width: "100%", gap: 12 },
  controlBtn: { alignItems: "center", justifyContent: "center", gap: 4 },
  controlLabel: { color: "rgba(255,255,255,0.6)", fontSize: 10, fontFamily: "Inter_500Medium", marginTop: 2 },
  hangUpBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#ef4444", alignItems: "center", justifyContent: "center", shadowColor: "#ef4444", shadowOpacity: 0.5, shadowRadius: 16, elevation: 8 },
  incomingRow: { flexDirection: "row", justifyContent: "space-around", width: "100%", paddingHorizontal: 20 },
  backToChat: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.1)", paddingVertical: 12, paddingHorizontal: 24, borderRadius: 24 },
  backToChatTxt: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
