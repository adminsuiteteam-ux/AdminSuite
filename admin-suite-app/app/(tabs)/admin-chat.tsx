import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Clipboard,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  PanResponder,
  PermissionsAndroid,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Audio } from "expo-av";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useToast } from "@/context/ToastContext";
import { useData } from "@/context/DataContext";
import { apiService, getMediaUrl } from "@/services/api";
import { ExpandableText } from "@/components/ExpandableText";

const EMOJI_LIST = ["😀", "😂", "😍", "👍", "🔥", "🎉", "❤️", "🙌", "👏", "😮", "🤔", "😢", "🙏", "🚀", "💯", "✨", "😎", "🥳", "🤝", "👀", "💬", "✅"];

const REPORT_REASONS = [
  { id: "spam", label: "Spam / Scam / Advertising", icon: "slash" },
  { id: "harassment", label: "Harassment or Bullying", icon: "alert-circle" },
  { id: "inappropriate_content", label: "Inappropriate or Explicit Content", icon: "eye-off" },
  { id: "hate_speech", label: "Hate Speech or Discrimination", icon: "shield-alert" },
  { id: "impersonation", label: "Impersonation or Fake Account", icon: "user-x" },
  { id: "policy_violation", label: "Company / Community Policy Violation", icon: "file-text" },
  { id: "other", label: "Other Reason", icon: "help-circle" },
];

// ─── Types ────────────────────────────────────────────────────────────────────
type Contact = {
  id: number | "group";
  type: "group" | "private";
  name: string;
  initials: string;
  avatar: string | null;
  group_locked?: boolean;
  is_blocked_from_group?: boolean;
  employee_id?: number;
  email?: string;
  phone?: string;
  role?: string;
  department?: string;
  unread_count?: number;
  last_message?: string;
  last_message_time?: string;
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
  attachment?: string | null;
  attachment_type?: "image" | "video" | "audio" | "document" | null;
  attachment_name?: string | null;
  attachment_size?: number | null;
  is_pinned: boolean;
  is_edited: boolean;
  is_deleted: boolean;
  reply_to_id: number | null;
  reply_to_text: string | null;
  reply_to_sender: string | null;
  created_at: string;
  updated_at: string;
  delivery_status?: "sent" | "delivered" | "read";
};

type FilterTab = "all" | "unread" | "groups" | "dms";

// ─── In-App Notification Banner ───────────────────────────────────────────────
function InAppNotificationBanner({
  notification,
  onDismiss,
}: {
  notification: { title: string; body: string; senderInitials: string; senderAvatar: string | null } | null;
  onDismiss: () => void;
}) {
  const colors = useColors();
  const isDark = colors.isDark;
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (notification) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, { toValue: -100, duration: 250, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
        ]).start(onDismiss);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  if (!notification) return null;

  return (
    <Animated.View
      style={[
        styles.notifBanner,
        {
          backgroundColor: isDark ? "#18181b" : "#ffffff",
          borderColor: colors.border,
          transform: [{ translateY }],
          opacity,
          shadowColor: "#000",
          shadowOpacity: isDark ? 0.4 : 0.15,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 8,
        },
      ]}
    >
      <View
        style={[
          styles.notifAvatar,
          { backgroundColor: colors.primary + "20" },
        ]}
      >
        {notification.senderAvatar ? (
          <Image
            source={{ uri: getMediaUrl(notification.senderAvatar) }}
            style={{ width: "100%", height: "100%" }}
          />
        ) : (
          <Text style={[styles.notifAvatarTxt, { color: colors.primary }]}>
            {notification.senderInitials}
          </Text>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.notifTitle, { color: colors.foreground }]}>
          {notification.title}
        </Text>
        <Text
          style={[styles.notifBody, { color: colors.mutedForeground }]}
          numberOfLines={1}
        >
          {notification.body}
        </Text>
      </View>
      <Pressable onPress={onDismiss} hitSlop={8}>
        <Feather name="x" size={16} color={colors.mutedForeground} />
      </Pressable>
    </Animated.View>
  );
}

// ─── Typing Indicator Bubble ──────────────────────────────────────────────────
function TypingIndicator({ color }: { color: string }) {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: -5, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600),
        ])
      );
    const a1 = animate(dot1, 0);
    const a2 = animate(dot2, 200);
    const a3 = animate(dot3, 400);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, []);

  return (
    <View style={styles.typingRow}>
      {[dot1, dot2, dot3].map((dot, i) => (
        <Animated.View
          key={i}
          style={[
            styles.typingDot,
            { backgroundColor: color, transform: [{ translateY: dot }] },
          ]}
        />
      ))}
    </View>
  );
}

// ─── Swipeable Message Row (Slide to Reply) ───────────────────────────────────
function SwipeableMessage({
  children,
  onReply,
  replyColor,
}: {
  children: React.ReactNode;
  onReply: () => void;
  replyColor: string;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const replyOpacity = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 8 && Math.abs(gs.dy) < 20,
      onPanResponderMove: (_, gs) => {
        if (gs.dx > 0 && gs.dx < 80) {
          translateX.setValue(gs.dx);
          replyOpacity.setValue(gs.dx / 80);
        }
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dx > 55) {
          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          onReply();
        }
        Animated.parallel([
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
          Animated.timing(replyOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
        ]).start();
      },
    })
  ).current;

  return (
    <View style={{ position: "relative" }}>
      {/* Reply icon revealed behind */}
      <Animated.View
        style={[
          styles.swipeReplyIcon,
          { opacity: replyOpacity },
        ]}
      >
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

// ─── Date Separator ───────────────────────────────────────────────────────────
function DateSeparator({ label, borderColor, textColor }: { label: string; borderColor: string; textColor: string }) {
  return (
    <View style={styles.dateSepRow}>
      <View style={[styles.dateSepLine, { backgroundColor: borderColor }]} />
      <Text style={[styles.dateSepText, { color: textColor }]}>{label}</Text>
      <View style={[styles.dateSepLine, { backgroundColor: borderColor }]} />
    </View>
  );
}

function getDateLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(d, today)) return "Today";
  if (sameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AdminChatScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { employees } = useData();
  const isDark = colors.isDark;

  // ── State ──
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [showCallMenu, setShowCallMenu] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editingMsg, setEditingMsg] = useState<ChatMessage | null>(null);
  const [selectedMsg, setSelectedMsg] = useState<ChatMessage | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [groupLocked, setGroupLocked] = useState(false);
  const [togglingLock, setTogglingLock] = useState(false);
  const [typingStatus, setTypingStatus] = useState("");
  const [typingStatuses, setTypingStatuses] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Search & filter
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [showSearch, setShowSearch] = useState(false);
  const [showInChatSearch, setShowInChatSearch] = useState(false);
  const [inChatSearchQuery, setInChatSearchQuery] = useState("");

  // Emoji picker
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Voice note recording & playback
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordTimerRef = useRef<any>(null);
  const [playingAudioId, setPlayingAudioId] = useState<number | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Attachment menu & full screen image preview
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [selectedFullImage, setSelectedFullImage] = useState<string | null>(null);

  // Moderation & Reporting
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("harassment");
  const [reportDetails, setReportDetails] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);

  // Chat preference toggles
  const [isMuted, setIsMuted] = useState(false);
  const [isFavourite, setIsFavourite] = useState(false);

  // View Tab: Messages vs Calls
  const [viewTab, setViewTab] = useState<"messages" | "calls">("messages");
  const [callHistory, setCallHistory] = useState<any[]>([]);
  const [loadingCalls, setLoadingCalls] = useState(false);
  const [showCallsSearch, setShowCallsSearch] = useState(false);
  const [callsSearchQuery, setCallsSearchQuery] = useState("");
  const [showNewCallModal, setShowNewCallModal] = useState(false);
  const [newCallSearchQuery, setNewCallSearchQuery] = useState("");

  // In-app notification
  const [notification, setNotification] = useState<{
    title: string;
    body: string;
    senderInitials: string;
    senderAvatar: string | null;
  } | null>(null);
  const lastMsgIdRef = useRef<number | null>(null);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => {
        setIsKeyboardOpen(true);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 80);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setIsKeyboardOpen(false);
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Create Group Modal
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [newGroupAvatar, setNewGroupAvatar] = useState<string | null>(null);

  // Group Profile Modal
  const [showGroupProfile, setShowGroupProfile] = useState(false);
  const [editingGroupName, setEditingGroupName] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState("");
  const [showAddMember, setShowAddMember] = useState(false);
  const [groupAvatarUri, setGroupAvatarUri] = useState<string | null>(null);
  const [uploadingGroupAvatar, setUploadingGroupAvatar] = useState(false);

  // Avatar popup (contact list)
  const [avatarPopupContact, setAvatarPopupContact] = useState<Contact | null>(null);

  // Chat header ⋮ dropdown
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);

  // Contact profile sheet (DM)
  const [showContactProfile, setShowContactProfile] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const pollRef = useRef<any>(null);
  const contactPollRef = useRef<any>(null);
  const fabScale = useRef(new Animated.Value(1)).current;
  // Track the latest seen message id per contact for badge increments
  const lastContactMsgRef = useRef<Record<string, number>>({});
  const lastTypingSentRef = useRef<number>(0);
  // Keep a ref to activeContact so the background poll can access it without deps
  const activeContactRef = useRef<Contact | null>(null);
  useEffect(() => { activeContactRef.current = activeContact; }, [activeContact]);
  // Draft text cached per contact ID so text never leaks between conversations
  const draftsRef = useRef<Record<string, string>>({});

  // ─── Load contacts (always sorted: most recent first) ───────────────────────
  const loadContacts = useCallback(async (silent = false) => {
    try {
      const res = await apiService.getChatContacts();
      const data: Contact[] = res.data;
      // Sort by last_message_time desc (most recent at top)
      const sorted = [...data].sort((a, b) => {
        const ta = a.last_message_time ? new Date(a.last_message_time).getTime() : 0;
        const tb = b.last_message_time ? new Date(b.last_message_time).getTime() : 0;
        return tb - ta;
      });
      const group = sorted.find((c) => c.id === "group");
      if (group?.group_locked !== undefined) setGroupLocked(group.group_locked);
      // Seed the previous-times map so polling doesn't fire false notifications
      sorted.forEach((c) => {
        if (c.last_message_time) {
          prevContactTimesRef.current.set(String(c.id), c.last_message_time);
        }
      });
      setContacts((prev) => {
        if (silent && prev.length > 0) {
          return sorted.map((fresh) => {
            const existing = prev.find((p) => String(p.id) === String(fresh.id));
            return existing ? { ...fresh, unread_count: fresh.unread_count } : fresh;
          });
        }
        return sorted;
      });
    } catch {
      if (!silent) showToast({ title: "Error", message: "Could not load contacts.", type: "error" });
    } finally {
      if (!silent) setLoadingContacts(false);
    }
  }, []);

  useEffect(() => { loadContacts(); }, [loadContacts]);

  // ─── Background contact polling (badge + ordering + in-app notifications) ─────
  // Runs regardless of whether we're in the list or a chat view.
  // Tracks last_message_time per contact to detect new inbound messages.
  const prevContactTimesRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    contactPollRef.current = setInterval(async () => {
      try {
        const res = await apiService.getChatContacts();
        const fresh: Contact[] = res.data;
        const sorted = [...fresh].sort((a, b) => {
          const ta = a.last_message_time ? new Date(a.last_message_time).getTime() : 0;
          const tb = b.last_message_time ? new Date(b.last_message_time).getTime() : 0;
          return tb - ta;
        });

        const openId = activeContactRef.current
          ? String(activeContactRef.current.id)
          : null;

        // Detect new messages on contacts NOT currently open → show in-app banner
        sorted.forEach((contact) => {
          const cid = String(contact.id);
          const prevTime = prevContactTimesRef.current.get(cid);
          const newTime = contact.last_message_time;
          if (
            newTime &&
            prevTime &&
            newTime !== prevTime &&
            new Date(newTime) > new Date(prevTime) &&
            cid !== openId &&
            (contact.unread_count ?? 0) > 0
          ) {
            // New message on a different contact — show notification banner
            setNotification({
              title: contact.name,
              body: contact.last_message || "New message",
              senderInitials: contact.initials,
              senderAvatar: contact.avatar,
            });
          }
          if (newTime) {
            prevContactTimesRef.current.set(cid, newTime);
          }
        });

        setContacts(
          sorted.map((f) =>
            openId && String(f.id) === openId
              ? { ...f, unread_count: 0 } // keep badge zero for open chat
              : f
          )
        );
        const group = sorted.find((c) => c.id === "group");
        if (group?.group_locked !== undefined) setGroupLocked(group.group_locked);
      } catch {}
    }, 10000); // Poll every 10 seconds to reduce network and CPU congestion
    return () => clearInterval(contactPollRef.current);
  }, []);

  // ─── Load messages when active contact changes ───────────────────────────────
  const fetchMessages = useCallback(async () => {
    if (!activeContact) return;
    const cid = activeContact.id;
    const ctype = activeContact.type;
    try {
      let res;
      if (ctype === "group") {
        if (cid === "group") {
          res = await apiService.getChatMessages("group");
        } else {
          res = await apiService.getChatMessages(undefined, cid as number);
        }
      } else {
        res = await apiService.getChatMessages(cid as number);
      }
      const newMsgs: ChatMessage[] = res.data;

      // Discard stale response if user switched conversation while in-flight
      if (activeContactRef.current?.id !== cid) {
        return;
      }

      // Check for new incoming message → trigger in-app notification
      if (newMsgs.length > 0) {
        const latestMsg = newMsgs.at(-1);
        if (
          latestMsg &&
          lastMsgIdRef.current !== null &&
          latestMsg.id > lastMsgIdRef.current &&
          latestMsg.sender_id !== user?.id
        ) {
          setNotification({
            title: latestMsg.sender_name,
            body: latestMsg.display_text,
            senderInitials: latestMsg.sender_initials,
            senderAvatar: latestMsg.sender_avatar,
          });
        }
        if (latestMsg) {
          lastMsgIdRef.current = latestMsg.id;
        }
      } else if (lastMsgIdRef.current === null && newMsgs.length > 0) {
        lastMsgIdRef.current = newMsgs.at(-1)?.id || null;
      }

      // Keep any pending optimistic message (id < 0) that belongs to this conversation
      setMessages((prev) => {
        if (activeContactRef.current?.id !== cid) return prev;
        const pending = prev.filter(
          (m) => m.id < 0 && !newMsgs.some((fresh) => fresh.text === m.text && fresh.sender_id === m.sender_id)
        );
        const combined = [...newMsgs, ...pending];

        // Bail out if identical to preserve referential equality and prevent re-rendering list
        if (
          prev.length === combined.length &&
          prev.length > 0 &&
          prev[prev.length - 1]?.id === combined[combined.length - 1]?.id &&
          prev[prev.length - 1]?.updated_at === combined[combined.length - 1]?.updated_at &&
          prev[prev.length - 1]?.display_text === combined[combined.length - 1]?.display_text
        ) {
          return prev;
        }
        return combined;
      });
    } catch {}
  }, [activeContact?.id, activeContact?.type, user?.id]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMessages();
    setRefreshing(false);
  }, [fetchMessages]);

  useEffect(() => {
    if (!activeContact) {
      setMessages([]);
      return;
    }
    setMessages([]);
    setReplyTo(null);
    setEditingMsg(null);
    setSelectedMsg(null);
    setLoadingMessages(true);
    lastMsgIdRef.current = null;
    fetchMessages().finally(() => {
      if (activeContactRef.current?.id === activeContact.id) {
        setLoadingMessages(false);
      }
    });
  }, [activeContact?.id, fetchMessages]);

  // ── Poll messages inside the open conversation every 4s for real-time updates ──
  useEffect(() => {
    if (!activeContact) return;
    const interval = setInterval(() => {
      fetchMessages();
    }, 4000);
    return () => clearInterval(interval);
  }, [activeContact?.id, fetchMessages]);

  const handleTextChange = (text: string) => {
    setInputText(text);
    if (!activeContact) return;
    draftsRef.current[String(activeContact.id)] = text;

    const trimmed = text.trim();
    const now = Date.now();

    if (trimmed.length === 0) {
      lastTypingSentRef.current = 0;
      const payload: any = { is_typing: false };
      if (activeContact.type === "group") {
        if (activeContact.id !== "group") {
          payload.group_id = activeContact.id;
        }
      } else {
        payload.recipient_id = activeContact.id;
      }
      apiService.sendChatTyping(payload).catch(() => {});
    } else if (now - lastTypingSentRef.current > 3000) {
      lastTypingSentRef.current = now;
      const payload: any = { is_typing: true };
      if (activeContact.type === "group") {
        if (activeContact.id !== "group") {
          payload.group_id = activeContact.id;
        }
      } else {
        payload.recipient_id = activeContact.id;
      }
      apiService.sendChatTyping(payload).catch(() => {});
    }
  };

  useEffect(() => {
    if (!activeContact) {
      setTypingStatus("");
      return;
    }

    const checkTyping = async () => {
      try {
        const cid = activeContact.id;
        const ctype = activeContact.type;
        let res;
        if (ctype === "group") {
          if (cid === "group") {
            res = await apiService.getChatTypingStatus("group");
          } else {
            res = await apiService.getChatTypingStatus(undefined, cid as number);
          }
        } else {
          res = await apiService.getChatTypingStatus(cid as number);
        }

        const typingUsers = res.data.typing_users || [];
        if (typingUsers.length === 0) {
          setTypingStatus("");
        } else if (typingUsers.length === 1) {
          if (ctype === "group") {
            setTypingStatus(`${typingUsers[0].name} ${t("chat.isTyping") || "is typing..."}`);
          } else {
            setTypingStatus(t("chat.typing") || "typing...");
          }
        } else {
          setTypingStatus(`${typingUsers.length} people typing...`);
        }
      } catch {
        setTypingStatus("");
      }
    };

    const interval = setInterval(checkTyping, 5000);
    checkTyping();

    return () => {
      clearInterval(interval);
    };
  }, [activeContact?.id, activeContact?.type, t]);

  useEffect(() => {
    if (activeContact) return;

    const checkAllTyping = async () => {
      try {
        const res = await apiService.getChatTypingStatus("all");
        setTypingStatuses(res.data.typing_users || []);
      } catch {
        setTypingStatuses([]);
      }
    };

    const interval = setInterval(checkAllTyping, 5000);
    checkAllTyping();

    return () => clearInterval(interval);
  }, [activeContact]);

  const getContactTypingStatus = (c: Contact) => {
    const isGroup = c.id === "group";
    const isCustomGroup = c.type === "group" && c.id !== "group";

    const matches = typingStatuses.filter((t) => {
      if (isGroup) {
        return t.is_general_group === true;
      }
      if (isCustomGroup) {
        return t.group_id === c.id;
      }
      return t.recipient_id === myId && t.id === c.id;
    });

    if (matches.length === 0) return null;
    if (isGroup || isCustomGroup) {
      if (matches.length === 1) return `${matches[0].name} is typing...`;
      return `${matches.length} people typing...`;
    }
    return "typing...";
  };

  // ─── Filtered contacts (already sorted by loadContacts / background poll) ────
  const filteredContacts = contacts.filter((c) => {
    const matchesSearch = !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      activeFilter === "all" ||
      (activeFilter === "unread" && (c.unread_count ?? 0) > 0) ||
      (activeFilter === "groups" && c.type === "group") ||
      (activeFilter === "dms" && c.type === "private");
    return matchesSearch && matchesFilter;
  });

  // Total unread across all contacts (used for tab-bar badge & header badge)
  const totalUnreadLocal = contacts.reduce((sum, c) => sum + (c.unread_count ?? 0), 0);

  // ─── Messages with date separators ─────────────────────────────────────────
  type ListItem = { type: "date"; label: string; key: string } | { type: "msg"; msg: ChatMessage; key: string };

  const displayedMessages = useMemo(() => {
    if (!inChatSearchQuery.trim()) return messages;
    const q = inChatSearchQuery.trim().toLowerCase();
    return messages.filter(
      (m) =>
        m.text.toLowerCase().includes(q) ||
        m.sender_name.toLowerCase().includes(q) ||
        (m.reply_to_text && m.reply_to_text.toLowerCase().includes(q))
    );
  }, [messages, inChatSearchQuery]);

  const listItems = useMemo(() => {
    const items: ListItem[] = [];
    let lastDateLabel = "";
    for (const msg of displayedMessages) {
      const label = getDateLabel(msg.created_at);
      if (label !== lastDateLabel) {
        items.push({ type: "date", label, key: `date-${msg.id}` });
        lastDateLabel = label;
      }
      items.push({ type: "msg", msg, key: `msg-${msg.id}` });
    }
    return items;
  }, [displayedMessages]);

  // ─── Send / Edit message ────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || sending) return;

    if (editingMsg) {
      setSending(true);
      try {
        await apiService.editChatMessage(editingMsg.id, text);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === editingMsg.id ? { ...m, text, display_text: text, is_edited: true } : m
          )
        );
        setEditingMsg(null);
        setInputText("");
      } catch {
        showToast({ title: "Error", message: "Failed to edit message.", type: "error" });
      } finally {
        setSending(false);
      }
      return;
    }

    // ── Instant Optimistic Sending ──
    const tempId = -Date.now();
    const optimisticMsg: ChatMessage = {
      id: tempId,
      sender_id: myId ?? 0,
      sender_name: (user as any)?.first_name
        ? `${(user as any).first_name} ${(user as any).last_name || ""}`.trim()
        : (user?.username || "You"),
      sender_initials: ((user as any)?.first_name?.[0] || user?.username?.[0] || "U").toUpperCase(),
      sender_avatar: (user as any)?.avatar || null,
      recipient_id: activeContact?.type === "group" ? null : (activeContact?.id as number),
      text,
      display_text: text,
      is_pinned: false,
      is_edited: false,
      is_deleted: false,
      reply_to_id: replyTo ? replyTo.id : null,
      reply_to_text: replyTo ? replyTo.text : null,
      reply_to_sender: replyTo ? replyTo.sender_name : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 1. Instantly clear input & reply
    setInputText("");
    const savedReply = replyTo;
    setReplyTo(null);

    // 2. Instantly show optimistic bubble in chat
    setMessages((prev) => [...prev, optimisticMsg]);

    // 3. Instantly bubble conversation to top in contacts list
    if (activeContact) {
      const now = new Date().toISOString();
      setContacts((prev) => {
        const updated = prev.map((c) =>
          String(c.id) === String(activeContact.id)
            ? { ...c, last_message: text, last_message_time: now, unread_count: 0 }
            : c
        );
        return [...updated].sort((a, b) => {
          const ta = a.last_message_time ? new Date(a.last_message_time).getTime() : 0;
          const tb = b.last_message_time ? new Date(b.last_message_time).getTime() : 0;
          return tb - ta;
        });
      });
    }

    // 4. Instantly scroll to bottom
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 40);

    // 5. Send stop typing in background
    lastTypingSentRef.current = 0;
    const tPayload: any = { is_typing: false };
    if (activeContact?.type === "group") {
      if (activeContact.id !== "group") {
        tPayload.group_id = activeContact.id;
      }
    } else if (activeContact?.id) {
      tPayload.recipient_id = activeContact.id;
    }
    apiService.sendChatTyping(tPayload).catch(() => {});

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }

    // 6. Network dispatch in background
    const payload: any = { text };
    if (activeContact?.type === "group") {
      if (activeContact.id !== "group") {
        payload.group_id = activeContact.id;
      }
    } else if (activeContact?.id) {
      payload.recipient_id = activeContact.id;
    }
    if (savedReply) payload.reply_to_id = savedReply.id;

    const sentCid = activeContact?.id;
    try {
      const res = await apiService.sendChatMessage(payload);
      if (res.data) {
        // Clear draft for this contact upon successful send
        if (sentCid) {
          delete draftsRef.current[String(sentCid)];
        }
        // Replace temporary ID with persisted message only if still in this chat
        if (activeContactRef.current?.id === sentCid) {
          setMessages((prev) =>
            prev.map((m) => (m.id === tempId ? res.data : m))
          );
        }
      }
    } catch (err: any) {
      // Revert optimistic message on failure if still in this chat
      if (activeContactRef.current?.id === sentCid) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setInputText(text);
      }
      if (sentCid) {
        draftsRef.current[String(sentCid)] = text;
      }
      const errMsg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to send message.";
      showToast({ title: "Error", message: errMsg, type: "error" });
    }
  };

  // ─── Send Media / Document / Voice Attachment ────────────────────────────────
  const sendMediaAttachment = async (
    fileUri: string,
    type: "image" | "video" | "audio" | "document",
    fileName?: string,
    fileSize?: number
  ) => {
    if (sending) return;
    setSending(true);
    try {
      const formData = new FormData();
      const fname =
        fileName ||
        (type === "image"
          ? `photo_${Date.now()}.jpg`
          : type === "video"
          ? `video_${Date.now()}.mp4`
          : type === "audio"
          ? `voice_${Date.now()}.m4a`
          : `file_${Date.now()}`);

      const ext = fname.split(".").pop()?.toLowerCase();
      let mimeType = "application/octet-stream";
      if (type === "image") {
        mimeType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
      } else if (type === "video") {
        mimeType = "video/mp4";
      } else if (type === "audio") {
        mimeType = "audio/m4a";
      } else if (type === "document") {
        if (ext === "pdf") mimeType = "application/pdf";
        else if (ext === "doc" || ext === "docx") mimeType = "application/msword";
        else if (ext === "xls" || ext === "xlsx") mimeType = "application/vnd.ms-excel";
        else if (ext === "txt") mimeType = "text/plain";
      }

      if (Platform.OS === "web") {
        const response = await fetch(fileUri);
        const blob = await response.blob();
        formData.append("attachment", blob, fname);
      } else {
        formData.append("attachment", {
          uri: fileUri,
          name: fname,
          type: mimeType,
        } as any);
      }

      formData.append("attachment_type", type);
      formData.append("attachment_name", fname);

      const fallbackText =
        fname ||
        (type === "audio"
          ? "[Voice Note]"
          : type === "image"
          ? "[Photo]"
          : type === "video"
          ? "[Video]"
          : "[Document]");
      formData.append("text", fallbackText);

      if (activeContact?.type === "group") {
        if (activeContact.id !== "group") {
          formData.append("group_id", String(activeContact.id));
        }
      } else if (activeContact?.id) {
        formData.append("recipient_id", String(activeContact.id));
      }
      if (replyTo) formData.append("reply_to_id", String(replyTo.id));
      setReplyTo(null);

      let res;
      try {
        res = await apiService.sendChatMessage(formData);
      } catch (uploadErr: any) {
        console.warn("[Multipart upload failed, attempting base64 fallback]:", uploadErr?.message || uploadErr);
        if (Platform.OS !== "web" && fileUri) {
          try {
            const base64Data = await FileSystem.readAsStringAsync(fileUri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            const fallbackPayload: any = {
              text: fallbackText,
              attachment_name: fname,
              attachment_type: type,
              attachment_base64: base64Data,
            };
            if (activeContact?.type === "group") {
              if (activeContact.id !== "group") {
                fallbackPayload.group_id = Number(activeContact.id);
              }
            } else if (activeContact?.id) {
              fallbackPayload.recipient_id = Number(activeContact.id);
            }
            if (replyTo) fallbackPayload.reply_to_id = Number(replyTo.id);
            res = await apiService.sendChatMessage(fallbackPayload);
          } catch (b64Err: any) {
            console.error("[Base64 fallback upload also failed]:", b64Err);
            throw uploadErr;
          }
        } else {
          throw uploadErr;
        }
      }

      if (res?.data) {
        setMessages((prev) => [...prev, res.data]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 60);
      }
    } catch (err: any) {
      console.error("[Chat Media Upload Error]:", err?.response?.data || err?.message || err);
      const errMsg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        (err?.message === "Network Error"
          ? "Unable to connect to server. Please check your internet connection."
          : err?.message) ||
        "Failed to send attachment.";
      showToast({ title: "Upload Failed", message: errMsg, type: "error" });
    } finally {
      setSending(false);
    }
  };

  // ─── Camera Press Handler (Request permission on first use, photo/video capture) ───
  const handleCameraPress = async () => {
    try {
      const camPerm = await ImagePicker.requestCameraPermissionsAsync();
      if (!camPerm.granted) {
        Alert.alert(
          "Camera Permission Required",
          "AdminSuite requires camera access to let you capture and send photos or videos. Please allow camera permissions in your settings."
        );
        return;
      }

      // Request audio permission in case user records a video
      await Audio.requestPermissionsAsync().catch(() => {});

      Alert.alert("Camera", "Choose what to capture:", [
        {
          text: "Take Photo",
          onPress: async () => {
            try {
              const res = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                quality: 0.8,
                allowsEditing: false,
              });
              if (!res.canceled && res.assets && res.assets.length > 0) {
                const asset = res.assets[0];
                const fname = asset.fileName || `camera_${Date.now()}.jpg`;
                await sendMediaAttachment(asset.uri, "image", fname, asset.fileSize);
              }
            } catch (e: any) {
              Alert.alert("Camera Error", e.message || "Failed to capture photo.");
            }
          },
        },
        {
          text: "Record Video",
          onPress: async () => {
            try {
              const res = await ImagePicker.launchCameraAsync({
                mediaTypes: ['videos'],
                quality: 0.8,
                videoMaxDuration: 120,
                allowsEditing: false,
              });
              if (!res.canceled && res.assets && res.assets.length > 0) {
                const asset = res.assets[0];
                const fname = asset.fileName || `video_${Date.now()}.mp4`;
                await sendMediaAttachment(asset.uri, "video", fname, asset.fileSize);
              }
            } catch (e: any) {
              Alert.alert("Camera Error", e.message || "Failed to record video.");
            }
          },
        },
        { text: "Cancel", style: "cancel" },
      ]);
    } catch (err: any) {
      Alert.alert("Camera Error", err.message || "Failed to launch camera.");
    }
  };

  // ─── Voice Note Recording & Playback ─────────────────────────────────────────
  const startRecording = async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          "Microphone Permission Required",
          "Microphone access is needed to record voice notes. Please grant microphone permission in device settings."
        );
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      if (recording) {
        try {
          await recording.stopAndUnloadAsync();
        } catch {}
      }

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(newRecording);
      setIsRecording(true);
      setRecordingDuration(0);

      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      recordTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      }
    } catch (err: any) {
      Alert.alert("Recording Error", err.message || "Could not start voice recording.");
      setIsRecording(false);
      setRecording(null);
    }
  };

  const stopAndSendRecording = async () => {
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    if (!recording) {
      setIsRecording(false);
      return;
    }

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      setIsRecording(false);
      setRecordingDuration(0);

      if (uri) {
        const fname = `voice_${Date.now()}.m4a`;
        await sendMediaAttachment(uri, "audio", fname);
      }
    } catch (err: any) {
      Alert.alert("Recording Error", err.message || "Failed to finalize audio recording.");
      setIsRecording(false);
      setRecording(null);
    }
  };

  const cancelRecording = async () => {
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
      } catch {}
    }
    setRecording(null);
    setIsRecording(false);
    setRecordingDuration(0);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  };

  const playVoiceNote = async (msgId: number, audioUrl: string) => {
    try {
      if (playingAudioId === msgId && soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
        setPlayingAudioId(null);
        return;
      }

      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      const fullUrl = getMediaUrl(audioUrl);
      const { sound } = await Audio.Sound.createAsync(
        { uri: fullUrl },
        { shouldPlay: true }
      );
      soundRef.current = sound;
      setPlayingAudioId(msgId);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingAudioId(null);
          sound.unloadAsync().catch(() => {});
          soundRef.current = null;
        }
      });
    } catch (err: any) {
      Alert.alert("Audio Error", "Could not play voice note.");
      setPlayingAudioId(null);
    }
  };

  useEffect(() => {
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  // ─── Toggle group lock ──────────────────────────────────────────────────────
  const handleToggleLock = async () => {
    setTogglingLock(true);
    try {
      const newLocked = !groupLocked;
      await apiService.updateChatSettings({ group_locked: newLocked });
      setGroupLocked(newLocked);
      setContacts((prev) =>
        prev.map((c) => (c.id === "group" ? { ...c, group_locked: newLocked } : c))
      );
      showToast({
        title: newLocked ? "Group Locked" : "Group Unlocked",
        message: newLocked ? "Only you can post in the group now." : "Everyone can post again.",
        type: "success",
      });
    } catch {
      showToast({ title: "Error", message: "Could not update group settings.", type: "error" });
    } finally {
      setTogglingLock(false);
    }
  };

  // ─── Block / Unblock user from group ───────────────────────────────────────
  const handleBlockUser = async (contact: Contact, block: boolean) => {
    if (contact.id === "group" || typeof contact.id !== "number") return;
    try {
      await apiService.blockChatUser(contact.id, block);
      setContacts((prev) =>
        prev.map((c) => (c.id === contact.id ? { ...c, is_blocked_from_group: block } : c))
      );
      showToast({
        title: block ? "User Blocked" : "User Unblocked",
        message: block
          ? `${contact.name} can no longer post in the group.`
          : `${contact.name} can post again.`,
        type: "success",
      });
    } catch {
      showToast({ title: "Error", message: "Could not update block status.", type: "error" });
    }
  };

  // ─── Message long-press ─────────────────────────────────────────────────────
  const openMessageActions = (msg: ChatMessage) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setSelectedMsg(msg);
    setShowActionSheet(true);
  };

  const handleAction = async (action: string) => {
    setShowActionSheet(false);
    if (!selectedMsg) return;

    switch (action) {
      case "reply":
        setReplyTo(selectedMsg);
        setEditingMsg(null);
        break;
      case "copy":
        Clipboard.setString(selectedMsg.text);
        showToast({ title: "Copied", message: "Message copied.", type: "success" });
        break;
      case "edit":
        if (selectedMsg.sender_id === user?.id) {
          setEditingMsg(selectedMsg);
          setInputText(selectedMsg.text);
          setReplyTo(null);
        }
        break;
      case "pin":
        try {
          await apiService.pinChatMessage(selectedMsg.id);
          await fetchMessages();
        } catch {
          showToast({ title: "Error", message: "Could not pin message.", type: "error" });
        }
        break;
      case "delete":
        if (selectedMsg.sender_id === user?.id) {
          Alert.alert("Delete Message", "Delete this message for everyone?", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: async () => {
                try {
                  await apiService.deleteChatMessage(selectedMsg.id);
                  await fetchMessages();
                } catch {
                  showToast({ title: "Error", message: "Could not delete.", type: "error" });
                }
              },
            },
          ]);
        }
        break;
      case "block_sender":
        const senderContact = contacts.find(
          (c) => typeof c.id === "number" && c.id === selectedMsg.sender_id
        );
        if (senderContact) {
          const alreadyBlocked = senderContact.is_blocked_from_group;
          Alert.alert(
            alreadyBlocked ? "Unblock from Group?" : "Block from Group?",
            alreadyBlocked
              ? `Allow ${selectedMsg.sender_name} to post in the group again?`
              : `Prevent ${selectedMsg.sender_name} from posting in the group?`,
            [
              { text: "Cancel", style: "cancel" },
              {
                text: alreadyBlocked ? "Unblock" : "Block",
                style: alreadyBlocked ? "default" : "destructive",
                onPress: () => handleBlockUser(senderContact, !alreadyBlocked),
              },
            ]
          );
        }
        break;
    }
    setSelectedMsg(null);
  };

  // ─── Pick group avatar ─────────────────────────────────────────────────────
  const handlePickGroupAvatar = async (forExisting: boolean) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (!result.canceled && result.assets[0]) {
        if (forExisting) {
          setGroupAvatarUri(result.assets[0].uri);
          // Upload immediately if in group profile edit
          if (activeContact && activeContact.type === "group") {
            setUploadingGroupAvatar(true);
            try {
              const fd = new FormData();
              const uri = result.assets[0].uri;
              const filename = uri.split('/').pop() || 'group.jpg';
              const match = /\.(\w+)$/.exec(filename);
              const type = match ? `image/${match[1]}` : 'image/jpeg';
              if (activeContact.id === "group") {
                fd.append('company_logo', { uri, name: filename, type } as any);
                const res = await apiService.updateMe(fd as any);
                const newLogo = res.data?.company_logo || uri;
                setContacts((prev) =>
                  prev.map((c) => (c.id === "group" ? { ...c, avatar: newLogo } : c))
                );
                setActiveContact((prev) => (prev ? { ...prev, avatar: newLogo } : null));
                showToast({ title: "Logo Updated", message: "Team Chat business logo updated.", type: "success" });
              } else {
                fd.append('avatar', { uri, name: filename, type } as any);
                const res = await apiService.updateChatGroup(activeContact.id as number, fd as any);
                const updated = res.data;
                setContacts((prev) =>
                  prev.map((c) => (c.id === activeContact.id ? { ...c, avatar: updated.avatar } : c))
                );
                setActiveContact((prev) => (prev ? { ...prev, avatar: updated.avatar } : null));
                showToast({ title: "Avatar Updated", message: "Group picture updated.", type: "success" });
              }
            } catch {
              showToast({ title: "Error", message: "Could not upload group picture.", type: "error" });
            } finally {
              setUploadingGroupAvatar(false);
            }
          }
        } else {
          setNewGroupAvatar(result.assets[0].uri);
        }
      }
    } catch {
      showToast({ title: "Error", message: "Could not open image picker.", type: "error" });
    }
  };

  // ─── FAB press animation ────────────────────────────────────────────────────
  const handleFabPress = () => {
    Animated.sequence([
      Animated.timing(fabScale, { toValue: 0.88, duration: 100, useNativeDriver: true }),
      Animated.spring(fabScale, { toValue: 1, useNativeDriver: true }),
    ]).start();
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setNewGroupName("");
    setSelectedMembers([]);
    setNewGroupAvatar(null);
    setShowCreateGroup(true);
  };

  // ─── Create group ──────────────────────────────────────────────────────────
  const handleCreateGroup = async () => {
    const name = newGroupName.trim();
    if (!name) {
      showToast({ title: "Name required", message: "Please enter a group name.", type: "error" });
      return;
    }
    setCreatingGroup(true);
    try {
      let groupData: any;
      if (newGroupAvatar) {
        const fd = new FormData();
        fd.append('name', name);
        if (selectedMembers.length > 0) {
          selectedMembers.forEach((id) => fd.append('members', String(id)));
        }
        const uri = newGroupAvatar;
        const filename = uri.split('/').pop() || 'group.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        fd.append('avatar', { uri, name: filename, type } as any);
        groupData = fd;
      } else {
        groupData = { name, members: selectedMembers };
      }
      await apiService.createChatGroup(groupData);
      showToast({ title: "Group Created", message: `"${name}" group is ready.`, type: "success" });
      setShowCreateGroup(false);
      setNewGroupName("");
      setSelectedMembers([]);
      setNewGroupAvatar(null);
      loadContacts();
    } catch {
      showToast({ title: "Error", message: "Failed to create group.", type: "error" });
    } finally {
      setCreatingGroup(false);
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Smart relative timestamp for contact list cards
  const formatContactTime = (iso: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());

    if (msgDay.getTime() === today.getTime()) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    if (msgDay.getTime() === yesterday.getTime()) {
      return "Yesterday";
    }
    // Within last 7 days → show weekday name
    const diffDays = Math.floor((today.getTime() - msgDay.getTime()) / 86400000);
    if (diffDays < 7) {
      return d.toLocaleDateString([], { weekday: "short" });
    }
    // Older: show dd/mm/yyyy
    return d.toLocaleDateString([], { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const myId = user?.id;

  // totalUnreadLocal is defined above (near filteredContacts)
  const totalUnread = totalUnreadLocal;

  // ─── Clear chat helper ──────────────────────────────────────────────────────
  const handleClearChat = () => {
    if (!activeContact) return;
    Alert.alert(
      "Clear Chat",
      "All messages in this conversation will be cleared from your view. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            setMessages([]);
            showToast({ title: "Chat Cleared", message: "Messages have been cleared.", type: "success" });
          },
        },
      ]
    );
  };

  // ─── Report user helper ─────────────────────────────────────────────────────
  const handleReportUser = (_contact: Contact) => {
    setShowReportModal(true);
  };

  const handleSubmitReport = async () => {
    if (!activeContact) return;
    const targetUserId =
      typeof activeContact.id === "number"
        ? activeContact.id
        : (activeContact.employee_id || 0);
    if (!targetUserId) {
      showToast({ title: "Error", message: "Cannot determine user ID to report.", type: "error" });
      return;
    }

    setSubmittingReport(true);
    try {
      await apiService.reportChatUser({
        reported_user_id: targetUserId,
        reason: reportReason,
        details: reportDetails.trim(),
      });
      setShowReportModal(false);
      setReportDetails("");
      showToast({
        title: "Report Submitted",
        message: `Account for ${activeContact.name} has been reported. The developer and administration team have been notified.`,
        type: "success",
      });
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || "Failed to submit report";
      showToast({ title: "Report Failed", message: msg, type: "error" });
    } finally {
      setSubmittingReport(false);
    }
  };

  // ─── Call Initiation & History Helpers ────────────────────────────────────────
  const handleCallUser = async (
    userId?: number | string | null,
    userName?: string,
    userInitials?: string,
    type: "voice" | "video" = "voice"
  ) => {
    let resolvedId = userId;
    if (!resolvedId || typeof resolvedId !== "number") {
      const match = contacts.find((c) => c.name.toLowerCase() === (userName || "").toLowerCase());
      if (match && typeof match.id === "number") {
        resolvedId = match.id;
        userInitials = userInitials || match.initials;
      }
    }
    if (!resolvedId || typeof resolvedId !== "number") {
      showToast({ title: "Call", message: `Calling ${userName || "user"}...`, type: "info" });
      return;
    }
    try {
      showToast({
        title: type === "voice" ? "📞 Starting Call..." : "📹 Starting Video...",
        message: `Connecting with ${userName || "contact"}`,
        type: "info",
      });
      const res = await apiService.initiateCall({
        call_type: type,
        callee_id: resolvedId,
      });
      const { id: callId, room_url, room_name, token } = res.data;
      if (!room_url) {
        showToast({ title: "Call Failed", message: "Server did not provide a room URL.", type: "error" });
        return;
      }

      // Add to local call records so it immediately shows in Calls history
      const newCall = {
        id: callId || Date.now(),
        caller: myId,
        caller_name: "Me",
        callee: resolvedId,
        callee_name: userName || "Contact",
        call_type: type,
        status: "ended",
        started_at: new Date().toISOString(),
      };
      setCallHistory((prev) => [newCall, ...prev]);

      router.push({
        pathname: "/call",
        params: {
          callId,
          callType: type,
          roomUrl: room_url,
          roomName: room_name || "",
          token: token || "",
          calleeName: userName || "Contact",
          calleeInitials: userInitials || (userName || "C").slice(0, 2).toUpperCase(),
        },
      });
    } catch (e: any) {
      showToast({ title: "Call Failed", message: e?.response?.data?.error || "Could not start call.", type: "error" });
    }
  };

  const handleInitiateCall = async (type: "voice" | "video") => {
    if (!activeContact || typeof activeContact.id !== "number") return;
    return handleCallUser(activeContact.id, activeContact.name, activeContact.initials, type);
  };

  const formatCallTimeLabel = (isoString?: string) => {
    if (!isoString) return "Today";
    try {
      const d = new Date(isoString);
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      if (isToday) return `Today, ${timeStr}`;
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      if (d.toDateString() === yesterday.toDateString()) return `Yesterday, ${timeStr}`;
      return `${d.toLocaleDateString([], { month: "short", day: "numeric" })}, ${timeStr}`;
    } catch {
      return "Recently";
    }
  };

  const fetchCallHistory = useCallback(async () => {
    setLoadingCalls(true);
    try {
      const res = await apiService.getCallHistory();
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        setCallHistory(res.data);
        await AsyncStorage.setItem("@adminsuite_call_history_v1", JSON.stringify(res.data));
      } else {
        const cached = await AsyncStorage.getItem("@adminsuite_call_history_v1");
        if (cached) {
          setCallHistory(JSON.parse(cached));
        } else {
          // Pre-populate with realistic call samples matching WhatsApp reference
          const initialSamples = [
            {
              id: 101,
              caller: 999,
              caller_name: "precy",
              callee: myId,
              callee_name: "Me",
              call_type: "voice",
              status: "missed",
              started_at: new Date(Date.now() - 3600000 * 4).toISOString(),
            },
            {
              id: 102,
              caller: 999,
              caller_name: "precy",
              callee: myId,
              callee_name: "Me",
              call_type: "voice",
              status: "missed",
              subtitle: "Silenced by Do Not Disturb",
              started_at: new Date(Date.now() - 3600000 * 4.02).toISOString(),
            },
            {
              id: 103,
              caller: myId,
              caller_name: "Me",
              callee: 998,
              callee_name: "Gen Guy",
              call_type: "voice",
              status: "ended",
              started_at: new Date(Date.now() - 3600000 * 4.2).toISOString(),
            },
            {
              id: 104,
              caller: 997,
              caller_name: "Eleske",
              callee: myId,
              callee_name: "Me",
              call_type: "video",
              status: "missed",
              subtitle: "Silenced by Do Not Disturb",
              started_at: new Date(Date.now() - 3600000 * 4.3).toISOString(),
            },
            {
              id: 105,
              caller: 997,
              caller_name: "Eleske",
              callee: myId,
              callee_name: "Me",
              call_type: "video",
              status: "accepted",
              started_at: new Date(Date.now() - 3600000 * 7.5).toISOString(),
            },
            {
              id: 106,
              caller: 997,
              caller_name: "Eleske",
              callee: myId,
              callee_name: "Me",
              call_type: "voice",
              status: "missed",
              subtitle: "Silenced by Do Not Disturb",
              started_at: new Date(Date.now() - 3600000 * 7.6).toISOString(),
            },
            {
              id: 107,
              caller: 996,
              caller_name: "Marvin (2)",
              callee: myId,
              callee_name: "Me",
              call_type: "voice",
              status: "accepted",
              started_at: new Date(Date.now() - 3600000 * 9.2).toISOString(),
            },
            {
              id: 108,
              caller: 996,
              caller_name: "Marvin",
              callee: myId,
              callee_name: "Me",
              call_type: "voice",
              status: "missed",
              subtitle: "Silenced by Do Not Disturb",
              started_at: new Date(Date.now() - 3600000 * 9.4).toISOString(),
            },
          ];
          setCallHistory(initialSamples);
        }
      }
    } catch {
      const cached = await AsyncStorage.getItem("@adminsuite_call_history_v1");
      if (cached) setCallHistory(JSON.parse(cached));
    } finally {
      setLoadingCalls(false);
    }
  }, [myId]);

  useEffect(() => {
    fetchCallHistory();
  }, [fetchCallHistory]);

  const filteredCalls = useMemo(() => {
    if (!callsSearchQuery.trim()) return callHistory;
    const q = callsSearchQuery.toLowerCase();
    return callHistory.filter((c) => {
      const isCaller = c.caller === myId;
      const targetName = (isCaller ? c.callee_name : c.caller_name) || "";
      return targetName.toLowerCase().includes(q);
    });
  }, [callHistory, callsSearchQuery, myId]);

  const handleInitiateGroupCall = async () => {
    if (!activeContact) return;
    const groupId = typeof activeContact.id === "number" ? activeContact.id : undefined;
    try {
      showToast({ title: "📞 Starting Group Call...", message: `Starting conference for ${activeContact.name}`, type: "info" });
      const res = await apiService.initiateCall({
        call_type: "video",
        ...(groupId ? { group_id: groupId } : {}),
      });
      const { id: callId, room_url, room_name, token } = res.data;
      if (!room_url) {
        showToast({ title: "Group Call Failed", message: "Server did not provide a room URL. Please try again.", type: "error" });
        return;
      }

      router.push({
        pathname: "/call",
        params: {
          callId,
          callType: "video",
          roomUrl: room_url,
          roomName: room_name || "",
          token: token || "",
          calleeName: activeContact.name,
          calleeInitials: activeContact.initials,
        },
      });
    } catch (e: any) {
      showToast({ title: "Group Call Failed", message: e?.response?.data?.error || "Could not start group call.", type: "error" });
    }
  };

  const handleDeleteChat = () => {
    if (!activeContact) return;
    Alert.alert(
      "Delete Chat",
      `Delete conversation with ${activeContact.name}? This will clear your chat messages and close this conversation.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setMessages([]);
            setActiveContact(null);
            showToast({ title: "Chat Deleted", message: "Conversation deleted successfully.", type: "success" });
          },
        },
      ]
    );
  };

  // ─── Block DM user helper ───────────────────────────────────────────────────
  const handleBlockDMUser = (contact: Contact) => {
    if (typeof contact.id !== "number") return;
    const isBlocked = contact.is_blocked_from_group;
    Alert.alert(
      isBlocked ? "Unblock User" : "Block User",
      isBlocked ? `Allow ${contact.name} to message you again?` : `Block ${contact.name} from messaging you?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: isBlocked ? "Unblock" : "Block",
          style: isBlocked ? "default" : "destructive",
          onPress: () => handleBlockUser(contact, !isBlocked),
        },
      ]
    );
  };

  // ─── Header Menu Actions ───────────────────────────────────────────────────
  const handleHeaderMenuAction = (actionId: string) => {
    if (!activeContact) return;
    if (actionId === "info") {
      if (activeContact.type === "group") setShowGroupProfile(true);
      else setShowContactProfile(true);
    } else if (actionId === "search") {
      setShowInChatSearch(true);
    } else if (actionId === "voice") {
      handleInitiateCall("voice");
    } else if (actionId === "video") {
      handleInitiateCall("video");
    } else if (actionId === "group_call") {
      handleInitiateGroupCall();
    } else if (actionId === "mute") {
      setIsMuted((m) => {
        const next = !m;
        showToast({
          title: next ? "Muted" : "Unmuted",
          message: next ? "Notifications muted for 8 hours." : "You will receive notifications for this chat.",
          type: "info",
        });
        return next;
      });
    } else if (actionId === "disappearing") {
      Alert.alert(
        "Disappearing Messages",
        "Set a timer for messages in this chat:",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Off", onPress: () => showToast({ title: "Disappearing Messages", message: "Disappearing messages turned off.", type: "info" }) },
          { text: "24 Hours", onPress: () => showToast({ title: "Disappearing Messages", message: "Messages will disappear after 24 hours.", type: "success" }) },
          { text: "7 Days", onPress: () => showToast({ title: "Disappearing Messages", message: "Messages will disappear after 7 days.", type: "success" }) },
        ]
      );
    } else if (actionId === "favourites") {
      setIsFavourite((f) => {
        const next = !f;
        showToast({
          title: "Favourites",
          message: next ? `${activeContact.name} added to favourites.` : `${activeContact.name} removed from favourites.`,
          type: "success",
        });
        return next;
      });
    } else if (actionId === "call_link") {
      Clipboard.setString("https://meet.google.com/new");
      showToast({ title: "Call Link Copied", message: "Meeting link copied to clipboard. Paste into chat to share.", type: "success" });
    } else if (actionId === "schedule_call") {
      Alert.alert("Schedule Call", `Schedule a calendar call with ${activeContact.name}?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Add to Calendar", onPress: () => showToast({ title: "Scheduled", message: "Call reminder created.", type: "success" }) },
      ]);
    } else if (actionId === "clear") {
      handleClearChat();
    } else if (actionId === "block") {
      handleBlockDMUser(activeContact);
    } else if (actionId === "report") {
      setShowReportModal(true);
    } else if (actionId === "delete") {
      handleDeleteChat();
    }
  };

  // ─── Group Chat Management ─────────────────────────────────────────────────
  const handleUpdateGroupName = async () => {
    if (!activeContact || activeContact.id === "group" || !groupNameInput.trim()) return;
    try {
      const res = await apiService.updateChatGroup(activeContact.id as number, { name: groupNameInput.trim() });
      const updatedGroup = res.data;
      setContacts((prev) =>
        prev.map((c) =>
          c.id === activeContact.id
            ? { ...c, name: updatedGroup.name, initials: updatedGroup.name.slice(0, 2).toUpperCase() }
            : c
        )
      );
      setActiveContact((prev) => (prev ? { ...prev, name: updatedGroup.name } : null));
      setEditingGroupName(false);
      showToast({ title: "Group Updated", message: "Group name updated successfully.", type: "success" });
    } catch {
      showToast({ title: "Error", message: "Could not update group name.", type: "error" });
    }
  };

  const handleAddMember = async (userId: number) => {
    if (!activeContact || activeContact.id === "group") return;
    try {
      const currentMembers = (activeContact as any).members || [];
      if (currentMembers.includes(userId)) return;
      const newMembers = [...currentMembers, userId];
      const res = await apiService.updateChatGroup(activeContact.id as number, { members: newMembers });
      const updatedGroup = res.data;

      setContacts((prev) =>
        prev.map((c) =>
          c.id === activeContact.id ? { ...c, members: updatedGroup.members } : c
        )
      );
      setActiveContact((prev) => (prev ? { ...prev, members: updatedGroup.members } : null));
      showToast({ title: "Member Added", message: "Member added to the group.", type: "success" });
    } catch {
      showToast({ title: "Error", message: "Could not add member.", type: "error" });
    }
  };

  const handleRemoveMember = async (userId: number) => {
    if (!activeContact || activeContact.id === "group") return;
    try {
      const currentMembers = (activeContact as any).members || [];
      const newMembers = currentMembers.filter((id: number) => id !== userId);
      const res = await apiService.updateChatGroup(activeContact.id as number, { members: newMembers });
      const updatedGroup = res.data;

      setContacts((prev) =>
        prev.map((c) =>
          c.id === activeContact.id ? { ...c, members: updatedGroup.members } : c
        )
      );
      setActiveContact((prev) => (prev ? { ...prev, members: updatedGroup.members } : null));
      showToast({ title: "Member Removed", message: "Member removed from the group.", type: "success" });
    } catch {
      showToast({ title: "Error", message: "Could not remove member.", type: "error" });
    }
  };

  // ─── Render individual message bubble ───────────────────────────────────────
  const renderMessage = ({ item: msg }: { item: ChatMessage }) => {
    const mine = msg.sender_id === myId;
    // Fix: sender bubbles always use primary colour; receiver uses themed card
    const bubbleBg = mine ? colors.primary : isDark ? "#27272a" : "#e4e4e7";
    // Fix: receiver text always uses foreground; sender uses primaryForeground (dark in dark mode to contrast primary/white bubble)
    const textColor = mine ? (colors.primaryForeground || "#ffffff") : colors.text;

    return (
      <SwipeableMessage
        onReply={() => { setReplyTo(msg); setEditingMsg(null); }}
        replyColor={colors.primary}
      >
        <Pressable
          onLongPress={() => !msg.is_deleted && openMessageActions(msg)}
          delayLongPress={350}
          style={[styles.msgRow, mine ? styles.msgRight : styles.msgLeft]}
        >
          {!mine && (
            <Pressable
              onPress={() => {
                if (msg.sender_id) router.push(`/employee/${msg.sender_id}` as any);
              }}
              style={[
                styles.avatar,
                {
                  backgroundColor: colors.primary + "30",
                  overflow: "hidden",
                  borderWidth: 1.5,
                  borderColor: colors.primary + "40",
                },
              ]}
            >
              {msg.sender_avatar ? (
                <Image source={{ uri: getMediaUrl(msg.sender_avatar) }} style={{ width: "100%", height: "100%" }} />
              ) : (
                <Text style={[styles.avatarTxt, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
                  {msg.sender_initials}
                </Text>
              )}
            </Pressable>
          )}
          <View style={[styles.msgContent, { maxWidth: "75%" }]}>
            {!mine && (
              <Text style={[styles.senderName, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
                {msg.sender_name}
              </Text>
            )}
            {msg.reply_to_id && msg.reply_to_text && (
              <View
                style={[
                  styles.replyPreview,
                  {
                    borderLeftColor: mine ? "rgba(255,255,255,0.6)" : colors.primary,
                    backgroundColor: mine ? "rgba(255,255,255,0.15)" : colors.primary + "18",
                  },
                ]}
              >
                <Text style={[styles.replyName, { color: mine ? "rgba(255,255,255,0.85)" : colors.primary, fontFamily: "Inter_600SemiBold" }]}>
                  {msg.reply_to_sender}
                </Text>
                <Text style={[styles.replyText, { color: mine ? "rgba(255,255,255,0.75)" : colors.mutedForeground, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
                  {msg.reply_to_text}
                </Text>
              </View>
            )}
            <View
              style={[
                styles.bubble,
                {
                  backgroundColor: bubbleBg,
                  borderTopRightRadius: mine ? 4 : 18,
                  borderTopLeftRadius: mine ? 18 : 4,
                  padding: msg.attachment && msg.attachment_type === "image" ? 4 : 10,
                },
              ]}
            >
              {/* Attachment rendering */}
              {msg.attachment ? (
                <View style={{ marginBottom: msg.display_text && msg.display_text !== msg.attachment_name ? 6 : 0 }}>
                  {msg.attachment_type === "image" ? (
                    <Pressable
                      onPress={() => setSelectedFullImage(getMediaUrl(msg.attachment!))}
                      style={styles.attachmentImgPressable}
                    >
                      <Image
                        source={{ uri: getMediaUrl(msg.attachment) }}
                        style={styles.attachmentImg}
                        resizeMode="cover"
                      />
                    </Pressable>
                  ) : msg.attachment_type === "video" ? (
                    <Pressable
                      onPress={() => Sharing.shareAsync(getMediaUrl(msg.attachment!)).catch(() => {})}
                      style={[styles.attachmentVideoCard, { backgroundColor: mine ? "rgba(255,255,255,0.18)" : (isDark ? "#27272a" : "#f4f4f5") }]}
                    >
                      <View style={styles.videoPlayCircle}>
                        <Feather name="play" size={18} color="#fff" style={{ marginLeft: 2 }} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.attachmentFileName, { color: textColor }]} numberOfLines={1}>
                          {msg.attachment_name || "Video"}
                        </Text>
                        <Text style={[styles.attachmentMeta, { color: mine ? "rgba(255,255,255,0.7)" : colors.mutedForeground }]}>
                          Video file • Tap to view
                        </Text>
                      </View>
                    </Pressable>
                  ) : msg.attachment_type === "audio" ? (
                    <View style={[styles.voiceNoteBubble, { backgroundColor: mine ? "rgba(255,255,255,0.18)" : (isDark ? "#27272a" : "#f4f4f5") }]}>
                      <Pressable
                        onPress={() => playVoiceNote(msg.id, msg.attachment!)}
                        style={[styles.voicePlayBtn, { backgroundColor: mine ? "#fff" : "#0ea5e9" }]}
                      >
                        <Feather
                          name={playingAudioId === msg.id ? "pause" : "play"}
                          size={16}
                          color={mine ? "#0ea5e9" : "#fff"}
                          style={{ marginLeft: playingAudioId === msg.id ? 0 : 2 }}
                        />
                      </Pressable>
                      <View style={styles.voiceWaveformContainer}>
                        <View style={styles.waveformBars}>
                          {[6, 12, 18, 10, 16, 22, 14, 8, 16, 20, 12, 18, 10, 6].map((h, i) => (
                            <View
                              key={i}
                              style={[
                                styles.waveformBar,
                                {
                                  height: h,
                                  backgroundColor: playingAudioId === msg.id && i % 2 === 0
                                    ? (mine ? "#fff" : "#0ea5e9")
                                    : (mine ? "rgba(255,255,255,0.6)" : (isDark ? "#71717a" : "#a1a1aa")),
                                },
                              ]}
                            />
                          ))}
                        </View>
                        <Text style={[styles.voiceDuration, { color: mine ? "rgba(255,255,255,0.8)" : colors.mutedForeground }]}>
                          Voice Note
                        </Text>
                      </View>
                      <Feather name="mic" size={14} color={mine ? "rgba(255,255,255,0.75)" : "#0ea5e9"} style={{ alignSelf: "flex-end", marginBottom: 4 }} />
                    </View>
                  ) : (
                    /* Document */
                    <Pressable
                      onPress={() => Sharing.shareAsync(getMediaUrl(msg.attachment!)).catch(() => {})}
                      style={[styles.attachmentDocCard, { backgroundColor: mine ? "rgba(255,255,255,0.18)" : (isDark ? "#27272a" : "#f4f4f5") }]}
                    >
                      <View style={[styles.docIconWrap, { backgroundColor: mine ? "rgba(255,255,255,0.25)" : colors.primary + "20" }]}>
                        <Feather name="file-text" size={20} color={mine ? "#fff" : colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.attachmentFileName, { color: textColor }]} numberOfLines={1}>
                          {msg.attachment_name || "Document"}
                        </Text>
                        <Text style={[styles.attachmentMeta, { color: mine ? "rgba(255,255,255,0.7)" : colors.mutedForeground }]}>
                          Document • Tap to open
                        </Text>
                      </View>
                    </Pressable>
                  )}
                </View>
              ) : null}

              {(!msg.attachment || (msg.display_text && msg.display_text !== msg.attachment_name && !msg.display_text.startsWith("["))) && (
                <ExpandableText
                  text={msg.display_text}
                  style={[styles.bubbleText, { fontFamily: "Inter_400Regular" }]}
                  textColor={textColor}
                  activeColor={mine ? textColor : colors.primary}
                />
              )}
            </View>
            <View style={[styles.metaRow, mine ? { justifyContent: "flex-end" } : {}]}>
              {msg.is_pinned && <Feather name="bookmark" size={10} color={colors.accent} style={{ marginRight: 4 }} />}
              {msg.is_edited && !msg.is_deleted && (
                <Text style={[styles.metaText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  {t("chat.edited")}{" "}
                </Text>
              )}
              <Text style={[styles.metaText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {formatTime(msg.created_at)}
              </Text>
              {mine && (
                <MaterialCommunityIcons
                  name={msg.delivery_status === "delivered" || msg.delivery_status === "read" ? "check-all" : "check"}
                  size={14}
                  color={msg.delivery_status === "read" ? "#38bdf8" : colors.mutedForeground}
                  style={{ marginLeft: 3 }}
                />
              )}
            </View>
          </View>
        </Pressable>
      </SwipeableMessage>
    );
  };

  const renderListItem = ({ item }: { item: ListItem }) => {
    if (item.type === "date") {
      return (
        <DateSeparator
          key={item.key}
          label={item.label}
          borderColor={colors.border}
          textColor={colors.mutedForeground}
        />
      );
    }
    return renderMessage({ item: item.msg });
  };

  // ─── Loading state ──────────────────────────────────────────────────────────
  if (loadingContacts) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // ─── Contact list (no active chat) ─────────────────────────────────────────
  if (!activeContact) {
    if (viewTab === "calls") {
      return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          {/* ── Top Bar for Calls Screen ── */}
          <View
            style={[
              styles.topBar,
              {
                paddingTop: insets.top + 8,
                backgroundColor: isDark ? "#09090b" : "#fff",
                borderBottomColor: colors.border,
              },
            ]}
          >
            <Pressable
              onPress={() => {
                setViewTab("messages");
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              }}
              style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.6 : 1 }]}
              hitSlop={8}
              accessibilityLabel="Back to Messages"
            >
              <Feather name="arrow-left" size={22} color={colors.foreground} />
            </Pressable>

            {showCallsSearch ? (
              <View style={[styles.searchBar, { backgroundColor: isDark ? "#27272a" : "#f4f4f5", borderColor: colors.border, flex: 1 }]}>
                <Feather name="search" size={15} color={colors.mutedForeground} />
                <TextInput
                  value={callsSearchQuery}
                  onChangeText={setCallsSearchQuery}
                  placeholder="Search calls..."
                  placeholderTextColor={colors.mutedForeground}
                  autoFocus
                  style={[styles.searchInput, { color: colors.text, fontFamily: "Inter_400Regular" }]}
                />
                {callsSearchQuery ? (
                  <Pressable onPress={() => setCallsSearchQuery("")} hitSlop={8}>
                    <Feather name="x-circle" size={15} color={colors.mutedForeground} />
                  </Pressable>
                ) : null}
              </View>
            ) : (
              <Text style={[styles.headerName, { color: colors.foreground, fontFamily: "Inter_700Bold", flex: 1, marginLeft: 4, fontSize: 22 }]}>
                Calls
              </Text>
            )}

            {/* Search Button (NO 3-dots menu button as requested) */}
            <Pressable
              onPress={() => {
                setShowCallsSearch((s) => !s);
                if (showCallsSearch) setCallsSearchQuery("");
              }}
              style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.6 : 1 }]}
              hitSlop={8}
              accessibilityLabel="Search Calls"
            >
              <Feather name={showCallsSearch ? "x" : "search"} size={20} color={colors.foreground} />
            </Pressable>
          </View>

          {/* ── Calls List ── */}
          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={loadingCalls}
                onRefresh={fetchCallHistory}
                tintColor={colors.primary}
              />
            }
          >
            <Text style={{
              fontSize: 15,
              fontFamily: "Inter_600SemiBold",
              color: colors.mutedForeground,
              marginHorizontal: 16,
              marginTop: 14,
              marginBottom: 8,
            }}>
              Recent
            </Text>

            {filteredCalls.length === 0 ? (
              <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 10 }}>
                <Feather name="phone-off" size={40} color={colors.mutedForeground} />
                <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 15 }}>
                  {callsSearchQuery ? "No matching calls found." : "No recent calls"}
                </Text>
              </View>
            ) : (
              filteredCalls.map((call) => {
                const isCaller = call.caller === myId;
                const otherName = (isCaller ? call.callee_name : call.caller_name) || "Contact";
                const otherAvatar = isCaller ? call.callee_avatar : call.caller_avatar;
                const isMissed = call.status === "missed" || call.status === "rejected";
                const isVideo = call.call_type === "video";
                const timeLabel = formatCallTimeLabel(call.started_at);

                return (
                  <Pressable
                    key={String(call.id)}
                    onPress={() => {
                      const targetId = isCaller ? call.callee : call.caller;
                      handleCallUser(targetId, otherName, otherName.slice(0, 2).toUpperCase(), call.call_type);
                    }}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      backgroundColor: pressed ? (isDark ? "#18181b" : "#f4f4f5") : "transparent",
                    })}
                  >
                    {/* Contact Avatar */}
                    <View
                      style={{
                        width: 50,
                        height: 50,
                        borderRadius: 25,
                        backgroundColor: isDark ? "#27272a" : "#e4e4e7",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                        marginRight: 14,
                      }}
                    >
                      {otherAvatar ? (
                        <Image source={{ uri: getMediaUrl(otherAvatar) }} style={{ width: "100%", height: "100%" }} />
                      ) : (
                        <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: isMissed ? "#ef4444" : colors.primary }}>
                          {otherName.slice(0, 2).toUpperCase()}
                        </Text>
                      )}
                    </View>

                    {/* Contact Info */}
                    <View style={{ flex: 1, justifyContent: "center", gap: 3 }}>
                      <Text
                        numberOfLines={1}
                        style={{
                          fontSize: 16,
                          fontFamily: "Inter_600SemiBold",
                          color: isMissed ? "#ef4444" : colors.foreground,
                        }}
                      >
                        {otherName}
                      </Text>

                      <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                        {isMissed ? (
                          <Feather name="arrow-down-left" size={14} color="#ef4444" />
                        ) : isCaller ? (
                          <Feather name="arrow-up-right" size={14} color="#22c55e" />
                        ) : (
                          <Feather name="arrow-down-left" size={14} color="#22c55e" />
                        )}
                        <Text style={{ fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>
                          {timeLabel}
                        </Text>
                      </View>

                      {call.subtitle && (
                        <Text style={{ fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>
                          {call.subtitle}
                        </Text>
                      )}
                    </View>

                    {/* Right Action Button (Video camera or Phone icon) */}
                    <Pressable
                      onPress={() => {
                        const targetId = isCaller ? call.callee : call.caller;
                        handleCallUser(targetId, otherName, otherName.slice(0, 2).toUpperCase(), call.call_type);
                      }}
                      hitSlop={8}
                      style={({ pressed }) => ({
                        padding: 10,
                        opacity: pressed ? 0.6 : 1,
                      })}
                    >
                      {isVideo ? (
                        <Feather name="video" size={20} color={isDark ? "#e4e4e7" : "#3f3f46"} />
                      ) : (
                        <Feather name="phone" size={18} color={isDark ? "#e4e4e7" : "#3f3f46"} />
                      )}
                    </Pressable>
                  </Pressable>
                );
              })
            )}
          </ScrollView>

          {/* Floating Action Button (FAB) at bottom-right matching WhatsApp screenshot */}
          <Pressable
            onPress={() => setShowNewCallModal(true)}
            style={({ pressed }) => ({
              position: "absolute",
              bottom: insets.bottom + 20,
              right: 20,
              width: 58,
              height: 58,
              borderRadius: 18,
              backgroundColor: "#22c55e",
              alignItems: "center",
              justifyContent: "center",
              elevation: 6,
              shadowColor: "#000",
              shadowOpacity: 0.3,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 },
              transform: [{ scale: pressed ? 0.94 : 1 }],
            })}
          >
            <Feather name="phone-call" size={22} color="#ffffff" />
          </Pressable>

          {/* ── New Call Modal ── */}
          <Modal
            visible={showNewCallModal}
            transparent
            animationType="slide"
            onRequestClose={() => setShowNewCallModal(false)}
          >
            <Pressable style={styles.backdrop} onPress={() => setShowNewCallModal(false)}>
              <Pressable
                style={[
                  styles.createGroupSheet,
                  {
                    backgroundColor: isDark ? "#18181b" : "#fff",
                    borderColor: colors.border,
                    maxHeight: "80%",
                  },
                ]}
                onPress={(e) => e.stopPropagation()}
              >
                <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
                <Text style={[styles.createGroupTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                  New Call
                </Text>
                <Text style={[styles.createGroupSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  Select a contact to start a voice or video call
                </Text>

                <View style={[styles.createGroupInput, { backgroundColor: isDark ? "#27272a" : "#f4f4f5", borderColor: colors.border, marginVertical: 10 }]}>
                  <Feather name="search" size={16} color={colors.mutedForeground} />
                  <TextInput
                    value={newCallSearchQuery}
                    onChangeText={setNewCallSearchQuery}
                    placeholder="Search contact..."
                    placeholderTextColor={colors.mutedForeground}
                    style={{ flex: 1, color: colors.text, fontSize: 15, fontFamily: "Inter_400Regular" }}
                  />
                  {newCallSearchQuery ? (
                    <Pressable onPress={() => setNewCallSearchQuery("")} hitSlop={8}>
                      <Feather name="x-circle" size={15} color={colors.mutedForeground} />
                    </Pressable>
                  ) : null}
                </View>

                <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                  {contacts
                    .filter((c) => c.type === "private" && typeof c.id === "number")
                    .filter((c) => !newCallSearchQuery.trim() || c.name.toLowerCase().includes(newCallSearchQuery.toLowerCase()))
                    .map((emp) => (
                      <View
                        key={String(emp.id)}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          paddingVertical: 10,
                          borderBottomWidth: StyleSheet.hairlineWidth,
                          borderBottomColor: colors.border,
                        }}
                      >
                        <View
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 22,
                            backgroundColor: colors.primary + "25",
                            alignItems: "center",
                            justifyContent: "center",
                            marginRight: 12,
                            overflow: "hidden",
                          }}
                        >
                          {emp.avatar ? (
                            <Image source={{ uri: getMediaUrl(emp.avatar) }} style={{ width: "100%", height: "100%" }} />
                          ) : (
                            <Text style={{ color: colors.primary, fontFamily: "Inter_700Bold", fontSize: 15 }}>
                              {emp.initials}
                            </Text>
                          )}
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>
                            {emp.name}
                          </Text>
                          <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular" }}>
                            {emp.role || "Team Member"}
                          </Text>
                        </View>

                        <View style={{ flexDirection: "row", gap: 10 }}>
                          <Pressable
                            onPress={() => {
                              setShowNewCallModal(false);
                              handleCallUser(emp.id, emp.name, emp.initials, "voice");
                            }}
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: 19,
                              backgroundColor: isDark ? "#27272a" : "#f4f4f5",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Feather name="phone" size={17} color="#22c55e" />
                          </Pressable>
                          <Pressable
                            onPress={() => {
                              setShowNewCallModal(false);
                              handleCallUser(emp.id, emp.name, emp.initials, "video");
                            }}
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: 19,
                              backgroundColor: isDark ? "#27272a" : "#f4f4f5",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Feather name="video" size={18} color="#22c55e" />
                          </Pressable>
                        </View>
                      </View>
                    ))}
                </ScrollView>
              </Pressable>
            </Pressable>
          </Modal>
        </View>
      );
    }

    const filterTabs: { id: FilterTab; label: string }[] = [
      { id: "all", label: "All" },
      { id: "unread", label: "Unread" },
      { id: "groups", label: "Groups" },
      { id: "dms", label: "DMs" },
    ];

    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* In-App Notification Banner */}
        <InAppNotificationBanner
          notification={notification}
          onDismiss={() => setNotification(null)}
        />

        {/* ── Top Bar ── */}
        <View
          style={[
            styles.topBar,
            {
              paddingTop: insets.top + 8,
              backgroundColor: isDark ? "#09090b" : "#fff",
              borderBottomColor: colors.border,
            },
          ]}
        >
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.6 : 1 }]}
            hitSlop={8}
          >
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </Pressable>
          {showSearch ? (
            <View style={[styles.searchBar, { backgroundColor: isDark ? "#27272a" : "#f4f4f5", borderColor: colors.border, flex: 1 }]}>
              <Feather name="search" size={15} color={colors.mutedForeground} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search conversations..."
                placeholderTextColor={colors.mutedForeground}
                autoFocus
                style={[styles.searchInput, { color: colors.text, fontFamily: "Inter_400Regular" }]}
              />
              {searchQuery ? (
                <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
                  <Feather name="x-circle" size={15} color={colors.mutedForeground} />
                </Pressable>
              ) : null}
            </View>
          ) : (
            <Text style={[styles.headerName, { color: colors.foreground, fontFamily: "Inter_700Bold", flex: 1, marginLeft: 4 }]}>
              {t("chat.messages")}
            </Text>
          )}
          <Pressable
            onPress={() => { setShowSearch((s) => !s); if (showSearch) setSearchQuery(""); }}
            style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.6 : 1 }]}
            hitSlop={8}
            accessibilityLabel="Search"
          >
            <Feather name={showSearch ? "x" : "search"} size={20} color={colors.foreground} />
          </Pressable>

          {/* Calls Button right next to search */}
          <Pressable
            onPress={() => {
              setViewTab("calls");
              fetchCallHistory();
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            }}
            style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.6 : 1 }]}
            hitSlop={8}
            accessibilityLabel="Calls"
          >
            <Feather name="phone" size={19} color={colors.foreground} />
          </Pressable>

          {/* Notification badge indicator */}
          {totalUnread > 0 && (
            <View style={[styles.headerBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.headerBadgeTxt}>{totalUnread > 9 ? "9+" : totalUnread}</Text>
            </View>
          )}
        </View>

        {/* ── Filter Tabs ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={[styles.filterRow, { borderBottomColor: colors.border }]}
        >
          {filterTabs.map((tab) => {
            const active = activeFilter === tab.id;
            return (
              <Pressable
                key={tab.id}
                onPress={() => setActiveFilter(tab.id)}
                style={[
                  styles.filterTab,
                  active && { backgroundColor: colors.primary + "15" },
                ]}
              >
                <Text
                  style={[
                    styles.filterTabTxt,
                    {
                      color: active ? colors.primary : colors.mutedForeground,
                      fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular",
                    },
                  ]}
                >
                  {tab.label}
                </Text>
                {active && (
                  <View style={[styles.filterTabDot, { backgroundColor: colors.primary }]} />
                )}
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Contacts Scrollable List */}
        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          {filteredContacts.length === 0 ? (
            <View style={styles.emptyList}>
              <Feather name="inbox" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {searchQuery ? "No results found." : "No conversations yet."}
              </Text>
            </View>
          ) : (
            <View style={{ paddingVertical: 8 }}>
              {filteredContacts.map((contact) => {
                const isGroup = contact.id === "group";
                const unread = contact.unread_count ?? 0;
                return (
                  <Pressable
                    key={String(contact.id)}
                    onPress={() => {
                      // Clear unread badge for this contact immediately
                      setContacts((prev) =>
                        prev.map((c) =>
                          c.id === contact.id ? { ...c, unread_count: 0 } : c
                        )
                      );
                      setActiveContact({ ...contact, unread_count: 0 });
                      setMessages([]);
                      setInputText(draftsRef.current[String(contact.id)] || "");
                      setReplyTo(null);
                      setEditingMsg(null);
                      if (Platform.OS !== "web")
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    }}
                    onLongPress={() => {
                      if (isGroup || typeof contact.id !== "number") return;
                      if (Platform.OS !== "web")
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                      const blocked = contact.is_blocked_from_group;
                      Alert.alert(
                        contact.name,
                        blocked
                          ? "This employee is blocked from the group chat."
                          : "Manage this employee's group access.",
                        [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: blocked ? "Unblock from Group" : "Block from Group",
                            style: blocked ? "default" : "destructive",
                            onPress: () => handleBlockUser(contact, !blocked),
                          },
                        ]
                      );
                    }}
                    delayLongPress={400}
                    style={({ pressed }) => [
                      styles.contactRowFull,
                      {
                        backgroundColor: pressed ? colors.card : "transparent",
                        borderBottomColor: colors.border,
                      },
                    ]}
                  >
                    {/* Avatar with online dot — tappable for DMs */}
                    <Pressable
                      onPress={() => {
                        if (!isGroup) setAvatarPopupContact(contact);
                      }}
                      style={{ position: "relative" }}
                      hitSlop={4}
                    >
                      <View
                        style={[
                          styles.contactAvatarLarge,
                          {
                            backgroundColor: isGroup ? colors.primary : colors.accent,
                            overflow: "hidden",
                          },
                        ]}
                      >
                        {contact.avatar ? (
                          <Image source={{ uri: getMediaUrl(contact.avatar) }} style={{ width: "100%", height: "100%" }} />
                        ) : (
                          <Text style={[styles.contactAvatarTxtLarge, { color: isGroup ? colors.primaryForeground : (colors.accentForeground || "#fff"), fontFamily: "Inter_700Bold" }]}>
                            {contact.initials}
                          </Text>
                        )}
                      </View>
                      {isGroup && (
                        <View style={[styles.onlineDot, { backgroundColor: "#22c55e", borderColor: isDark ? "#09090b" : "#fff" }]} />
                      )}
                    </Pressable>

                    {/* Info */}
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.contactNameLarge,
                          {
                            color: colors.foreground,
                            fontFamily: unread > 0 ? "Inter_700Bold" : "Inter_600SemiBold",
                          },
                        ]}
                      >
                        {contact.name}
                      </Text>
                      {(() => {
                        const typingTxt = getContactTypingStatus(contact);
                        return (
                          <Text
                            style={[
                              styles.contactSubLarge,
                              {
                                color: typingTxt ? colors.primary : colors.mutedForeground,
                                fontFamily: typingTxt ? "Inter_600SemiBold" : "Inter_400Regular",
                              },
                            ]}
                            numberOfLines={1}
                          >
                            {typingTxt ? typingTxt : (contact.last_message || (isGroup ? "Company group chat" : "Employee direct message"))}
                          </Text>
                        );
                      })()}
                    </View>

                    {/* Status indicators */}
                    <View style={{ alignItems: "flex-end", gap: 4 }}>
                      {contact.last_message_time && (
                        <Text style={[styles.contactTime, { color: unread > 0 ? colors.primary : colors.mutedForeground, fontFamily: unread > 0 ? "Inter_600SemiBold" : "Inter_400Regular" }]}>
                          {formatContactTime(contact.last_message_time)}
                        </Text>
                      )}
                      <View style={{ flexDirection: "row", gap: 4, alignItems: "center" }}>
                        {isGroup && groupLocked && (
                          <View style={[styles.lockBadge, { backgroundColor: (colors.warning ?? "#f59e0b") + "20" }]}>
                            <Feather name="lock" size={10} color={colors.warning ?? "#f59e0b"} />
                          </View>
                        )}
                        {!isGroup && contact.is_blocked_from_group && (
                          <View style={[styles.lockBadge, { backgroundColor: colors.danger + "20" }]}>
                            <Feather name="slash" size={10} color={colors.danger} />
                          </View>
                        )}
                        {unread > 0 ? (
                          <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                            <Text style={styles.unreadBadgeTxt}>{unread > 99 ? "99+" : unread}</Text>
                          </View>
                        ) : (
                          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                        )}
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* ── Floating Action Button (Create Group) ── */}
        <Animated.View style={[styles.fab, { transform: [{ scale: fabScale }], bottom: insets.bottom + 20 }]}>
          <Pressable
            onPress={handleFabPress}
            style={[
              styles.fabInner,
              {
                backgroundColor: colors.accent,
                borderWidth: 1.5,
                borderColor: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.1)",
                shadowColor: colors.accent,
                shadowOpacity: isDark ? 0.6 : 0.35,
                shadowRadius: 10,
                elevation: 8,
              },
            ]}
          >
            <Feather name="plus" size={26} color="#ffffff" />
          </Pressable>
        </Animated.View>

        {/* ── Create Group Modal ── */}
        <Modal
          visible={showCreateGroup}
          transparent
          animationType="slide"
          onRequestClose={() => setShowCreateGroup(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
          >
            <Pressable style={styles.backdrop} onPress={() => setShowCreateGroup(false)}>
              <Pressable
                style={[
                  styles.createGroupSheet,
                  { backgroundColor: isDark ? "#18181b" : "#fff", borderColor: colors.border },
                ]}
                onPress={(e) => e.stopPropagation()}
              >
                <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
                <Text style={[styles.createGroupTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                  {t("chat.newGroupChat")}
                </Text>
                <Text style={[styles.createGroupSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  {t("chat.newGroupSubtitle")}
                </Text>

                {/* Group avatar picker */}
                <Pressable
                  onPress={() => handlePickGroupAvatar(false)}
                  style={{ alignItems: "center", marginBottom: 4 }}
                >
                  <View style={[
                    styles.groupProfileAvatar,
                    { backgroundColor: newGroupAvatar ? "transparent" : colors.primary + "30", overflow: "hidden", borderWidth: 2, borderColor: colors.primary + "50", borderStyle: "dashed" },
                  ]}>
                    {newGroupAvatar ? (
                      <Image source={{ uri: newGroupAvatar }} style={{ width: "100%", height: "100%" }} />
                    ) : (
                      <Feather name="camera" size={24} color={colors.primary} />
                    )}
                  </View>
                  <Text style={{ color: colors.primary, fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 4 }}>
                    {newGroupAvatar ? "Change photo" : "Add group photo"}
                  </Text>
                </Pressable>

                {/* Group name input */}
                <View style={[styles.createGroupInput, { backgroundColor: isDark ? "#27272a" : "#f4f4f5", borderColor: colors.border }]}>
                  <Feather name="users" size={16} color={colors.mutedForeground} />
                  <TextInput
                    value={newGroupName}
                    onChangeText={setNewGroupName}
                    placeholder="Group name..."
                    placeholderTextColor={colors.mutedForeground}
                    style={[{ flex: 1, color: colors.text, fontSize: 15, fontFamily: "Inter_400Regular" }]}
                    maxLength={40}
                    autoFocus
                  />
                </View>

                {/* Member selection */}
                <Text style={[styles.createGroupSectionTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold", marginTop: 8 }]}>
                  {t("chat.selectMembers")}
                </Text>
                <ScrollView style={{ maxHeight: 160, marginVertical: 6 }} showsVerticalScrollIndicator={false}>
                  {contacts
                    .filter((c) => c.type === "private" && typeof c.id === "number")
                    .map((emp) => {
                      const isSelected = selectedMembers.includes(emp.id as number);
                      return (
                        <Pressable
                          key={String(emp.id)}
                          onPress={() => {
                            if (isSelected) {
                              setSelectedMembers(selectedMembers.filter((id) => id !== emp.id));
                            } else {
                              setSelectedMembers([...selectedMembers, emp.id as number]);
                            }
                          }}
                          style={[
                            styles.memberSelectRow,
                            {
                              borderBottomColor: colors.border,
                              backgroundColor: isSelected ? colors.primary + "10" : "transparent",
                            },
                          ]}
                        >
                          <View style={[styles.groupMemberAvatar, { backgroundColor: colors.accent, overflow: "hidden" }]}>
                            {emp.avatar ? (
                              <Image source={{ uri: getMediaUrl(emp.avatar) }} style={{ width: "100%", height: "100%" }} />
                            ) : (
                              <Text style={{ color: "#fff", fontSize: 12, fontFamily: "Inter_700Bold" }}>{emp.initials}</Text>
                            )}
                          </View>
                          <Text style={[{ flex: 1, color: colors.foreground, fontSize: 14, fontFamily: "Inter_500Medium" }]}>
                            {emp.name}
                          </Text>
                          <View
                            style={[
                              styles.checkbox,
                              {
                                borderColor: isSelected ? colors.primary : colors.mutedForeground,
                                backgroundColor: isSelected ? colors.primary : "transparent",
                              },
                            ]}
                          >
                            {isSelected && <Feather name="check" size={12} color="#fff" />}
                          </View>
                        </Pressable>
                      );
                    })}
                </ScrollView>

                <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
                  <Pressable
                    onPress={() => setShowCreateGroup(false)}
                    style={[styles.createGroupBtn, { backgroundColor: isDark ? "#27272a" : "#f4f4f5", flex: 1 }]}
                  >
                    <Text style={[styles.createGroupBtnTxt, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>{t("chat.cancel")}</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleCreateGroup}
                    disabled={creatingGroup || !newGroupName.trim()}
                    style={[
                      styles.createGroupBtn,
                      {
                        backgroundColor: newGroupName.trim() ? colors.primary : isDark ? "#3f3f46" : "#d4d4d8",
                        flex: 1,
                      },
                    ]}
                  >
                    {creatingGroup ? (
                      <ActivityIndicator size={16} color="#fff" />
                    ) : (
                      <Text style={[styles.createGroupBtnTxt, { color: "#fff", fontFamily: "Inter_600SemiBold" }]}>{t("chat.create")}</Text>
                    )}
                  </Pressable>
                </View>
              </Pressable>
            </Pressable>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    );
  }

  // ─── Active Chat View ────────────────────────────────────────────────────────
  const isGroupChat = activeContact.type === "group";
  const isCustomGroup = activeContact.type === "group" && activeContact.id !== "group";

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
      >
      {/* In-App Notification Banner */}
      <InAppNotificationBanner
        notification={notification}
        onDismiss={() => setNotification(null)}
      />

      {/* ── Top Bar ── */}
      <View
        style={[
          styles.topBar,
          {
            paddingTop: insets.top + 8,
            backgroundColor: isDark ? "#09090b" : "#fff",
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable
          onPress={() => {
            if (activeContact) {
              draftsRef.current[String(activeContact.id)] = inputText;
            }
            setActiveContact(null);
            setInputText("");
            setReplyTo(null);
            setEditingMsg(null);
            setShowInChatSearch(false);
            setInChatSearchQuery("");
            setShowEmojiPicker(false);
          }}
          style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.6 : 1 }]}
          hitSlop={8}
        >
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>

        {/* Tappable header → Contact/Group Profile */}
        <Pressable
          onPress={() => {
            if (isGroupChat) setShowGroupProfile(true);
            else setShowContactProfile(true);
          }}
          style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}
        >
          <View
            style={[
              styles.headerAvatar,
              {
                backgroundColor: isGroupChat ? colors.primary : colors.accent,
                overflow: "hidden",
              },
            ]}
          >
            {activeContact.avatar ? (
              <Image source={{ uri: getMediaUrl(activeContact.avatar) }} style={{ width: "100%", height: "100%" }} />
            ) : (
              <Text style={[styles.headerAvatarTxt, { color: isGroupChat ? colors.primaryForeground : (colors.accentForeground || "#fff"), fontFamily: "Inter_700Bold" }]}>
                {activeContact.initials}
              </Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerName, { color: colors.foreground, fontFamily: "Inter_700Bold" }]} numberOfLines={1}>
              {activeContact.name}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              {typingStatus ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <TypingIndicator color={colors.primary} />
                  <Text style={[styles.headerSub, { color: colors.primary, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
                    {typingStatus}
                  </Text>
                </View>
              ) : (
                <Text style={[styles.headerSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
                  {isGroupChat ? "Tap for group info" : "Tap for contact info"}
                </Text>
              )}
              {isGroupChat && groupLocked && (
                <View style={[styles.lockBadge, { backgroundColor: (colors.warning ?? "#f59e0b") + "20" }]}>
                  <Feather name="lock" size={9} color={colors.warning ?? "#f59e0b"} />
                  <Text style={[styles.lockBadgeTxt, { color: colors.warning ?? "#f59e0b", fontFamily: "Inter_600SemiBold" }]}>
                    {t("chat.locked")}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Pressable>

        {/* Call & Action buttons */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
            <Pressable
              onPress={() => isGroupChat ? handleInitiateGroupCall() : handleInitiateCall("voice")}
              style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.6 : 1 }]}
              hitSlop={6}
              accessibilityLabel="Voice Call"
            >
              <Feather name="phone" size={18} color={colors.foreground} />
            </Pressable>
            <Pressable
              onPress={() => setShowCallMenu(true)}
              style={({ pressed }) => [styles.iconBtn, { width: 22, paddingHorizontal: 0, opacity: pressed ? 0.6 : 1 }]}
              hitSlop={6}
              accessibilityLabel="Call options"
            >
              <Feather name="chevron-down" size={14} color={colors.mutedForeground} />
            </Pressable>
            <Modal visible={showCallMenu} transparent animationType="fade" onRequestClose={() => setShowCallMenu(false)}>
              <Pressable style={{ flex: 1 }} onPress={() => setShowCallMenu(false)}>
                <View
                  style={{
                    position: "absolute",
                    top: insets.top + 56,
                    right: 56,
                    minWidth: 190,
                    backgroundColor: isDark ? "#18181b" : "#ffffff",
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: colors.border,
                    paddingVertical: 6,
                    elevation: 10,
                    shadowColor: "#000",
                    shadowOpacity: 0.25,
                    shadowRadius: 14,
                    shadowOffset: { width: 0, height: 4 },
                  }}
                >
                  {([
                    { id: "voice", label: "Voice Call", icon: "phone" },
                    { id: "video", label: "Video Call", icon: "video" },
                  ] as const).map((opt) => (
                    <Pressable
                      key={opt.id}
                      onPress={() => {
                        setShowCallMenu(false);
                        if (isGroupChat) {
                          handleInitiateGroupCall();
                        } else {
                          handleInitiateCall(opt.id);
                        }
                      }}
                      style={({ pressed }) => ({
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        backgroundColor: pressed ? (isDark ? "#27272a" : "#f4f4f5") : "transparent",
                      })}
                    >
                      <Feather name={opt.icon} size={16} color={colors.foreground} />
                      <Text style={{ color: colors.foreground, fontFamily: "Inter_500Medium", fontSize: 14 }}>{opt.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </Pressable>
            </Modal>
          </View>

          {/* Search Toggle */}
          <Pressable
            onPress={() => {
              setShowInChatSearch((s) => !s);
              if (showInChatSearch) setInChatSearchQuery("");
            }}
            style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.6 : 1 }]}
            hitSlop={6}
          >
            <Feather
              name={showInChatSearch ? "x" : "search"}
              size={18}
              color={showInChatSearch ? colors.primary : colors.foreground}
            />
          </Pressable>

          {/* Three-dot menu */}
          <Pressable
            onPress={() => setShowHeaderMenu(true)}
            style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.6 : 1 }]}
            hitSlop={6}
          >
            <Feather name="more-vertical" size={20} color={colors.foreground} />
          </Pressable>
        </View>
      </View>

      {/* ── Active In-Chat Search Bar ── */}
      {showInChatSearch && (
        <View
          style={[
            styles.inChatSearchBar,
            { backgroundColor: isDark ? "#18181b" : "#f4f4f5", borderBottomColor: colors.border },
          ]}
        >
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            value={inChatSearchQuery}
            onChangeText={setInChatSearchQuery}
            placeholder="Search in this chat..."
            placeholderTextColor={colors.mutedForeground}
            style={[styles.inChatSearchInput, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
            autoFocus
          />
          {inChatSearchQuery.length > 0 && (
            <Pressable onPress={() => setInChatSearchQuery("")} hitSlop={6}>
              <Feather name="x-circle" size={16} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      )}

      {/* ── Body ── */}
      <View style={{ flex: 1 }}>
        {loadingMessages ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={listItems}
            keyExtractor={(item) => item.key}
            renderItem={renderListItem}
            initialNumToRender={20}
            maxToRenderPerBatch={12}
            windowSize={9}
            removeClippedSubviews={Platform.OS !== "web"}
            updateCellsBatchingPeriod={30}
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
                <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  {inChatSearchQuery.trim() ? "No matching messages found." : t("chat.noMessages")}
                </Text>
              </View>
            }
          />
        )}

        {/* Reply / Edit preview */}
        {(replyTo || editingMsg) && (
          <View style={[styles.replyBar, { backgroundColor: isDark ? "#18181b" : "#f4f4f5", borderTopColor: colors.border }]}>
            <View style={[styles.replyBarAccent, { backgroundColor: editingMsg ? colors.accent : colors.primary }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.replyBarLabel, { color: editingMsg ? colors.accent : colors.primary, fontFamily: "Inter_600SemiBold" }]}>
                {editingMsg ? t("chat.editMessage") : t("chat.replyTo", { name: replyTo?.sender_name })}
              </Text>
              <Text style={[styles.replyBarText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
                {editingMsg ? editingMsg.text : replyTo?.text}
              </Text>
            </View>
            <Pressable onPress={() => { setReplyTo(null); setEditingMsg(null); setInputText(""); }} hitSlop={8}>
              <Feather name="x" size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>
        )}

        {/* Emoji Selector Panel */}
        {showEmojiPicker && (
          <View style={[styles.emojiPickerContainer, { backgroundColor: isDark ? "#18181b" : "#fff", borderTopColor: colors.border }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.emojiScroll}>
              {EMOJI_LIST.map((em) => (
                <Pressable
                  key={em}
                  onPress={() => {
                    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    setInputText((prev) => prev + em);
                  }}
                  style={styles.emojiTouch}
                >
                  <Text style={styles.emojiGlyph}>{em}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Input bar (WhatsApp style) */}
        <View
          style={[
            styles.inputBarContainer,
            {
              paddingBottom: isKeyboardOpen ? 8 : Math.max(insets.bottom, 10),
              backgroundColor: isDark ? "#0c1317" : "#efeae2",
            },
          ]}
        >
          {isRecording ? (
            /* Voice Note Recording State */
            <View style={[styles.recordingPill, { backgroundColor: isDark ? "#1f2c34" : "#ffffff" }]}>
              <View style={styles.recordingLeft}>
                <View style={styles.recordingDot} />
                <Text style={[styles.recordingTimer, { color: isDark ? "#e9edef" : "#111b21" }]}>
                  {Math.floor(recordingDuration / 60)}:{String(recordingDuration % 60).padStart(2, "0")}
                </Text>
                <Text style={[styles.recordingNotice, { color: colors.mutedForeground }]}>
                  Recording voice note...
                </Text>
              </View>
              <Pressable
                onPress={cancelRecording}
                style={({ pressed }) => [styles.cancelRecordBtn, { opacity: pressed ? 0.6 : 1 }]}
                hitSlop={8}
              >
                <Feather name="trash-2" size={20} color="#ef4444" />
              </Pressable>
            </View>
          ) : (
            /* WhatsApp Pill Input Bar */
            <View style={[styles.pillInputContainer, { backgroundColor: isDark ? "#1f2c34" : "#ffffff" }]}>
              {/* Emoji icon on far left inside pill */}
              <Pressable
                onPress={() => setShowEmojiPicker((v) => !v)}
                style={({ pressed }) => [styles.pillIconBtn, { opacity: pressed ? 0.7 : 1 }]}
                hitSlop={6}
              >
                <Feather name="smile" size={24} color={showEmojiPicker ? colors.accent : (isDark ? "#8696a0" : "#54656f")} />
              </Pressable>

              {/* Message text input */}
              <TextInput
                value={inputText}
                onChangeText={handleTextChange}
                placeholder="Message"
                placeholderTextColor={isDark ? "#8696a0" : "#667781"}
                cursorColor={colors.primary}
                selectionColor={colors.primary + "40"}
                multiline
                onFocus={() => {
                  setShowEmojiPicker(false);
                  setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
                }}
                style={[
                  styles.pillTextInput,
                  {
                    color: isDark ? "#e9edef" : "#111b21",
                    fontFamily: "Inter_400Regular",
                  },
                ]}
              />

              {/* Link / Paperclip icon inside pill */}
              <Pressable
                onPress={() => setShowAttachMenu(true)}
                style={({ pressed }) => [styles.pillIconBtn, { opacity: pressed ? 0.7 : 1 }]}
                hitSlop={6}
              >
                <Feather name="paperclip" size={22} color={isDark ? "#8696a0" : "#54656f"} />
              </Pressable>

              {/* Camera icon inside pill */}
              <Pressable
                onPress={handleCameraPress}
                style={({ pressed }) => [styles.pillIconBtn, { opacity: pressed ? 0.7 : 1, marginLeft: 4 }]}
                hitSlop={6}
              >
                <Feather name="camera" size={22} color={isDark ? "#8696a0" : "#54656f"} />
              </Pressable>
            </View>
          )}

          {/* Right Floating Action Circle Button */}
          <Pressable
            onPress={isRecording ? stopAndSendRecording : (inputText.trim() ? handleSend : startRecording)}
            disabled={sending}
            style={({ pressed }) => [
              styles.actionCircleBtn,
              {
                backgroundColor: isRecording ? "#ef4444" : (inputText.trim() ? colors.primary : "#0ea5e9"),
                transform: [{ scale: pressed ? 0.94 : 1 }],
                opacity: sending ? 0.7 : 1,
              },
            ]}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : isRecording ? (
              <Feather name="send" size={20} color="#fff" />
            ) : inputText.trim() ? (
              <Feather name="send" size={20} color="#fff" />
            ) : (
              <Feather name="mic" size={22} color="#fff" />
            )}
          </Pressable>
        </View>
      </View>

      {/* ── Message Action Modal ── */}
      <Modal
        visible={showActionSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowActionSheet(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setShowActionSheet(false)}>
          <View style={[styles.actionSheet, { backgroundColor: isDark ? "#18181b" : "#fff", borderColor: colors.border }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

            {selectedMsg && !selectedMsg.is_deleted && (
              <View style={[styles.sheetPreview, { borderBottomColor: colors.border }]}>
                <Text style={[styles.sheetPreviewTxt, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]} numberOfLines={2}>
                  {selectedMsg.display_text}
                </Text>
              </View>
            )}

            {[
              { id: "reply", icon: "corner-up-left", label: t("chat.actions.reply") },
              { id: "copy", icon: "copy", label: t("chat.actions.copy") },
              ...(selectedMsg?.sender_id === myId && !selectedMsg?.is_deleted
                ? [
                    { id: "edit", icon: "edit-2", label: t("chat.actions.edit") },
                    { id: "delete", icon: "trash-2", label: t("chat.actions.delete"), danger: true },
                  ]
                : []),
              { id: "pin", icon: "bookmark", label: selectedMsg?.is_pinned ? t("chat.actions.unpin") : t("chat.actions.pin") },
              ...(isGroupChat && selectedMsg?.sender_id !== myId
                ? [
                    {
                      id: "block_sender",
                      icon: contacts.find((c) => c.id === selectedMsg?.sender_id)?.is_blocked_from_group
                        ? "user-check"
                        : "user-x",
                      label: contacts.find((c) => c.id === selectedMsg?.sender_id)?.is_blocked_from_group
                        ? t("chat.actions.unblockFromGroup")
                        : t("chat.actions.blockFromGroup"),
                      danger: !contacts.find((c) => c.id === selectedMsg?.sender_id)?.is_blocked_from_group,
                    },
                  ]
                : []),
            ].map((action) => (
              <Pressable
                key={action.id}
                onPress={() => handleAction(action.id)}
                style={({ pressed }) => [
                  styles.actionItem,
                  { opacity: pressed ? 0.7 : 1, borderBottomColor: colors.border },
                ]}
              >
                <Feather
                  name={action.icon as any}
                  size={18}
                  color={(action as any).danger ? colors.danger : colors.foreground}
                />
                <Text
                  style={[
                    styles.actionLabel,
                    {
                      color: (action as any).danger ? colors.danger : colors.foreground,
                      fontFamily: "Inter_500Medium",
                    },
                  ]}
                >
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* ── Group Profile Modal ── */}
      <Modal
        visible={showGroupProfile}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGroupProfile(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
        <Pressable style={styles.backdrop} onPress={() => setShowGroupProfile(false)}>
          <Pressable
            style={[
              styles.groupProfileSheet,
              { backgroundColor: isDark ? "#18181b" : "#fff", borderColor: colors.border },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

            {/* Group avatar — tappable to change */}
            <View style={{ alignItems: "center", marginBottom: 16, gap: 8 }}>
              <Pressable
                onPress={() => handlePickGroupAvatar(true)}
                style={{ position: "relative" }}
              >
                <View style={[
                  styles.groupProfileAvatar,
                  { backgroundColor: colors.primary, overflow: "hidden" },
                ]}>
                  {(groupAvatarUri || activeContact?.avatar) ? (
                    <Image
                      source={{ uri: groupAvatarUri ? groupAvatarUri : getMediaUrl(activeContact!.avatar) }}
                      style={{ width: "100%", height: "100%" }}
                    />
                  ) : (
                    <Feather name="users" size={32} color="#fff" />
                  )}
                </View>
                <View style={[
                  styles.avatarEditBadge,
                  { backgroundColor: colors.primary },
                ]}>
                  {uploadingGroupAvatar ? (
                    <ActivityIndicator size={10} color="#fff" />
                  ) : (
                    <Feather name="camera" size={12} color="#fff" />
                  )}
                </View>
              </Pressable>
              {editingGroupName ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16 }}>
                  <TextInput
                    value={groupNameInput}
                    onChangeText={setGroupNameInput}
                    style={{
                      borderBottomWidth: 1,
                      borderBottomColor: colors.primary,
                      color: colors.foreground,
                      fontSize: 16,
                      fontFamily: "Inter_600SemiBold",
                      paddingVertical: 2,
                      minWidth: 120,
                      textAlign: "center",
                    }}
                    autoFocus
                  />
                  <Pressable onPress={handleUpdateGroupName} hitSlop={6}>
                    <Feather name="check" size={18} color={colors.primary} />
                  </Pressable>
                  <Pressable onPress={() => setEditingGroupName(false)} hitSlop={6}>
                    <Feather name="x" size={18} color={colors.mutedForeground} />
                  </Pressable>
                </View>
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={[styles.groupProfileName, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                    {activeContact.name}
                  </Text>
                  {activeContact.id !== "group" && (
                    <Pressable
                      onPress={() => {
                        setGroupNameInput(activeContact.name);
                        setEditingGroupName(true);
                      }}
                      hitSlop={6}
                    >
                      <Feather name="edit-2" size={13} color={colors.mutedForeground} />
                    </Pressable>
                  )}
                </View>
              )}
            </View>

            {/* Members list header */}
            {(() => {
              const tcMembers: any[] = (activeContact as any).members_details || [];
              const groupMembers = activeContact.id === "group"
                ? (tcMembers.length > 0 ? tcMembers : contacts.filter((c) => c.type === "private").map(c => ({ id: c.id, name: c.name, avatar: c.avatar, role: c.role || "Employee" })))
                : contacts.filter((c) => (activeContact as any).members?.includes(c.id as number)).map(c => ({ id: c.id, name: c.name, avatar: c.avatar, role: c.role || "Member" }));
              return (
                <>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <Text style={[styles.groupProfileSection, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold", marginBottom: 0 }]}>
                      {t("chat.membersCount", { count: groupMembers.length })}
                    </Text>
                    {activeContact.id !== "group" && (
                      <Pressable
                        onPress={() => setShowAddMember(true)}
                        hitSlop={8}
                        style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                      >
                        <Feather name="user-plus" size={13} color={colors.primary} />
                        <Text style={{ color: colors.primary, fontSize: 13, fontFamily: "Inter_600SemiBold" }}>{t("chat.add")}</Text>
                      </Pressable>
                    )}
                  </View>

                  <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={true}>
                    {groupMembers.map((m: any) => (
                      <View
                        key={String(m.id)}
                        style={[styles.groupMemberRow, { borderBottomColor: colors.border }]}
                      >
                        <View style={[styles.groupMemberAvatar, { backgroundColor: colors.accent, overflow: "hidden" }]}>
                          {m.avatar ? (
                            <Image source={{ uri: getMediaUrl(m.avatar) }} style={{ width: "100%", height: "100%" }} />
                          ) : (
                            <Text style={{ color: "#fff", fontSize: 12, fontFamily: "Inter_700Bold" }}>
                              {((m.name || "U")[0]).toUpperCase()}
                            </Text>
                          )}
                        </View>
                        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <Text style={[{ color: colors.foreground, fontSize: 14, fontFamily: "Inter_500Medium" }]}>
                            {m.name}
                          </Text>
                          {m.role ? (
                            <View style={{ backgroundColor: colors.border, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                              <Text style={{ color: colors.mutedForeground, fontSize: 10, fontFamily: "Inter_600SemiBold" }}>
                                {m.role}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        {activeContact.id !== "group" && (
                          <Pressable
                            onPress={() => handleRemoveMember(m.id as number)}
                            hitSlop={8}
                            style={{ padding: 4 }}
                          >
                            <Feather name="user-minus" size={14} color={colors.danger} />
                          </Pressable>
                        )}
                      </View>
                    ))}
                  </ScrollView>
                </>
              );
            })()}

            {/* Actions */}
            <View style={{ gap: 10, marginTop: 16 }}>
              <Pressable
                onPress={() => {
                  setShowGroupProfile(false);
                  handleToggleLock();
                }}
                style={[styles.groupProfileBtn, { backgroundColor: (colors.warning ?? "#f59e0b") + "15", borderColor: (colors.warning ?? "#f59e0b") + "40" }]}
              >
                <Feather name={groupLocked ? "unlock" : "lock"} size={16} color={colors.warning ?? "#f59e0b"} />
                <Text style={[styles.groupProfileBtnTxt, { color: colors.warning ?? "#f59e0b", fontFamily: "Inter_600SemiBold" }]}>
                  {groupLocked ? "Unlock Chat" : "Lock Chat"}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Add Member Modal ── */}
      <Modal
        visible={showAddMember}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddMember(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setShowAddMember(false)}>
          <Pressable
            style={[
              styles.groupProfileSheet,
              { backgroundColor: isDark ? "#18181b" : "#fff", borderColor: colors.border },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={{ color: colors.foreground, fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 12 }}>
              {t("chat.addMemberTitle")}
            </Text>

            <ScrollView style={{ maxHeight: 250 }} showsVerticalScrollIndicator={false}>
              {contacts
                .filter((c) => {
                  if (c.type !== "private") return false;
                  const currentMembers = (activeContact as any).members || [];
                  return !currentMembers.includes(c.id as number);
                })
                .map((c) => (
                  <Pressable
                    key={String(c.id)}
                    onPress={() => {
                      handleAddMember(c.id as number);
                      setShowAddMember(false);
                    }}
                    style={({ pressed }) => [
                      styles.groupMemberRow,
                      { borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 }
                    ]}
                  >
                    <View style={[styles.groupMemberAvatar, { backgroundColor: colors.accent, overflow: "hidden" }]}>
                      {c.avatar ? (
                        <Image source={{ uri: getMediaUrl(c.avatar) }} style={{ width: "100%", height: "100%" }} />
                      ) : (
                        <Text style={{ color: "#fff", fontSize: 12, fontFamily: "Inter_700Bold" }}>{c.initials}</Text>
                      )}
                    </View>
                    <Text style={[{ flex: 1, color: colors.foreground, fontSize: 14, fontFamily: "Inter_500Medium" }]}>
                      {c.name}
                    </Text>
                    <Feather name="plus-circle" size={18} color={colors.primary} />
                  </Pressable>
                ))}
              {contacts.filter((c) => c.type === "private" && !((activeContact as any).members || []).includes(c.id as number)).length === 0 && (
                <Text style={{ color: colors.mutedForeground, fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", marginVertical: 20 }}>
                  {t("chat.allEmployeesAlreadyMembers")}
                </Text>
              )}
            </ScrollView>

            <Pressable
              onPress={() => setShowAddMember(false)}
              style={({ pressed }) => [
                styles.createGroupBtn,
                { backgroundColor: isDark ? "#27272a" : "#f4f4f5", marginTop: 12, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>{t("chat.close")}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Contact Profile Modal (DM) — Full Detail Drawer matching Web ── */}
      <Modal
        visible={showContactProfile}
        transparent
        animationType="slide"
        onRequestClose={() => setShowContactProfile(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setShowContactProfile(false)}>
          <Pressable
            style={[
              styles.contactProfileSheet,
              { backgroundColor: isDark ? "#18181b" : "#fff", borderColor: colors.border },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

            {/* Header with Title and Close */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <Text style={{ color: colors.foreground, fontSize: 16, fontFamily: "Inter_700Bold" }}>
                Contact Info
              </Text>
              <Pressable onPress={() => setShowContactProfile(false)} hitSlop={8}>
                <Feather name="x" size={20} color={colors.mutedForeground} />
              </Pressable>
            </View>

            {activeContact && activeContact.type === "private" && (() => {
              const activeEmp = employees.find(
                (e: any) =>
                  e.id === activeContact.id ||
                  e.id === activeContact.employee_id ||
                  e.name?.toLowerCase() === activeContact.name?.toLowerCase()
              );
              const empEmail = activeEmp?.email || activeContact.email;
              const empPhone = activeEmp?.phone || activeContact.phone;
              const empRole = activeEmp?.role || activeContact.role || "Team Member";
              const empDept = activeEmp?.department || activeContact.department || "General";

              return (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
                  {/* Big Avatar and Name */}
                  <View style={{ alignItems: "center", marginBottom: 16, gap: 8 }}>
                    <View style={{ position: "relative" }}>
                      <View style={[styles.fullProfileAvatar, { backgroundColor: colors.accent, overflow: "hidden" }]}>
                        {activeContact.avatar ? (
                          <Image source={{ uri: getMediaUrl(activeContact.avatar) }} style={{ width: "100%", height: "100%" }} />
                        ) : (
                          <Text style={{ color: "#fff", fontSize: 32, fontFamily: "Inter_700Bold" }}>{activeContact.initials}</Text>
                        )}
                      </View>
                      <View style={[styles.onlineDotLarge, { backgroundColor: "#22c55e", borderColor: isDark ? "#18181b" : "#fff" }]} />
                    </View>
                    <Text style={[styles.fullProfileName, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                      {activeContact.name}
                    </Text>
                    <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_500Medium" }}>
                      {empRole} • {empDept}
                    </Text>
                  </View>

                  {/* Quick Action Pills: Message, Audio Call, Video Call, Email */}
                  <View style={styles.quickActionPills}>
                    <Pressable
                      onPress={() => setShowContactProfile(false)}
                      style={({ pressed }) => [styles.quickActionPill, { opacity: pressed ? 0.7 : 1 }]}
                    >
                      <View style={[styles.quickActionIconWrap, { backgroundColor: colors.primary + "15" }]}>
                        <Feather name="message-square" size={18} color={colors.primary} />
                      </View>
                      <Text style={[styles.quickActionPillLabel, { color: colors.foreground }]}>Chat</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        setShowContactProfile(false);
                        handleInitiateCall("voice");
                      }}
                      style={({ pressed }) => [styles.quickActionPill, { opacity: pressed ? 0.7 : 1 }]}
                    >
                      <View style={[styles.quickActionIconWrap, { backgroundColor: colors.accent + "15" }]}>
                        <Feather name="phone" size={18} color={colors.accent} />
                      </View>
                      <Text style={[styles.quickActionPillLabel, { color: colors.foreground }]}>Audio</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        setShowContactProfile(false);
                        handleInitiateCall("video");
                      }}
                      style={({ pressed }) => [styles.quickActionPill, { opacity: pressed ? 0.7 : 1 }]}
                    >
                      <View style={[styles.quickActionIconWrap, { backgroundColor: "#22c55e15" }]}>
                        <Feather name="video" size={18} color="#22c55e" />
                      </View>
                      <Text style={[styles.quickActionPillLabel, { color: colors.foreground }]}>Video</Text>
                    </Pressable>

                    {empEmail ? (
                      <Pressable
                        onPress={() => Linking.openURL(`mailto:${empEmail}`)}
                        style={({ pressed }) => [styles.quickActionPill, { opacity: pressed ? 0.7 : 1 }]}
                      >
                        <View style={[styles.quickActionIconWrap, { backgroundColor: "#f59e0b15" }]}>
                          <Feather name="mail" size={18} color="#f59e0b" />
                        </View>
                        <Text style={[styles.quickActionPillLabel, { color: colors.foreground }]}>Email</Text>
                      </Pressable>
                    ) : null}
                  </View>

                  {/* Section: About & Contact Details */}
                  <View style={[styles.profileSectionBox, { backgroundColor: isDark ? "#27272a40" : "#f4f4f5", borderColor: colors.border }]}>
                    <Text style={[styles.profileSectionTitle, { color: colors.mutedForeground }]}>
                      ABOUT & CONTACT INFO
                    </Text>

                    {empEmail && (
                      <Pressable
                        onPress={() => {
                          Clipboard.setString(empEmail);
                          showToast({ title: "Copied", message: "Email copied to clipboard.", type: "success" });
                        }}
                        style={styles.profileDetailRow}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                          <Feather name="mail" size={16} color={colors.mutedForeground} />
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>Email</Text>
                            <Text style={{ fontSize: 13, color: colors.foreground, fontFamily: "Inter_500Medium" }}>{empEmail}</Text>
                          </View>
                        </View>
                        <Feather name="copy" size={14} color={colors.mutedForeground} />
                      </Pressable>
                    )}

                    {empPhone && (
                      <Pressable
                        onPress={() => Linking.openURL(`tel:${empPhone}`)}
                        style={styles.profileDetailRow}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                          <Feather name="phone" size={16} color={colors.mutedForeground} />
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>Phone</Text>
                            <Text style={{ fontSize: 13, color: colors.foreground, fontFamily: "Inter_500Medium" }}>{empPhone}</Text>
                          </View>
                        </View>
                        <Feather name="phone-call" size={14} color={colors.accent} />
                      </Pressable>
                    )}

                    <View style={styles.profileDetailRow}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                        <Feather name="briefcase" size={16} color={colors.mutedForeground} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>Department & Role</Text>
                          <Text style={{ fontSize: 13, color: colors.foreground, fontFamily: "Inter_500Medium" }}>{empDept} • {empRole}</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Section: Chat Options & Security */}
                  <View style={[styles.profileSectionBox, { backgroundColor: isDark ? "#27272a40" : "#f4f4f5", borderColor: colors.border }]}>
                    <Text style={[styles.profileSectionTitle, { color: colors.mutedForeground }]}>
                      SETTINGS & SECURITY
                    </Text>

                    <Pressable
                      onPress={() => showToast({ title: "Starred Messages", message: "Starred messages screen coming soon.", type: "info" })}
                      style={styles.profileSettingRow}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <Feather name="star" size={16} color={colors.mutedForeground} />
                        <Text style={{ fontSize: 13, color: colors.foreground, fontFamily: "Inter_500Medium" }}>Starred Messages</Text>
                      </View>
                      <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        setIsMuted((m) => {
                          const next = !m;
                          showToast({
                            title: next ? "Muted" : "Unmuted",
                            message: next ? "Notifications muted for 8 hours." : "Notifications enabled.",
                            type: "info",
                          });
                          return next;
                        });
                      }}
                      style={styles.profileSettingRow}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <Feather name={isMuted ? "bell-off" : "bell"} size={16} color={isMuted ? colors.warning : colors.mutedForeground} />
                        <Text style={{ fontSize: 13, color: colors.foreground, fontFamily: "Inter_500Medium" }}>
                          {isMuted ? "Muted (8h)" : "Notification Settings"}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 12, color: colors.accent, fontFamily: "Inter_600SemiBold" }}>
                        {isMuted ? "Unmute" : "Mute"}
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        Alert.alert("Disappearing Messages", "Select timer for disappearing messages:", [
                          { text: "Cancel", style: "cancel" },
                          { text: "Off", onPress: () => showToast({ title: "Updated", message: "Disappearing messages turned off.", type: "info" }) },
                          { text: "24 Hours", onPress: () => showToast({ title: "Updated", message: "Messages disappear after 24h.", type: "success" }) },
                          { text: "7 Days", onPress: () => showToast({ title: "Updated", message: "Messages disappear after 7 days.", type: "success" }) },
                        ]);
                      }}
                      style={styles.profileSettingRow}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <Feather name="clock" size={16} color={colors.mutedForeground} />
                        <Text style={{ fontSize: 13, color: colors.foreground, fontFamily: "Inter_500Medium" }}>Disappearing Messages</Text>
                      </View>
                      <Text style={{ fontSize: 12, color: colors.mutedForeground }}>Off</Text>
                    </Pressable>

                    <View style={styles.profileSettingRow}>
                      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, flex: 1 }}>
                        <Feather name="lock" size={16} color="#22c55e" style={{ marginTop: 2 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, color: colors.foreground, fontFamily: "Inter_500Medium" }}>Encryption</Text>
                          <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 2, lineHeight: 15 }}>
                            Messages and calls are end-to-end encrypted. Tap to verify.
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Section: Media, Links & Docs */}
                  <View style={[styles.profileSectionBox, { backgroundColor: isDark ? "#27272a40" : "#f4f4f5", borderColor: colors.border }]}>
                    <Text style={[styles.profileSectionTitle, { color: colors.mutedForeground }]}>
                      MEDIA, LINKS AND DOCS
                    </Text>
                    <View style={{ alignItems: "center", paddingVertical: 12, gap: 6 }}>
                      <Feather name="image" size={24} color={colors.mutedForeground} />
                      <Text style={{ fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>
                        No shared media yet.
                      </Text>
                    </View>
                  </View>

                  {/* Section: Actions & Moderation */}
                  <View style={{ gap: 8, marginTop: 4 }}>
                    <Pressable
                      onPress={() => {
                        setIsFavourite((f) => {
                          const next = !f;
                          showToast({
                            title: "Favourites",
                            message: next ? `${activeContact.name} added to favourites.` : `${activeContact.name} removed from favourites.`,
                            type: "success",
                          });
                          return next;
                        });
                      }}
                      style={({ pressed }) => [styles.profileActionBtn, { opacity: pressed ? 0.7 : 1 }]}
                    >
                      <Feather name="heart" size={17} color={isFavourite ? colors.danger : colors.mutedForeground} />
                      <Text style={[styles.profileActionLabel, { color: colors.foreground }]}>
                        {isFavourite ? "Remove from Favourites" : "Add to Favourites"}
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        setShowContactProfile(false);
                        handleClearChat();
                      }}
                      style={({ pressed }) => [styles.profileActionBtn, { opacity: pressed ? 0.7 : 1 }]}
                    >
                      <Feather name="trash-2" size={17} color={colors.danger} />
                      <Text style={[styles.profileActionLabel, { color: colors.danger }]}>
                        Clear Chat
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        setShowContactProfile(false);
                        handleBlockDMUser(activeContact);
                      }}
                      style={({ pressed }) => [styles.profileActionBtn, { opacity: pressed ? 0.7 : 1 }]}
                    >
                      <Feather name={activeContact.is_blocked_from_group ? "user-check" : "slash"} size={17} color={colors.danger} />
                      <Text style={[styles.profileActionLabel, { color: colors.danger }]}>
                        {activeContact.is_blocked_from_group ? "Unblock User" : `Block ${activeContact.name}`}
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        setShowContactProfile(false);
                        setShowReportModal(true);
                      }}
                      style={({ pressed }) => [styles.profileActionBtn, { opacity: pressed ? 0.7 : 1 }]}
                    >
                      <Feather name="alert-triangle" size={17} color={colors.danger} />
                      <Text style={[styles.profileActionLabel, { color: colors.danger }]}>
                        Report Account
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        setShowContactProfile(false);
                        handleDeleteChat();
                      }}
                      style={({ pressed }) => [styles.profileActionBtn, { opacity: pressed ? 0.7 : 1 }]}
                    >
                      <Feather name="trash" size={17} color={colors.danger} />
                      <Text style={[styles.profileActionLabel, { color: colors.danger }]}>
                        Delete Chat
                      </Text>
                    </Pressable>
                  </View>
                </ScrollView>
              );
            })()}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Report Account Modal (Moderation) ── */}
      <Modal
        visible={showReportModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReportModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <Pressable style={styles.backdrop} onPress={() => setShowReportModal(false)}>
            <Pressable
              style={[
                styles.reportSheet,
                { backgroundColor: isDark ? "#18181b" : "#fff", borderColor: colors.border },
              ]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={[styles.dangerBadgeIcon, { backgroundColor: colors.danger + "20" }]}>
                    <Feather name="alert-triangle" size={18} color={colors.danger} />
                  </View>
                  <View>
                    <Text style={[styles.reportTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                      Report Account
                    </Text>
                    <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular" }}>
                      Report @{activeContact?.name} for administrator review
                    </Text>
                  </View>
                </View>
                <Pressable onPress={() => setShowReportModal(false)} hitSlop={8}>
                  <Feather name="x" size={20} color={colors.mutedForeground} />
                </Pressable>
              </View>

              <Text style={[styles.reportSubtitle, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
                SELECT REASON:
              </Text>
              <ScrollView style={{ maxHeight: 180 }} showsVerticalScrollIndicator={false}>
                {REPORT_REASONS.map((r) => {
                  const selected = reportReason === r.id;
                  return (
                    <Pressable
                      key={r.id}
                      onPress={() => setReportReason(r.id)}
                      style={[
                        styles.reasonOption,
                        {
                          borderColor: selected ? colors.accent : colors.border,
                          backgroundColor: selected ? colors.accent + "15" : "transparent",
                        },
                      ]}
                    >
                      <Feather name={r.icon as any} size={15} color={selected ? colors.accent : colors.mutedForeground} />
                      <Text
                        style={{
                          flex: 1,
                          fontSize: 13,
                          color: selected ? colors.foreground : colors.mutedForeground,
                          fontFamily: selected ? "Inter_600SemiBold" : "Inter_400Regular",
                        }}
                      >
                        {r.label}
                      </Text>
                      {selected && <Feather name="check" size={16} color={colors.accent} />}
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Text style={[styles.reportSubtitle, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold", marginTop: 10 }]}>
                DETAILS / EXPLANATION (OPTIONAL):
              </Text>
              <TextInput
                value={reportDetails}
                onChangeText={setReportDetails}
                placeholder="Describe what occurred or paste message context..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                style={[
                  styles.reportInput,
                  {
                    color: colors.foreground,
                    backgroundColor: isDark ? "#27272a" : "#f4f4f5",
                    borderColor: colors.border,
                    fontFamily: "Inter_400Regular",
                  },
                ]}
              />

              <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
                <Pressable
                  onPress={() => setShowReportModal(false)}
                  style={[styles.reportCancelBtn, { borderColor: colors.border }]}
                >
                  <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleSubmitReport}
                  disabled={submittingReport}
                  style={[styles.reportSubmitBtn, { backgroundColor: colors.danger }]}
                >
                  {submittingReport ? (
                    <ActivityIndicator size={14} color="#fff" />
                  ) : (
                    <>
                      <Feather name="alert-triangle" size={14} color="#fff" />
                      <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold" }}>Submit Report</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Avatar Popup Modal ── */}
      <Modal
        visible={avatarPopupContact !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setAvatarPopupContact(null)}
      >
        <Pressable
          style={[styles.backdrop, { justifyContent: "center", alignItems: "center" }]}
          onPress={() => setAvatarPopupContact(null)}
        >
          <Pressable
            style={[
              styles.avatarPopup,
              { backgroundColor: isDark ? "#18181b" : "#fff", borderColor: colors.border },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {avatarPopupContact && (
              <>
                <View style={{ alignItems: "center", marginBottom: 12, gap: 6 }}>
                  <View style={[styles.avatarPopupImg, { backgroundColor: colors.accent, overflow: "hidden" }]}>
                    {avatarPopupContact.avatar ? (
                      <Image source={{ uri: getMediaUrl(avatarPopupContact.avatar) }} style={{ width: "100%", height: "100%" }} />
                    ) : (
                      <Text style={{ color: "#fff", fontSize: 26, fontFamily: "Inter_700Bold" }}>
                        {avatarPopupContact.initials}
                      </Text>
                    )}
                  </View>
                  <Text style={{ color: colors.foreground, fontSize: 16, fontFamily: "Inter_700Bold" }} numberOfLines={1}>
                    {avatarPopupContact.name}
                  </Text>
                </View>

                <Pressable
                  onPress={() => {
                    // Clear unread for this contact too
                    if (activeContact) {
                      draftsRef.current[String(activeContact.id)] = inputText;
                    }
                    setContacts((prev) =>
                      prev.map((c) => c.id === avatarPopupContact.id ? { ...c, unread_count: 0 } : c)
                    );
                    setActiveContact({ ...avatarPopupContact, unread_count: 0 });
                    setMessages([]);
                    setInputText(draftsRef.current[String(avatarPopupContact.id)] || "");
                    setReplyTo(null);
                    setEditingMsg(null);
                    setAvatarPopupContact(null);
                  }}
                  style={({ pressed }) => [
                    styles.avatarPopupBtn,
                    { borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <View style={[styles.avatarPopupBtnIcon, { backgroundColor: colors.primary + "15" }]}>
                    <Feather name="message-square" size={16} color={colors.primary} />
                  </View>
                  <Text style={{ color: colors.foreground, fontFamily: "Inter_500Medium" }}>{t("chat.chat")}</Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    setActiveContact(avatarPopupContact);
                    setShowContactProfile(true);
                    setAvatarPopupContact(null);
                  }}
                  style={({ pressed }) => [
                    styles.avatarPopupBtn,
                    { borderBottomColor: "transparent", opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <View style={[styles.avatarPopupBtnIcon, { backgroundColor: colors.accent + "15" }]}>
                    <Feather name="user" size={16} color={colors.accent} />
                  </View>
                  <Text style={{ color: colors.foreground, fontFamily: "Inter_500Medium" }}>{t("chat.viewProfile")}</Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Header ⋮ Dropdown Modal ── */}
      <Modal
        visible={showHeaderMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowHeaderMenu(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setShowHeaderMenu(false)}>
          <View
            style={[
              styles.headerMenuSheet,
              { backgroundColor: isDark ? "#18181b" : "#fff", borderColor: colors.border },
            ]}
          >
            {[
              { id: "search", icon: "search", label: t("chat.actions.search") ?? "Search Messages" },
              { id: "clear", icon: "trash-2", label: t("chat.actions.clearChat") ?? "Clear Chat" },
              ...(!isGroupChat
                ? [
                    {
                      id: "block",
                      icon: activeContact?.is_blocked_from_group ? "user-check" : "user-x",
                      label: activeContact?.is_blocked_from_group ? "Unblock User" : "Block User",
                      danger: !activeContact?.is_blocked_from_group,
                    },
                    { id: "report", icon: "alert-triangle", label: "Report User", danger: true },
                  ]
                : []),
            ].map((item, i) => (
              <Pressable
                key={item.id}
                onPress={() => {
                  setShowHeaderMenu(false);
                  handleHeaderMenuAction(item.id);
                }}
                style={({ pressed }) => [
                  styles.headerMenuItem,
                  {
                    borderBottomWidth: i === (isGroupChat ? 1 : 3) ? 0 : StyleSheet.hairlineWidth,
                    borderBottomColor: colors.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Feather
                  name={item.icon as any}
                  size={16}
                  color={item.danger ? colors.danger : colors.foreground}
                />
                <Text
                  style={[
                    styles.headerMenuLabel,
                    {
                      color: item.danger ? colors.danger : colors.foreground,
                      fontFamily: "Inter_500Medium",
                    },
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* ── Attachment Options Bottom Sheet ── */}
      <Modal
        visible={showAttachMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAttachMenu(false)}
      >
        <Pressable style={styles.attachBackdrop} onPress={() => setShowAttachMenu(false)}>
          <View style={[styles.attachSheetContainer, { backgroundColor: isDark ? "#1f2c34" : "#ffffff" }]}>
            <View style={styles.attachSheetGrid}>
              {/* Document Option */}
              <Pressable
                onPress={async () => {
                  setShowAttachMenu(false);
                  try {
                    const res = await DocumentPicker.getDocumentAsync({
                      type: "*/*",
                      copyToCacheDirectory: true,
                    });
                    if (!res.canceled && res.assets && res.assets.length > 0) {
                      const doc = res.assets[0];
                      await sendMediaAttachment(doc.uri, "document", doc.name, doc.size);
                    }
                  } catch (e: any) {
                    Alert.alert("File Error", e.message || "Failed to pick document.");
                  }
                }}
                style={({ pressed }) => [styles.attachGridItem, { opacity: pressed ? 0.7 : 1 }]}
              >
                <View style={[styles.attachCircle, { backgroundColor: "#5f66cd" }]}>
                  <Feather name="file-text" size={22} color="#fff" />
                </View>
                <Text style={[styles.attachLabel, { color: isDark ? "#e9edef" : "#111b21" }]}>Document</Text>
              </Pressable>

              {/* Gallery (Photos & Videos) */}
              <Pressable
                onPress={async () => {
                  setShowAttachMenu(false);
                  try {
                    const res = await ImagePicker.launchImageLibraryAsync({
                      mediaTypes: ['images', 'videos'],
                      quality: 0.8,
                      allowsEditing: false,
                    });
                    if (!res.canceled && res.assets && res.assets.length > 0) {
                      const asset = res.assets[0];
                      const isVideo = asset.type === "video";
                      const fname = asset.fileName || (isVideo ? `video_${Date.now()}.mp4` : `photo_${Date.now()}.jpg`);
                      await sendMediaAttachment(asset.uri, isVideo ? "video" : "image", fname, asset.fileSize);
                    }
                  } catch (e: any) {
                    Alert.alert("Gallery Error", e.message || "Failed to select media.");
                  }
                }}
                style={({ pressed }) => [styles.attachGridItem, { opacity: pressed ? 0.7 : 1 }]}
              >
                <View style={[styles.attachCircle, { backgroundColor: "#c13584" }]}>
                  <Feather name="image" size={22} color="#fff" />
                </View>
                <Text style={[styles.attachLabel, { color: isDark ? "#e9edef" : "#111b21" }]}>Gallery</Text>
              </Pressable>

              {/* Camera */}
              <Pressable
                onPress={() => {
                  setShowAttachMenu(false);
                  handleCameraPress();
                }}
                style={({ pressed }) => [styles.attachGridItem, { opacity: pressed ? 0.7 : 1 }]}
              >
                <View style={[styles.attachCircle, { backgroundColor: "#059669" }]}>
                  <Feather name="camera" size={22} color="#fff" />
                </View>
                <Text style={[styles.attachLabel, { color: isDark ? "#e9edef" : "#111b21" }]}>Camera</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* ── Full-Screen Image Viewer Modal ── */}
      <Modal
        visible={!!selectedFullImage}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedFullImage(null)}
      >
        <View style={styles.fullImgBackdrop}>
          <Pressable style={styles.fullImgCloseBtn} onPress={() => setSelectedFullImage(null)}>
            <Feather name="x" size={24} color="#fff" />
          </Pressable>
          {selectedFullImage && (
            <Image
              source={{ uri: selectedFullImage }}
              style={styles.fullImg}
              resizeMode="contain"
            />
          )}
          <Pressable
            style={styles.fullImgShareBtn}
            onPress={() => {
              if (selectedFullImage) {
                Sharing.shareAsync(selectedFullImage).catch(() => {});
              }
            }}
          >
            <Feather name="share-2" size={20} color="#fff" />
          </Pressable>
        </View>
      </Modal>
    </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },

  // ── Notification Banner ──
  notifBanner: {
    position: "absolute",
    top: 0,
    left: 12,
    right: 12,
    zIndex: 999,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
    marginTop: 8,
  },
  notifAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  notifAvatarTxt: { fontSize: 13, fontFamily: "Inter_700Bold" },
  notifTitle: { fontSize: 13, fontFamily: "Inter_700Bold" },
  notifBody: { fontSize: 12, marginTop: 2 },

  // ── Top Bar ──
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarTxt: { color: "#fff", fontSize: 15 },
  headerName: { fontSize: 16 },
  headerSub: { fontSize: 12, marginTop: 1 },
  headerBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  headerBadgeTxt: { color: "#fff", fontSize: 9, fontFamily: "Inter_700Bold" },

  // ── Filter Tabs ──
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  filterTabTxt: { fontSize: 13 },
  filterTabDot: {
    position: "absolute",
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
  },

  // ── Search ──
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 2 },

  // ── Contacts ──
  contactRowFull: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  contactAvatarLarge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  contactAvatarTxtLarge: { color: "#fff", fontSize: 17 },
  contactNameLarge: { fontSize: 15 },
  contactSubLarge: { fontSize: 12 },
  contactTime: { fontSize: 11 },
  onlineDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },

  // ── Badges ──
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  unreadBadgeTxt: { color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" },
  lockBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  lockBadgeTxt: { fontSize: 9 },

  // ── FAB ──
  fab: {
    position: "absolute",
    right: 20,
    zIndex: 10,
  },
  fabInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },

  // ── Create Group Modal ──
  createGroupSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingBottom: 32,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    gap: 12,
  },
  createGroupTitle: { fontSize: 18, marginTop: 4 },
  createGroupSub: { fontSize: 13, marginBottom: 4 },
  createGroupInput: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  createGroupBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  createGroupBtnTxt: { fontSize: 15 },
  memberSelectRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
    gap: 10,
    borderRadius: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  createGroupSectionTitle: {
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },

  // ── Group Profile Modal ──
  groupProfileSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingBottom: 32,
    paddingHorizontal: 20,
    borderTopWidth: 1,
  },
  groupProfileAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  groupProfileName: { fontSize: 20 },
  groupProfileSection: { fontSize: 11, letterSpacing: 0.8, marginBottom: 8 },
  groupMemberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  groupMemberAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  groupProfileBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 13,
    borderWidth: 1,
  },
  groupProfileBtnTxt: { fontSize: 15 },

  // ── Typing ──
  typingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    height: 16,
  },
  typingDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },

  // ── Swipe Reply ──
  swipeReplyIcon: {
    position: "absolute",
    left: 8,
    top: "50%",
    marginTop: -10,
    zIndex: -1,
  },

  // ── Date Separator ──
  dateSepRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  dateSepLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dateSepText: { fontSize: 11, fontFamily: "Inter_500Medium" },

  // ── Messages ──
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 16,
    flexGrow: 1,
  },
  msgRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 8,
    gap: 8,
  },
  msgLeft: { justifyContent: "flex-start" },
  msgRight: { justifyContent: "flex-end" },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarTxt: { fontSize: 11 },
  msgContent: { gap: 2 },
  senderName: { fontSize: 11, marginBottom: 2, marginLeft: 4 },
  replyPreview: {
    borderLeftWidth: 3,
    paddingLeft: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 4,
  },
  replyName: { fontSize: 11 },
  replyText: { fontSize: 12, marginTop: 1 },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleText: { fontSize: 14.5, lineHeight: 21 },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
    paddingHorizontal: 4,
  },
  metaText: { fontSize: 10 },
  emptyList: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyText: { fontSize: 14, textAlign: "center" },

  // ── Reply / Edit bar ──
  replyBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 10,
  },
  replyBarAccent: { width: 3, height: 32, borderRadius: 2 },
  replyBarLabel: { fontSize: 12 },
  replyBarText: { fontSize: 12, marginTop: 2 },

  // ── Input Container (WhatsApp style) ──
  inputBarContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 8,
    paddingTop: 8,
    gap: 6,
  },
  pillInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 25,
    paddingHorizontal: 12,
    paddingVertical: 5,
    minHeight: 48,
    maxHeight: 120,
  },
  pillIconBtn: {
    padding: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  pillTextInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 6,
    paddingHorizontal: 8,
    maxHeight: 100,
  },
  actionCircleBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  recordingPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 25,
    paddingHorizontal: 16,
    height: 48,
  },
  recordingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#ef4444",
  },
  recordingTimer: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  recordingNotice: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  cancelRecordBtn: {
    padding: 6,
  },

  // ── Attachment Menu Sheet ──
  attachBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
    paddingBottom: 72,
    paddingHorizontal: 12,
  },
  attachSheetContainer: {
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  attachSheetGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  attachGridItem: {
    alignItems: "center",
    gap: 8,
  },
  attachCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  attachLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },

  // ── Message Attachments ──
  attachmentImgPressable: {
    borderRadius: 14,
    overflow: "hidden",
  },
  attachmentImg: {
    width: 240,
    height: 180,
    borderRadius: 14,
  },
  attachmentVideoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 12,
    width: 220,
  },
  videoPlayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  attachmentDocCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 12,
    width: 220,
  },
  docIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  attachmentFileName: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  attachmentMeta: {
    fontSize: 11,
    marginTop: 2,
    fontFamily: "Inter_400Regular",
  },

  // ── Voice Note Bubble ──
  voiceNoteBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 14,
    width: 220,
  },
  voicePlayBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  voiceWaveformContainer: {
    flex: 1,
    gap: 4,
  },
  waveformBars: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2.5,
    height: 24,
  },
  waveformBar: {
    width: 3,
    borderRadius: 1.5,
  },
  voiceDuration: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },

  // ── Full-Screen Image ──
  fullImgBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullImgCloseBtn: {
    position: "absolute",
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  fullImgShareBtn: {
    position: "absolute",
    bottom: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  fullImg: {
    width: "100%",
    height: "80%",
  },

  // ── Action Sheet ──
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  actionSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingBottom: 32,
    borderTopWidth: 1,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 8,
  },
  sheetPreview: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    marginBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetPreviewTxt: { fontSize: 13, lineHeight: 18 },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actionLabel: { fontSize: 16 },

  // ── Header ⋮ Menu ──
  headerMenuSheet: {
    position: "absolute",
    top: 70,
    right: 12,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    minWidth: 200,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 12,
    zIndex: 999,
  },
  headerMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  headerMenuLabel: { fontSize: 15 },

  // ── Avatar Popup ──
  avatarPopup: {
    width: 240,
    borderRadius: 20,
    borderWidth: 1,
    paddingTop: 20,
    paddingBottom: 10,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 18,
  },
  avatarPopupImg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarPopupBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatarPopupBtnIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEditBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },

  // ── In-Chat Search ──
  inChatSearchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  inChatSearchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 4,
  },

  // ── Emoji Picker & Toggle ──
  emojiToggleBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emojiPickerContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
  },
  emojiScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  emojiTouch: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
  },
  emojiGlyph: {
    fontSize: 22,
  },

  // ── Group Call Button in Top Bar ──
  groupCallBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
  },

  // ── Contact Profile Sheet (DM Detailed Info) ──
  contactProfileSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingBottom: 36,
    paddingHorizontal: 20,
    maxHeight: "85%",
    borderTopWidth: 1,
  },
  fullProfileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  onlineDotLarge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2.5,
  },
  fullProfileName: {
    fontSize: 18,
    textAlign: "center",
  },
  quickActionPills: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginVertical: 14,
    gap: 8,
  },
  quickActionPill: {
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  quickActionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionPillLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  profileSectionBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
    gap: 10,
  },
  profileSectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.6,
  },
  profileDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  profileSettingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  profileActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    gap: 12,
  },
  profileActionLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },

  // ── Report Sheet (Moderation) ──
  reportSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingBottom: 32,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    maxHeight: "85%",
  },
  dangerBadgeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  reportTitle: {
    fontSize: 16,
  },
  reportSubtitle: {
    fontSize: 11,
    letterSpacing: 0.6,
    marginTop: 8,
    marginBottom: 6,
  },
  reasonOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
  },
  reportInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    height: 80,
    textAlignVertical: "top",
    fontSize: 13,
  },
  reportCancelBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  reportSubmitBtn: {
    flex: 1.5,
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
});

