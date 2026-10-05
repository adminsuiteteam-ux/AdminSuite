import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Clipboard,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  PanResponder,
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
import { apiService, getMediaUrl } from "@/services/api";
import { useTranslation } from "react-i18next";
import { ExpandableText } from "@/components/ExpandableText";

type Contact = {
  id: number | "group";
  type: "group" | "private";
  name: string;
  initials: string;
  avatar: string | null;
  group_locked?: boolean;
  is_blocked_from_group?: boolean;
  unread_count?: number;
  last_message?: string;
  last_message_time?: string;
  email?: string;
  phone?: string;
  role?: string;
  department?: string;
  employee_id?: number;
};

type ChatMessage = {
  id: number;
  sender_id: number;
  sender_name: string;
  sender_initials: string;
  sender_avatar: string | null;
  recipient_id: number | null;
  text: string;
  display_text: string;
  is_pinned: boolean;
  is_edited: boolean;
  is_deleted: boolean;
  reply_to_id: number | null;
  reply_to_text: string | null;
  reply_to_sender: string | null;
  created_at: string;
  updated_at: string;
};

const EMOJI_LIST = ["😀","😂","❤️","👍","👎","🔥","🎉","✅","❌","🙏","💯","😊","🤔","😎","👏","🚀","⭐","💪","🙌","😅","🥳","😢","😡","💬","📌"];

const REPORT_REASONS = [
  { id: "spam", label: "Spam or Unwanted Content", icon: "mail" },
  { id: "harassment", label: "Harassment or Bullying", icon: "alert-octagon" },
  { id: "inappropriate_content", label: "Inappropriate Content", icon: "eye-off" },
  { id: "hate_speech", label: "Hate Speech", icon: "slash" },
  { id: "impersonation", label: "Impersonation", icon: "user-x" },
  { id: "policy_violation", label: "Policy Violation", icon: "alert-triangle" },
  { id: "other", label: "Other", icon: "more-horizontal" },
];

// ─── Swipeable Message Row ───────────────────────────────────────────────────
function SwipeableMessage({ children, onReply, replyColor }: { children: React.ReactNode; onReply: () => void; replyColor: string }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const replyOpacity = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 8 && Math.abs(gs.dy) < 20,
      onPanResponderMove: (_, gs) => {
        if (gs.dx > 0 && gs.dx < 80) { translateX.setValue(gs.dx); replyOpacity.setValue(gs.dx / 80); }
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dx > 55) { if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); onReply(); }
        Animated.parallel([
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
          Animated.timing(replyOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
        ]).start();
      },
    })
  ).current;

  return (
    <View style={{ position: "relative" }}>
      <Animated.View style={[styles.swipeReplyIcon, { opacity: replyOpacity }]}>
        <Feather name="corner-up-left" size={18} color={replyColor} />
      </Animated.View>
      <Animated.View
        onStartShouldSetResponder={panResponder.panHandlers.onStartShouldSetResponder}
        onStartShouldSetResponderCapture={panResponder.panHandlers.onStartShouldSetResponderCapture}
        onMoveShouldSetResponder={panResponder.panHandlers.onMoveShouldSetResponder}
        onMoveShouldSetResponderCapture={panResponder.panHandlers.onMoveShouldSetResponderCapture}
        onResponderEnd={panResponder.panHandlers.onResponderEnd}
        onResponderGrant={panResponder.panHandlers.onResponderGrant}
        onResponderMove={panResponder.panHandlers.onResponderMove}
        onResponderReject={panResponder.panHandlers.onResponderReject}
        onResponderRelease={panResponder.panHandlers.onResponderRelease}
        onResponderStart={panResponder.panHandlers.onResponderStart}
        onResponderTerminationRequest={panResponder.panHandlers.onResponderTerminationRequest}
        onResponderTerminate={panResponder.panHandlers.onResponderTerminate}
        style={{ transform: [{ translateX }] }}
      >
        {children}
      </Animated.View>
    </View>
  );
}

// ─── Typing Indicator ────────────────────────────────────────────────────────
function TypingDots({ color }: { color: string }) {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(dot, { toValue: -5, duration: 300, useNativeDriver: true }),
        Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.delay(600),
      ]));
    const a1 = animate(dot1, 0); const a2 = animate(dot2, 200); const a3 = animate(dot3, 400);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, []);

  return (
    <View style={styles.typingRow}>
      {[dot1, dot2, dot3].map((dot, i) => (
        <Animated.View key={i} style={[styles.typingDot, { backgroundColor: color, transform: [{ translateY: dot }] }]} />
      ))}
    </View>
  );
}

export default function EmployeeChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const isDark = colors.isDark;
  const myId = user?.id;

  // ── Core State ──
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editingMsg, setEditingMsg] = useState<ChatMessage | null>(null);
  const [selectedMsg, setSelectedMsg] = useState<ChatMessage | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ── List view state ──
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "unread" | "groups" | "archive">("all");
  const [typingStatus, setTypingStatus] = useState("");
  const [typingStatuses, setTypingStatuses] = useState<any[]>([]);

  // ── New features ──
  const [showInChatSearch, setShowInChatSearch] = useState(false);
  const [inChatSearchQuery, setInChatSearchQuery] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showContactProfile, setShowContactProfile] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("spam");
  const [reportDetails, setReportDetails] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const lastTypingSentRef = useRef<number>(0);
  const draftsRef = useRef<Record<string, string>>({});

  useEffect(() => {
    router.setParams({ showDetail: activeContact ? "true" : "false" });
  }, [activeContact]);

  // ── Load contacts ──
  const loadContacts = useCallback(async () => {
    try {
      const res = await apiService.getChatContacts();
      const data: Contact[] = res.data;
      const sorted = [...data].sort((a, b) => {
        const ta = a.last_message_time ? new Date(a.last_message_time).getTime() : 0;
        const tb = b.last_message_time ? new Date(b.last_message_time).getTime() : 0;
        return tb - ta;
      });
      setContacts(sorted);
      setActiveContact((prev) => {
        if (!prev) return null;
        const updated = sorted.find((c) => c.id === prev.id);
        return updated || prev;
      });
    } catch {
      showToast({ title: "Error", message: "Could not load contacts.", type: "error" });
    }
  }, [showToast]);

  useEffect(() => {
    setLoadingContacts(true);
    loadContacts().finally(() => setLoadingContacts(false));
  }, [loadContacts]);

  useEffect(() => {
    if (activeContact) return;
    const interval = setInterval(loadContacts, 8000);
    return () => clearInterval(interval);
  }, [loadContacts, activeContact]);

  // ── Load messages ──
  const fetchMessages = useCallback(async () => {
    if (!activeContact) return;
    const cid = activeContact.id;
    const ctype = activeContact.type;
    try {
      let res;
      if (ctype === "group") {
        if (cid === "group") res = await apiService.getChatMessages("group");
        else res = await apiService.getChatMessages(undefined, cid as number);
      } else {
        res = await apiService.getChatMessages(cid as number);
      }
      setMessages(res.data);
    } catch {}
  }, [activeContact?.id, activeContact?.type]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMessages();
    setRefreshing(false);
  }, [fetchMessages]);

  useEffect(() => {
    if (!activeContact) return;
    setLoadingMessages(true);
    fetchMessages().finally(() => setLoadingMessages(false));
  }, [activeContact?.id, fetchMessages]);

  // ── Poll messages ──
  useEffect(() => {
    if (!activeContact) return;
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [activeContact?.id, fetchMessages]);

  // ── Typing status ──
  const handleTextChange = (text: string) => {
    setInputText(text);
    if (!activeContact) return;
    draftsRef.current[String(activeContact.id)] = text;
    const now = Date.now();
    const trimmed = text.trim();
    if (trimmed.length === 0) {
      lastTypingSentRef.current = 0;
      const payload: any = { is_typing: false };
      if (activeContact.type === "group") { if (activeContact.id !== "group") payload.group_id = activeContact.id; }
      else payload.recipient_id = activeContact.id;
      apiService.sendChatTyping(payload).catch(() => {});
    } else if (now - lastTypingSentRef.current > 3000) {
      lastTypingSentRef.current = now;
      const payload: any = { is_typing: true };
      if (activeContact.type === "group") { if (activeContact.id !== "group") payload.group_id = activeContact.id; }
      else payload.recipient_id = activeContact.id;
      apiService.sendChatTyping(payload).catch(() => {});
    }
  };

  useEffect(() => {
    if (!activeContact) { setTypingStatus(""); return; }
    const checkTyping = async () => {
      try {
        const cid = activeContact.id; const ctype = activeContact.type;
        let res;
        if (ctype === "group") {
          if (cid === "group") res = await apiService.getChatTypingStatus("group");
          else res = await apiService.getChatTypingStatus(undefined, cid as number);
        } else { res = await apiService.getChatTypingStatus(cid as number); }
        const typingUsers = res.data.typing_users || [];
        if (typingUsers.length === 0) setTypingStatus("");
        else if (typingUsers.length === 1) setTypingStatus(ctype === "group" ? `${typingUsers[0].name} is typing...` : "typing...");
        else setTypingStatus(`${typingUsers.length} people typing...`);
      } catch { setTypingStatus(""); }
    };
    const interval = setInterval(checkTyping, 3000);
    checkTyping();
    return () => clearInterval(interval);
  }, [activeContact?.id, activeContact?.type]);

  useEffect(() => {
    if (activeContact) return;
    const checkAllTyping = async () => {
      try { const res = await apiService.getChatTypingStatus("all"); setTypingStatuses(res.data.typing_users || []); }
      catch { setTypingStatuses([]); }
    };
    const interval = setInterval(checkAllTyping, 3000);
    checkAllTyping();
    return () => clearInterval(interval);
  }, [activeContact]);

  const getContactTypingStatus = (c: Contact) => {
    const isGroup = c.id === "group"; const isCustomGroup = c.type === "group" && c.id !== "group";
    const matches = typingStatuses.filter((ts) => {
      if (isGroup) return ts.is_general_group === true;
      if (isCustomGroup) return ts.group_id === c.id;
      return ts.recipient_id === myId && ts.id === c.id;
    });
    if (matches.length === 0) return null;
    if (isGroup || isCustomGroup) { if (matches.length === 1) return `${matches[0].name} is typing...`; return `${matches.length} people typing...`; }
    return "typing...";
  };

  // ── Send message ──
  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || sending) return;

    if (editingMsg) {
      setSending(true);
      try {
        await apiService.editChatMessage(editingMsg.id, text);
        setMessages((prev) => prev.map((m) => m.id === editingMsg.id ? { ...m, text, display_text: text, is_edited: true } : m));
        setEditingMsg(null); setInputText("");
      } catch { showToast({ title: "Error", message: "Failed to edit message.", type: "error" }); }
      finally { setSending(false); }
      return;
    }

    const tempId = -Date.now();
    const optimisticMsg: ChatMessage = {
      id: tempId, sender_id: myId ?? 0,
      sender_name: (user as any)?.first_name ? `${(user as any).first_name} ${(user as any).last_name || ""}`.trim() : (user?.username || "You"),
      sender_initials: ((user as any)?.first_name?.[0] || user?.username?.[0] || "U").toUpperCase(),
      sender_avatar: (user as any)?.avatar || null,
      recipient_id: activeContact?.type === "group" ? null : (activeContact?.id as number),
      text, display_text: text, is_pinned: false, is_edited: false, is_deleted: false,
      reply_to_id: replyTo ? replyTo.id : null,
      reply_to_text: replyTo ? replyTo.text : null,
      reply_to_sender: replyTo ? replyTo.sender_name : null,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };

    setInputText("");
    const savedReply = replyTo;
    setReplyTo(null);
    setMessages((prev) => [...prev, optimisticMsg]);

    if (activeContact) {
      const now = new Date().toISOString();
      setContacts((prev) => {
        const updated = prev.map((c) => String(c.id) === String(activeContact.id) ? { ...c, last_message: text, last_message_time: now, unread_count: 0 } : c);
        return [...updated].sort((a, b) => {
          const ta = a.last_message_time ? new Date(a.last_message_time).getTime() : 0;
          const tb = b.last_message_time ? new Date(b.last_message_time).getTime() : 0;
          return tb - ta;
        });
      });
    }

    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 40);
    lastTypingSentRef.current = 0;
    const tPayload: any = { is_typing: false };
    if (activeContact?.type === "group") { if (activeContact.id !== "group") tPayload.group_id = activeContact.id; }
    else if (activeContact?.id) tPayload.recipient_id = activeContact.id;
    apiService.sendChatTyping(tPayload).catch(() => {});
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    const payload: any = { text };
    if (activeContact?.type === "group") { if (activeContact.id !== "group") payload.group_id = activeContact.id; }
    else if (activeContact?.id) payload.recipient_id = activeContact.id;
    if (savedReply) payload.reply_to_id = savedReply.id;

    try {
      const res = await apiService.sendChatMessage(payload);
      if (res.data) {
        if (activeContact) delete draftsRef.current[String(activeContact.id)];
        setMessages((prev) => prev.map((m) => (m.id === tempId ? res.data : m)));
      }
    } catch (err: any) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInputText(text);
      if (activeContact) draftsRef.current[String(activeContact.id)] = text;
      const errMsg = err?.response?.data?.error || err?.response?.data?.message || err?.message || "Failed to send message.";
      showToast({ title: "Error", message: errMsg, type: "error" });
    }
  };

  // ── Message actions ──
  const openMessageActions = (msg: ChatMessage) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setSelectedMsg(msg); setShowActionSheet(true);
  };

  const handleAction = async (action: string) => {
    setShowActionSheet(false);
    if (!selectedMsg) return;
    switch (action) {
      case "reply": setReplyTo(selectedMsg); setEditingMsg(null); break;
      case "copy":
        Clipboard.setString(selectedMsg.text);
        showToast({ title: "Copied", message: "Message copied to clipboard.", type: "success" }); break;
      case "edit":
        if (selectedMsg.sender_id === user?.id) { setEditingMsg(selectedMsg); setInputText(selectedMsg.text); setReplyTo(null); } break;
      case "pin":
        try { await apiService.pinChatMessage(selectedMsg.id); await fetchMessages(); }
        catch { showToast({ title: "Error", message: t("chat.couldNotPin"), type: "error" }); }
        break;
      case "delete":
        if (selectedMsg.sender_id === user?.id) {
          Alert.alert(t("chat.deleteMessage"), t("chat.deleteMessageConfirm"), [
            { text: t("settings.cancel"), style: "cancel" },
            { text: t("chat.actions.delete"), style: "destructive", onPress: async () => {
              try { await apiService.deleteChatMessage(selectedMsg.id); await fetchMessages(); }
              catch { showToast({ title: "Error", message: t("chat.couldNotDelete"), type: "error" }); }
            }},
          ]);
        }
        break;
    }
    setSelectedMsg(null);
  };

  // ── Report ──
  const handleSubmitReport = async () => {
    if (!activeContact || typeof activeContact.id !== "number") return;
    setSubmittingReport(true);
    try {
      await apiService.reportChatUser({ reported_user_id: activeContact.id as number, reason: reportReason, details: reportDetails });
      showToast({ title: "Report Submitted", message: "Thank you. The report has been sent to administrators for review.", type: "success" });
      setShowReportModal(false); setReportReason("spam"); setReportDetails("");
    } catch { showToast({ title: "Error", message: "Could not submit report. Please try again.", type: "error" }); }
    finally { setSubmittingReport(false); }
  };

  // ── Call helpers ──
  const handleInitiateCall = async (type: "voice" | "video") => {
    if (!activeContact || typeof activeContact.id !== "number") return;
    try {
      showToast({ title: type === "voice" ? "📞 Starting Call..." : "📹 Starting Video...", message: `Connecting with ${activeContact.name}`, type: "info" });
      const res = await apiService.initiateCall({
        call_type: type,
        callee_id: activeContact.id as number,
      });
      const { id: callId, room_url, room_name, token } = res.data;
      if (!room_url) {
        showToast({ title: "Call Failed", message: "Server did not provide a room URL. Please try again.", type: "error" });
        return;
      }

      // Navigate to CallScreen directly without posting link text into chat
      router.push({
        pathname: "/call",
        params: {
          callId,
          callType: type,
          roomUrl: room_url,
          roomName: room_name || "",
          token: token || "",
          calleeName: activeContact.name,
          calleeInitials: activeContact.initials,
        },
      });
    } catch (e: any) {
      showToast({ title: "Call Failed", message: e?.response?.data?.error || "Could not start call.", type: "error" });
    }
  };

  // ── Header menu actions ──
  const handleHeaderMenuAction = (actionId: string) => {
    if (!activeContact) return;
    if (actionId === "info") setShowContactProfile(true);
    else if (actionId === "search") setShowInChatSearch(true);
    else if (actionId === "voice") handleInitiateCall("voice");
    else if (actionId === "video") handleInitiateCall("video");
    else if (actionId === "mute") {
      setIsMuted((m) => { const next = !m; showToast({ title: next ? "Muted" : "Unmuted", message: next ? "Notifications muted." : "Notifications enabled.", type: "info" }); return next; });
    } else if (actionId === "clear") {
      Alert.alert("Clear Chat", `Clear all messages with ${activeContact.name}?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Clear", style: "destructive", onPress: () => { setMessages([]); showToast({ title: "Chat Cleared", message: "All messages cleared.", type: "success" }); } },
      ]);
    } else if (actionId === "report") setShowReportModal(true);
  };

  // ── Helpers ──
  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const formatContactTime = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso); const now = new Date();
    if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const isGroup = activeContact?.id === "group";
  const isLocked = isGroup && activeContact?.group_locked;
  const isBlocked = isGroup && activeContact?.is_blocked_from_group;
  const isDisabled = isLocked || isBlocked;

  const filteredContacts = contacts.filter((c) => {
    const matchesSearch = !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === "all" || (activeFilter === "unread" && (c.unread_count ?? 0) > 0) || (activeFilter === "groups" && c.type === "group") || (activeFilter === "archive" && false);
    return matchesSearch && matchesFilter;
  });

  const displayedMessages = inChatSearchQuery.trim()
    ? messages.filter((m) => m.display_text?.toLowerCase().includes(inChatSearchQuery.toLowerCase()))
    : messages;

  // ── Render message ──
  const renderMessage = ({ item: msg }: { item: ChatMessage }) => {
    const mine = msg.sender_id === myId;
    const bubbleBg = mine ? colors.primary : isDark ? "#27272a" : "#e4e4e7";
    const textColor = mine ? (colors.primaryForeground || "#fff") : colors.foreground;
    return (
      <SwipeableMessage onReply={() => { setReplyTo(msg); setEditingMsg(null); }} replyColor={colors.primary}>
        <Pressable onLongPress={() => !msg.is_deleted && openMessageActions(msg)} delayLongPress={350} style={[styles.msgRow, mine ? styles.msgRight : styles.msgLeft]}>
          {!mine && (
            <View style={[styles.avatar, { backgroundColor: colors.primary + "30", overflow: "hidden", borderWidth: 1.5, borderColor: colors.primary + "40" }]}>
              {msg.sender_avatar ? (<Image source={{ uri: getMediaUrl(msg.sender_avatar) }} style={{ width: "100%", height: "100%" }} />) : (<Text style={[styles.avatarTxt, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>{msg.sender_initials}</Text>)}
            </View>
          )}
          <View style={[styles.msgContent, { maxWidth: "75%" }]}>
            {!mine && (<Text style={[styles.senderName, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>{msg.sender_name}</Text>)}
            {msg.reply_to_id && msg.reply_to_text && (
              <View style={[styles.replyPreview, { borderLeftColor: mine ? "rgba(255,255,255,0.6)" : colors.primary, backgroundColor: mine ? "rgba(255,255,255,0.15)" : colors.primary + "18" }]}>
                <Text style={[styles.replyName, { color: mine ? "rgba(255,255,255,0.85)" : colors.primary, fontFamily: "Inter_600SemiBold" }]}>{msg.reply_to_sender}</Text>
                <Text style={[styles.replyText, { color: mine ? "rgba(255,255,255,0.75)" : colors.mutedForeground, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>{msg.reply_to_text}</Text>
              </View>
            )}
            <View style={[styles.bubble, { backgroundColor: bubbleBg, borderTopRightRadius: mine ? 4 : 18, borderTopLeftRadius: mine ? 18 : 4 }]}>
              <ExpandableText text={msg.display_text} style={[styles.bubbleText, { fontFamily: "Inter_400Regular" }]} textColor={textColor} activeColor={mine ? textColor : colors.primary} />
            </View>
            <View style={[styles.metaRow, mine ? { justifyContent: "flex-end" } : {}]}>
              {msg.is_pinned && <Feather name="bookmark" size={10} color={colors.accent} style={{ marginRight: 4 }} />}
              {msg.is_edited && !msg.is_deleted && (<Text style={[styles.metaText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{t("chat.edited")} · </Text>)}
              <Text style={[styles.metaText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{formatTime(msg.created_at)}</Text>
            </View>
          </View>
        </Pressable>
      </SwipeableMessage>
    );
  };

  // ── Loading ──
  if (loadingContacts) {
    return (<View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} size="large" /></View>);
  }

  // ── Contact list ──
  if (!activeContact) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.headerRow, { paddingTop: insets.top + 8, backgroundColor: isDark ? "#09090b" : "#fff", borderBottomColor: colors.border }]}>
          {showSearch ? (
            <View style={[styles.searchBar, { backgroundColor: isDark ? "#27272a" : "#f4f4f5", borderColor: colors.border, flex: 1 }]}>
              <Feather name="search" size={15} color={colors.mutedForeground} />
              <TextInput value={searchQuery} onChangeText={setSearchQuery} placeholder="Search chats..." placeholderTextColor={colors.mutedForeground} style={[styles.searchInput, { color: colors.text }]} autoFocus />
              <Pressable onPress={() => { setSearchQuery(""); setShowSearch(false); }}><Feather name="x" size={16} color={colors.mutedForeground} /></Pressable>
            </View>
          ) : (
            <>
              <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]} hitSlop={8}>
                <Feather name="arrow-left" size={22} color={colors.foreground} />
              </Pressable>
              <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_700Bold", flex: 1 }]}>{t("chat.messages") || "Messages"}</Text>
              <Pressable onPress={() => setShowSearch(true)} style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]} hitSlop={8}>
                <Feather name="search" size={20} color={colors.foreground} />
              </Pressable>
            </>
          )}
        </View>

        <View style={[styles.filterRow, { borderBottomColor: colors.border }]}>
          {(["all", "unread", "groups", "archive"] as const).map((filter) => {
            const active = activeFilter === filter;
            const hasUnread = filter === "unread" && contacts.some((c) => (c.unread_count ?? 0) > 0);
            return (
              <Pressable key={filter} onPress={() => setActiveFilter(filter)} style={[styles.filterTab, { backgroundColor: active ? colors.primary + "1A" : "transparent" }]}>
                <Text style={[styles.filterTabTxt, { color: active ? colors.primary : colors.mutedForeground, fontFamily: active ? "Inter_600SemiBold" : "Inter_500Medium", textTransform: "capitalize" }]}>{filter}</Text>
                {filter === "unread" && hasUnread && (<View style={[styles.filterTabDot, { backgroundColor: colors.danger }]} />)}
              </Pressable>
            );
          })}
        </View>

        {filteredContacts.length === 0 ? (
          <View style={styles.center}>
            <Feather name="message-square" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>{searchQuery ? "No results found." : "No conversations yet."}</Text>
          </View>
        ) : (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
            <View style={{ paddingVertical: 8 }}>
              {filteredContacts.map((contact) => {
                const isGroupContact = contact.id === "group";
                const unread = contact.unread_count ?? 0;
                return (
                  <Pressable key={String(contact.id)}
                    onPress={() => {
                      setContacts((prev) => prev.map((c) => (c.id === contact.id ? { ...c, unread_count: 0 } : c)));
                      setActiveContact({ ...contact, unread_count: 0 });
                      setMessages([]);
                      setInputText(draftsRef.current[String(contact.id)] || "");
                      setReplyTo(null);
                      setEditingMsg(null);
                      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    }}
                    style={({ pressed }) => [styles.contactRowFull, { backgroundColor: pressed ? colors.card : "transparent", borderBottomColor: colors.border }]}
                  >
                    <View style={[styles.contactAvatarLarge, { backgroundColor: isGroupContact ? colors.primary : colors.accent, overflow: "hidden" }]}>
                      {contact.avatar ? (<Image source={{ uri: getMediaUrl(contact.avatar) }} style={{ width: "100%", height: "100%" }} />) : (<Text style={[styles.contactAvatarTxtLarge, { color: isGroupContact ? colors.primaryForeground : (colors.accentForeground || "#fff"), fontFamily: "Inter_700Bold" }]}>{contact.initials}</Text>)}
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text numberOfLines={1} style={[styles.contactNameLarge, { color: colors.foreground, fontFamily: unread > 0 ? "Inter_700Bold" : "Inter_600SemiBold" }]}>{contact.name}</Text>
                      {(() => {
                        const typingTxt = getContactTypingStatus(contact);
                        return (<Text style={[styles.contactSubLarge, { color: typingTxt ? colors.primary : colors.mutedForeground, fontFamily: typingTxt ? "Inter_600SemiBold" : "Inter_400Regular" }]} numberOfLines={1}>{typingTxt ? typingTxt : (contact.last_message || (isGroupContact ? "Company group chat" : "Direct message"))}</Text>);
                      })()}
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 4 }}>
                      {contact.last_message_time && (<Text style={[styles.contactTime, { color: unread > 0 ? colors.primary : colors.mutedForeground, fontFamily: unread > 0 ? "Inter_600SemiBold" : "Inter_400Regular" }]}>{formatContactTime(contact.last_message_time)}</Text>)}
                      {unread > 0 ? (
                        <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}><Text style={styles.unreadBadgeTxt}>{unread > 99 ? "99+" : unread}</Text></View>
                      ) : (<Feather name="chevron-right" size={16} color={colors.mutedForeground} />)}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        )}
      </View>
    );
  }

  // ── Active chat ──
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
      >
        {/* Top Bar */}
        <View style={[styles.topBar, { paddingTop: insets.top + 8, backgroundColor: isDark ? "#09090b" : "#fff", borderBottomColor: colors.border }]}>
          <Pressable onPress={() => {
            if (activeContact) draftsRef.current[String(activeContact.id)] = inputText;
            setActiveContact(null);
            setInputText("");
            setReplyTo(null);
            setEditingMsg(null);
            setShowInChatSearch(false);
            setInChatSearchQuery("");
            setShowEmojiPicker(false);
          }} style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]} hitSlop={8}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </Pressable>

          {/* Tappable header → contact profile */}
          <Pressable onPress={() => { if (!isGroup) setShowContactProfile(true); }} style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
            <View style={[styles.headerAvatar, { backgroundColor: activeContact.type === "group" ? colors.primary : colors.accent, overflow: "hidden" }]}>
              {activeContact.avatar ? (<Image source={{ uri: getMediaUrl(activeContact.avatar) }} style={{ width: "100%", height: "100%" }} />) : (<Text style={[styles.headerAvatarTxt, { color: activeContact.type === "group" ? colors.primaryForeground : (colors.accentForeground || "#fff"), fontFamily: "Inter_700Bold" }]}>{activeContact.initials}</Text>)}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.headerName, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{activeContact.name}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                {typingStatus ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <TypingDots color={colors.primary} />
                    <Text style={[styles.headerSub, { color: colors.primary, fontFamily: "Inter_400Regular" }]}>{typingStatus}</Text>
                  </View>
                ) : (
                  <Text style={[styles.headerSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    {isGroup ? t("chat.teamGroupChat") : "Tap for contact info"}
                  </Text>
                )}
                {!typingStatus && isGroup && isLocked && (<View style={[styles.lockBadge, { backgroundColor: (colors.warning ?? "#f59e0b") + "20" }]}><Feather name="lock" size={9} color={colors.warning ?? "#f59e0b"} /><Text style={[styles.lockBadgeTxt, { color: colors.warning ?? "#f59e0b", fontFamily: "Inter_600SemiBold" }]}>{t("chat.locked")}</Text></View>)}
                {!typingStatus && isGroup && isBlocked && (<View style={[styles.lockBadge, { backgroundColor: colors.danger + "20" }]}><Feather name="slash" size={9} color={colors.danger} /><Text style={[styles.lockBadgeTxt, { color: colors.danger, fontFamily: "Inter_600SemiBold" }]}>{t("chat.blocked")}</Text></View>)}
              </View>
            </View>
          </Pressable>

          {/* Action buttons */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
            {!isGroup ? (
              <>
                <Pressable onPress={() => handleInitiateCall("voice")} style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]} hitSlop={6}>
                  <Feather name="phone" size={18} color={colors.foreground} />
                </Pressable>
                <Pressable onPress={() => handleInitiateCall("video")} style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]} hitSlop={6}>
                  <Feather name="video" size={18} color={colors.foreground} />
                </Pressable>
              </>
            ) : null}
            <Pressable onPress={() => { setShowInChatSearch((s) => !s); if (showInChatSearch) setInChatSearchQuery(""); }} style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]} hitSlop={6}>
              <Feather name={showInChatSearch ? "x" : "search"} size={18} color={showInChatSearch ? colors.primary : colors.foreground} />
            </Pressable>
            <Pressable onPress={() => setShowHeaderMenu(true)} style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]} hitSlop={6}>
              <Feather name="more-vertical" size={20} color={colors.foreground} />
            </Pressable>
          </View>
        </View>

        {/* In-Chat Search Bar */}
        {showInChatSearch && (
          <View style={[styles.inChatSearchBar, { backgroundColor: isDark ? "#18181b" : "#f4f4f5", borderBottomColor: colors.border }]}>
            <Feather name="search" size={16} color={colors.mutedForeground} />
            <TextInput value={inChatSearchQuery} onChangeText={setInChatSearchQuery} placeholder="Search in this chat..." placeholderTextColor={colors.mutedForeground} style={[styles.inChatSearchInput, { color: colors.foreground, fontFamily: "Inter_400Regular" }]} autoFocus />
            {inChatSearchQuery.length > 0 && (<Pressable onPress={() => setInChatSearchQuery("")} hitSlop={6}><Feather name="x-circle" size={16} color={colors.mutedForeground} /></Pressable>)}
          </View>
        )}

        {/* Messages */}
        <View style={{ flex: 1 }}>
          {loadingMessages ? (
            <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={displayedMessages}
              keyExtractor={(m) => m.id.toString()}
              renderItem={renderMessage}
              contentContainerStyle={[styles.listContent, { paddingBottom: 16 }]}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
              showsVerticalScrollIndicator={false}
              refreshing={refreshing}
              onRefresh={handleRefresh}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              ListEmptyComponent={
                <View style={styles.emptyList}>
                  <Feather name="message-circle" size={36} color={colors.mutedForeground} />
                  <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{inChatSearchQuery.trim() ? "No matching messages found." : t("chat.noMessages")}</Text>
                </View>
              }
            />
          )}

          {/* Reply / Edit bar */}
          {(replyTo || editingMsg) && (
            <View style={[styles.replyBar, { backgroundColor: isDark ? "#18181b" : "#f4f4f5", borderTopColor: colors.border }]}>
              <View style={[styles.replyBarAccent, { backgroundColor: editingMsg ? colors.accent : colors.primary }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.replyBarLabel, { color: editingMsg ? colors.accent : colors.primary, fontFamily: "Inter_600SemiBold" }]}>{editingMsg ? t("chat.editMessage") : t("chat.replyTo", { name: replyTo?.sender_name })}</Text>
                <Text style={[styles.replyBarText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>{editingMsg ? editingMsg.text : replyTo?.text}</Text>
              </View>
              <Pressable onPress={() => { setReplyTo(null); setEditingMsg(null); setInputText(""); }} hitSlop={8}>
                <Feather name="x" size={18} color={colors.mutedForeground} />
              </Pressable>
            </View>
          )}

          {/* Emoji Picker */}
          {showEmojiPicker && (
            <View style={[styles.emojiPickerContainer, { backgroundColor: isDark ? "#18181b" : "#fff", borderTopColor: colors.border }]}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.emojiScroll}>
                {EMOJI_LIST.map((em) => (
                  <Pressable key={em} onPress={() => { if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); setInputText((prev) => prev + em); }} style={styles.emojiTouch}>
                    <Text style={styles.emojiGlyph}>{em}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Input bar */}
          <View style={[styles.inputBar, { paddingBottom: isKeyboardOpen ? 8 : Math.max(insets.bottom, 10), backgroundColor: isDark ? "#09090b" : "#fff", borderTopColor: colors.border }]}>
            {isDisabled ? (
              <View style={[styles.lockBanner, { backgroundColor: isBlocked ? colors.danger + "15" : (colors.warning ?? "#f59e0b") + "15", borderColor: isBlocked ? colors.danger + "30" : (colors.warning ?? "#f59e0b") + "30" }]}>
                <Feather name={isBlocked ? "slash" : "lock"} size={14} color={isBlocked ? colors.danger : (colors.warning ?? "#f59e0b")} />
                <Text style={[styles.lockBannerText, { color: isBlocked ? colors.danger : (colors.warning ?? "#f59e0b"), fontFamily: "Inter_600SemiBold" }]}>{isBlocked ? t("chat.blockedFromGroup") : t("chat.groupLocked")}</Text>
              </View>
            ) : (
              <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
                {/* Emoji toggle */}
                <Pressable onPress={() => setShowEmojiPicker((v) => !v)} style={({ pressed }) => [styles.emojiToggleBtn, { opacity: pressed ? 0.7 : 1 }]} hitSlop={6}>
                  <Feather name="smile" size={22} color={showEmojiPicker ? colors.accent : colors.mutedForeground} />
                </Pressable>
                <View style={[styles.inputWrap, { flex: 1, backgroundColor: isDark ? "#27272a" : "#f4f4f5", borderColor: colors.border }]}>
                  <TextInput
                    value={inputText}
                    onChangeText={handleTextChange}
                    placeholder={editingMsg ? t("chat.editPlaceholder") : t("chat.typePlaceholder")}
                    placeholderTextColor={colors.mutedForeground}
                    multiline
                    onFocus={() => { setIsKeyboardOpen(true); setShowEmojiPicker(false); setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80); }}
                    onBlur={() => setIsKeyboardOpen(false)}
                    style={[styles.input, { color: colors.text, fontFamily: "Inter_400Regular" }]}
                    onSubmitEditing={handleSend}
                  />
                  <Pressable onPress={handleSend} disabled={!inputText.trim() || sending} style={({ pressed }) => [styles.sendBtn, { backgroundColor: inputText.trim() ? colors.primary : (isDark ? "#27272a" : "#e4e4e7"), opacity: pressed ? 0.8 : 1 }]}>
                    {sending ? (<ActivityIndicator size={14} color={inputText.trim() ? (colors.primaryForeground || "#fff") : (isDark ? "#52525b" : "#a1a1aa")} />) : (<Feather name={editingMsg ? "check" : "send"} size={16} color={inputText.trim() ? (colors.primaryForeground || "#fff") : (isDark ? "#52525b" : "#a1a1aa")} />)}
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Message Action Modal */}
        <Modal visible={showActionSheet} transparent animationType="slide" onRequestClose={() => setShowActionSheet(false)}>
          <Pressable style={styles.backdrop} onPress={() => setShowActionSheet(false)}>
            <View style={[styles.actionSheet, { backgroundColor: isDark ? "#18181b" : "#fff", borderColor: colors.border }]}>
              <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
              {[
                ...(!isDisabled ? [{ id: "reply", icon: "corner-up-left", label: t("chat.actions.reply") }] : []),
                { id: "copy", icon: "copy", label: t("chat.actions.copy") },
                ...(selectedMsg?.sender_id === myId && !selectedMsg?.is_deleted && !isDisabled ? [{ id: "edit", icon: "edit-2", label: t("chat.actions.edit") }, { id: "delete", icon: "trash-2", label: t("chat.actions.delete"), danger: true }] : []),
                { id: "pin", icon: "bookmark", label: selectedMsg?.is_pinned ? t("chat.actions.unpin") : t("chat.actions.pin") },
              ].map((action) => (
                <Pressable key={action.id} onPress={() => handleAction(action.id)} style={({ pressed }) => [styles.actionItem, { opacity: pressed ? 0.7 : 1, borderBottomColor: colors.border }]}>
                  <Feather name={action.icon as any} size={18} color={(action as any).danger ? colors.danger : colors.foreground} />
                  <Text style={[styles.actionLabel, { color: (action as any).danger ? colors.danger : colors.foreground, fontFamily: "Inter_500Medium" }]}>{action.label}</Text>
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Modal>

        {/* Header ⋮ Menu */}
        <Modal visible={showHeaderMenu} transparent animationType="fade" onRequestClose={() => setShowHeaderMenu(false)}>
          <Pressable style={styles.backdrop} onPress={() => setShowHeaderMenu(false)}>
            <View style={[styles.headerMenuSheet, { backgroundColor: isDark ? "#18181b" : "#fff", borderColor: colors.border }]}>
              {[
                ...(!isGroup ? [{ id: "info", icon: "user", label: "Contact Info" }] : []),
                { id: "search", icon: "search", label: "Search Messages" },
                ...(!isGroup ? [{ id: "voice", icon: "phone", label: "Voice Call" }, { id: "video", icon: "video", label: "Video Call" }] : []),
                { id: "mute", icon: isMuted ? "bell" : "bell-off", label: isMuted ? "Unmute" : "Mute Notifications" },
                { id: "clear", icon: "trash-2", label: "Clear Chat", danger: true },
                ...(!isGroup ? [{ id: "report", icon: "alert-triangle", label: "Report User", danger: true }] : []),
              ].map((item, i, arr) => (
                <Pressable key={item.id} onPress={() => { setShowHeaderMenu(false); handleHeaderMenuAction(item.id); }} style={({ pressed }) => [styles.headerMenuItem, { borderBottomWidth: i === arr.length - 1 ? 0 : StyleSheet.hairlineWidth, borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 }]}>
                  <Feather name={item.icon as any} size={16} color={(item as any).danger ? colors.danger : colors.foreground} />
                  <Text style={[styles.headerMenuLabel, { color: (item as any).danger ? colors.danger : colors.foreground, fontFamily: "Inter_500Medium" }]}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Modal>

        {/* Contact Profile Modal */}
        <Modal visible={showContactProfile} transparent animationType="slide" onRequestClose={() => setShowContactProfile(false)}>
          <Pressable style={styles.backdrop} onPress={() => setShowContactProfile(false)}>
            <Pressable style={[styles.contactProfileSheet, { backgroundColor: isDark ? "#18181b" : "#fff", borderColor: colors.border }]} onPress={(e) => e.stopPropagation()}>
              <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <Text style={{ color: colors.foreground, fontSize: 16, fontFamily: "Inter_700Bold" }}>Contact Info</Text>
                <Pressable onPress={() => setShowContactProfile(false)} hitSlop={8}><Feather name="x" size={20} color={colors.mutedForeground} /></Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
                {/* Avatar */}
                <View style={{ alignItems: "center", marginBottom: 16, gap: 8 }}>
                  <View style={{ position: "relative" }}>
                    <View style={[styles.fullProfileAvatar, { backgroundColor: colors.accent, overflow: "hidden" }]}>
                      {activeContact.avatar ? (<Image source={{ uri: getMediaUrl(activeContact.avatar) }} style={{ width: "100%", height: "100%" }} />) : (<Text style={{ color: "#fff", fontSize: 32, fontFamily: "Inter_700Bold" }}>{activeContact.initials}</Text>)}
                    </View>
                    <View style={[styles.onlineDotLarge, { backgroundColor: "#22c55e", borderColor: isDark ? "#18181b" : "#fff" }]} />
                  </View>
                  <Text style={[styles.fullProfileName, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{activeContact.name}</Text>
                  <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_500Medium" }}>{activeContact.role || "Team Member"} • {activeContact.department || "General"}</Text>
                </View>

                {/* Quick actions */}
                <View style={styles.quickActionPills}>
                  <Pressable onPress={() => setShowContactProfile(false)} style={({ pressed }) => [styles.quickActionPill, { opacity: pressed ? 0.7 : 1 }]}>
                    <View style={[styles.quickActionIconWrap, { backgroundColor: colors.primary + "15" }]}><Feather name="message-square" size={18} color={colors.primary} /></View>
                    <Text style={[styles.quickActionPillLabel, { color: colors.foreground }]}>Chat</Text>
                  </Pressable>
                  <Pressable onPress={() => { setShowContactProfile(false); handleInitiateCall("voice"); }} style={({ pressed }) => [styles.quickActionPill, { opacity: pressed ? 0.7 : 1 }]}>
                    <View style={[styles.quickActionIconWrap, { backgroundColor: colors.accent + "15" }]}><Feather name="phone" size={18} color={colors.accent} /></View>
                    <Text style={[styles.quickActionPillLabel, { color: colors.foreground }]}>Audio</Text>
                  </Pressable>
                  <Pressable onPress={() => { setShowContactProfile(false); handleInitiateCall("video"); }} style={({ pressed }) => [styles.quickActionPill, { opacity: pressed ? 0.7 : 1 }]}>
                    <View style={[styles.quickActionIconWrap, { backgroundColor: "#22c55e15" }]}><Feather name="video" size={18} color="#22c55e" /></View>
                    <Text style={[styles.quickActionPillLabel, { color: colors.foreground }]}>Video</Text>
                  </Pressable>
                  {activeContact.email && (
                    <Pressable onPress={() => Linking.openURL(`mailto:${activeContact.email}`)} style={({ pressed }) => [styles.quickActionPill, { opacity: pressed ? 0.7 : 1 }]}>
                      <View style={[styles.quickActionIconWrap, { backgroundColor: "#f59e0b15" }]}><Feather name="mail" size={18} color="#f59e0b" /></View>
                      <Text style={[styles.quickActionPillLabel, { color: colors.foreground }]}>Email</Text>
                    </Pressable>
                  )}
                </View>

                {/* Contact details */}
                <View style={[styles.profileSectionBox, { backgroundColor: isDark ? "#27272a40" : "#f4f4f5", borderColor: colors.border }]}>
                  <Text style={[styles.profileSectionTitle, { color: colors.mutedForeground }]}>ABOUT & CONTACT INFO</Text>
                  {activeContact.email && (
                    <Pressable onPress={() => { Clipboard.setString(activeContact.email!); showToast({ title: "Copied", message: "Email copied.", type: "success" }); }} style={styles.profileDetailRow}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                        <Feather name="mail" size={16} color={colors.mutedForeground} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 11, color: colors.mutedForeground }}>Email</Text>
                          <Text style={{ fontSize: 13, color: colors.foreground, fontFamily: "Inter_500Medium" }}>{activeContact.email}</Text>
                        </View>
                      </View>
                      <Feather name="copy" size={14} color={colors.mutedForeground} />
                    </Pressable>
                  )}
                  {activeContact.phone && (
                    <Pressable onPress={() => Linking.openURL(`tel:${activeContact.phone}`)} style={styles.profileDetailRow}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                        <Feather name="phone" size={16} color={colors.mutedForeground} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 11, color: colors.mutedForeground }}>Phone</Text>
                          <Text style={{ fontSize: 13, color: colors.foreground, fontFamily: "Inter_500Medium" }}>{activeContact.phone}</Text>
                        </View>
                      </View>
                      <Feather name="phone-call" size={14} color={colors.accent} />
                    </Pressable>
                  )}
                  <View style={styles.profileDetailRow}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <Feather name="briefcase" size={16} color={colors.mutedForeground} />
                      <View>
                        <Text style={{ fontSize: 11, color: colors.mutedForeground }}>Department & Role</Text>
                        <Text style={{ fontSize: 13, color: colors.foreground, fontFamily: "Inter_500Medium" }}>{activeContact.department || "General"} • {activeContact.role || "Team Member"}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Security */}
                <View style={[styles.profileSectionBox, { backgroundColor: isDark ? "#27272a40" : "#f4f4f5", borderColor: colors.border }]}>
                  <Text style={[styles.profileSectionTitle, { color: colors.mutedForeground }]}>SETTINGS & SECURITY</Text>
                  <Pressable onPress={() => { setIsMuted((m) => { const next = !m; showToast({ title: next ? "Muted" : "Unmuted", message: next ? "Notifications muted." : "Notifications enabled.", type: "info" }); return next; }); }} style={styles.profileSettingRow}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <Feather name={isMuted ? "bell-off" : "bell"} size={16} color={isMuted ? (colors.warning ?? "#f59e0b") : colors.mutedForeground} />
                      <Text style={{ fontSize: 13, color: colors.foreground, fontFamily: "Inter_500Medium" }}>{isMuted ? "Muted" : "Notification Settings"}</Text>
                    </View>
                    <Text style={{ fontSize: 12, color: colors.accent, fontFamily: "Inter_600SemiBold" }}>{isMuted ? "Unmute" : "Mute"}</Text>
                  </Pressable>
                  <View style={styles.profileSettingRow}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                      <Feather name="lock" size={16} color="#22c55e" />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, color: colors.foreground, fontFamily: "Inter_500Medium" }}>Encryption</Text>
                        <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 2 }}>Messages are end-to-end encrypted.</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Actions */}
                <View style={{ gap: 8, marginTop: 4 }}>
                  <Pressable onPress={() => { setShowContactProfile(false); setShowReportModal(true); }} style={({ pressed }) => [styles.profileActionBtn, { opacity: pressed ? 0.7 : 1 }]}>
                    <Feather name="alert-triangle" size={17} color={colors.danger} />
                    <Text style={[styles.profileActionLabel, { color: colors.danger }]}>Report Account</Text>
                  </Pressable>
                </View>
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Report Modal */}
        <Modal visible={showReportModal} transparent animationType="slide" onRequestClose={() => setShowReportModal(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
            <Pressable style={styles.backdrop} onPress={() => setShowReportModal(false)}>
              <Pressable style={[styles.reportSheet, { backgroundColor: isDark ? "#18181b" : "#fff", borderColor: colors.border }]} onPress={(e) => e.stopPropagation()}>
                <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <View style={[styles.dangerBadgeIcon, { backgroundColor: colors.danger + "20" }]}><Feather name="alert-triangle" size={18} color={colors.danger} /></View>
                    <View>
                      <Text style={[styles.reportTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Report Account</Text>
                      <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Report @{activeContact?.name} for review</Text>
                    </View>
                  </View>
                  <Pressable onPress={() => setShowReportModal(false)} hitSlop={8}><Feather name="x" size={20} color={colors.mutedForeground} /></Pressable>
                </View>
                <Text style={[styles.reportSubtitle, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>SELECT REASON:</Text>
                <ScrollView style={{ maxHeight: 180 }} showsVerticalScrollIndicator={false}>
                  {REPORT_REASONS.map((r) => {
                    const selected = reportReason === r.id;
                    return (
                      <Pressable key={r.id} onPress={() => setReportReason(r.id)} style={[styles.reasonOption, { borderColor: selected ? colors.accent : colors.border, backgroundColor: selected ? colors.accent + "15" : "transparent" }]}>
                        <Feather name={r.icon as any} size={15} color={selected ? colors.accent : colors.mutedForeground} />
                        <Text style={{ flex: 1, fontSize: 13, color: selected ? colors.foreground : colors.mutedForeground, fontFamily: selected ? "Inter_600SemiBold" : "Inter_400Regular" }}>{r.label}</Text>
                        {selected && <Feather name="check" size={16} color={colors.accent} />}
                      </Pressable>
                    );
                  })}
                </ScrollView>
                <Text style={[styles.reportSubtitle, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold", marginTop: 10 }]}>DETAILS (OPTIONAL):</Text>
                <TextInput value={reportDetails} onChangeText={setReportDetails} placeholder="Describe what occurred..." placeholderTextColor={colors.mutedForeground} multiline style={[styles.reportInput, { color: colors.foreground, backgroundColor: isDark ? "#27272a" : "#f4f4f5", borderColor: colors.border, fontFamily: "Inter_400Regular" }]} />
                <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
                  <Pressable onPress={() => setShowReportModal(false)} style={[styles.reportCancelBtn, { borderColor: colors.border }]}>
                    <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>Cancel</Text>
                  </Pressable>
                  <Pressable onPress={handleSubmitReport} disabled={submittingReport} style={[styles.reportSubmitBtn, { backgroundColor: colors.danger }]}>
                    {submittingReport ? (<ActivityIndicator size={14} color="#fff" />) : (<><Feather name="alert-triangle" size={14} color="#fff" /><Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold" }}>Submit Report</Text></>)}
                  </Pressable>
                </View>
              </Pressable>
            </Pressable>
          </KeyboardAvoidingView>
        </Modal>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 12, gap: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  headerAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  headerAvatarTxt: { color: "#fff", fontSize: 15 },
  headerName: { fontSize: 16 },
  headerSub: { fontSize: 12, marginTop: 1 },
  headerRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle: { fontSize: 20 },
  filterRow: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 8, gap: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  filterTab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, alignItems: "center", justifyContent: "center", position: "relative" },
  filterTabTxt: { fontSize: 13 },
  filterTabDot: { position: "absolute", bottom: 3, width: 4, height: 4, borderRadius: 2 },
  searchBar: { flexDirection: "row", alignItems: "center", borderRadius: 20, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 2 },
  contactRowFull: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  contactAvatarLarge: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  contactAvatarTxtLarge: { color: "#fff", fontSize: 17 },
  contactNameLarge: { fontSize: 15 },
  contactSubLarge: { fontSize: 12 },
  contactTime: { fontSize: 11 },
  unreadBadge: { minWidth: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  unreadBadgeTxt: { color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" },
  lockBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  lockBadgeTxt: { fontSize: 9 },
  listContent: { paddingHorizontal: 12, paddingTop: 16, flexGrow: 1 },
  msgRow: { flexDirection: "row", alignItems: "flex-end", marginBottom: 8, gap: 8 },
  msgLeft: { justifyContent: "flex-start" },
  msgRight: { justifyContent: "flex-end" },
  avatar: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  avatarTxt: { fontSize: 11 },
  msgContent: { gap: 2 },
  senderName: { fontSize: 11, marginBottom: 2, marginLeft: 4 },
  replyPreview: { borderLeftWidth: 3, paddingLeft: 8, paddingVertical: 4, borderRadius: 4, marginBottom: 4 },
  replyName: { fontSize: 11 },
  replyText: { fontSize: 12, marginTop: 1 },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleText: { fontSize: 14.5, lineHeight: 21 },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 3, paddingHorizontal: 4 },
  metaText: { fontSize: 10 },
  emptyList: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 14, textAlign: "center" },
  replyBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, gap: 10 },
  replyBarAccent: { width: 3, height: 32, borderRadius: 2 },
  replyBarLabel: { fontSize: 12 },
  replyBarText: { fontSize: 12, marginTop: 2 },
  inputBar: { paddingHorizontal: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  inputWrap: { flexDirection: "row", alignItems: "flex-end", borderRadius: 26, borderWidth: 1, paddingLeft: 14, paddingRight: 6, paddingVertical: 6, gap: 8 },
  input: { flex: 1, fontSize: 15, maxHeight: 120, paddingVertical: Platform.OS === "ios" ? 6 : 4 },
  sendBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  lockBanner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 22, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 16, marginVertical: 4 },
  lockBannerText: { fontSize: 12.5 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  actionSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 8, paddingBottom: 32, borderTopWidth: 1 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 12 },
  actionItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, gap: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  actionLabel: { fontSize: 16 },
  headerMenuSheet: { position: "absolute", top: 70, right: 12, borderRadius: 14, borderWidth: 1, overflow: "hidden", minWidth: 200, shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 12, zIndex: 999 },
  headerMenuItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  headerMenuLabel: { fontSize: 15 },
  inChatSearchBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, gap: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  inChatSearchInput: { flex: 1, fontSize: 14, paddingVertical: 4 },
  emojiToggleBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emojiPickerContainer: { borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 8 },
  emojiScroll: { paddingHorizontal: 12, gap: 8 },
  emojiTouch: { paddingHorizontal: 6, paddingVertical: 4, borderRadius: 8 },
  emojiGlyph: { fontSize: 22 },
  contactProfileSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 8, paddingBottom: 36, paddingHorizontal: 20, maxHeight: "85%", borderTopWidth: 1 },
  fullProfileAvatar: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  onlineDotLarge: { position: "absolute", bottom: 2, right: 2, width: 16, height: 16, borderRadius: 8, borderWidth: 2.5 },
  fullProfileName: { fontSize: 18, textAlign: "center" },
  quickActionPills: { flexDirection: "row", alignItems: "center", justifyContent: "space-around", marginVertical: 14, gap: 8 },
  quickActionPill: { alignItems: "center", gap: 6, flex: 1 },
  quickActionIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  quickActionPillLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  profileSectionBox: { borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 12, gap: 10 },
  profileSectionTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.6 },
  profileDetailRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 },
  profileSettingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6 },
  profileActionBtn: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 4, gap: 12 },
  profileActionLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  reportSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 8, paddingBottom: 32, paddingHorizontal: 20, borderTopWidth: 1, maxHeight: "85%" },
  dangerBadgeIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  reportTitle: { fontSize: 16 },
  reportSubtitle: { fontSize: 11, letterSpacing: 0.6, marginTop: 8, marginBottom: 6 },
  reasonOption: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, marginBottom: 6 },
  reportInput: { borderRadius: 12, borderWidth: 1, padding: 12, height: 80, textAlignVertical: "top", fontSize: 13 },
  reportCancelBtn: { flex: 1, borderRadius: 12, borderWidth: 1, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  reportSubmitBtn: { flex: 1.5, borderRadius: 12, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  swipeReplyIcon: { position: "absolute", left: 8, top: "50%", marginTop: -10, zIndex: -1 },
  typingRow: { flexDirection: "row", alignItems: "center", gap: 3, height: 16 },
  typingDot: { width: 5, height: 5, borderRadius: 2.5 },
});
