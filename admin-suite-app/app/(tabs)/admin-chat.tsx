import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, {
  useCallback,
  useEffect,
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
  KeyboardAvoidingView,
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
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useToast } from "@/context/ToastContext";
import { apiService, getMediaUrl } from "@/services/api";
import { ExpandableText } from "@/components/ExpandableText";

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
  is_pinned: boolean;
  is_edited: boolean;
  is_deleted: boolean;
  reply_to_id: number | null;
  reply_to_text: string | null;
  reply_to_sender: string | null;
  created_at: string;
  updated_at: string;
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
  const isDark = colors.isDark;

  // ── State ──
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
  const [groupLocked, setGroupLocked] = useState(false);
  const [togglingLock, setTogglingLock] = useState(false);
  const [typingStatus, setTypingStatus] = useState("");
  const [typingStatuses, setTypingStatuses] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Search & filter
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [showSearch, setShowSearch] = useState(false);

  // In-app notification
  const [notification, setNotification] = useState<{
    title: string;
    body: string;
    senderInitials: string;
    senderAvatar: string | null;
  } | null>(null);
  const lastMsgIdRef = useRef<number | null>(null);

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
    }, 5000); // Poll every 5 seconds for real-time badge updates
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
          // Simulate typing that resolves
        }
        if (latestMsg) {
          lastMsgIdRef.current = latestMsg.id;
        }
      } else if (lastMsgIdRef.current === null && newMsgs.length > 0) {
        lastMsgIdRef.current = newMsgs.at(-1)?.id || null;
      }

      setMessages(newMsgs);
    } catch {}
  }, [activeContact?.id, activeContact?.type, user?.id]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMessages();
    setRefreshing(false);
  }, [fetchMessages]);

  useEffect(() => {
    if (!activeContact) return;
    setLoadingMessages(true);
    lastMsgIdRef.current = null;
    fetchMessages().finally(() => setLoadingMessages(false));
  }, [activeContact?.id, fetchMessages]);

  const handleTextChange = (text: string) => {
    setInputText(text);
    if (!activeContact) return;

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

    const interval = setInterval(checkTyping, 3000);
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

    const interval = setInterval(checkAllTyping, 3000);
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

  const listItems: ListItem[] = [];
  let lastDateLabel = "";
  for (const msg of messages) {
    const label = getDateLabel(msg.created_at);
    if (label !== lastDateLabel) {
      listItems.push({ type: "date", label, key: `date-${msg.id}` });
      lastDateLabel = label;
    }
    listItems.push({ type: "msg", msg, key: `msg-${msg.id}` });
  }

  // ─── Send / Edit message ────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      if (editingMsg) {
        await apiService.editChatMessage(editingMsg.id, text);
        setEditingMsg(null);
      } else {
        const payload: any = { text };
        if (activeContact?.type === "group") {
          if (activeContact.id !== "group") {
            payload.group_id = activeContact.id;
          }
        } else if (activeContact?.id) {
          payload.recipient_id = activeContact.id;
        }
        if (replyTo) payload.reply_to_id = replyTo.id;
        await apiService.sendChatMessage(payload);
        setReplyTo(null);

        // Immediately move this contact to top with updated last_message
        if (activeContact) {
          const now = new Date().toISOString();
          setContacts((prev) => {
            const updated = prev.map((c) =>
              String(c.id) === String(activeContact.id)
                ? { ...c, last_message: text, last_message_time: now, unread_count: 0 }
                : c
            );
            // Re-sort so this conversation bubbles to top
            return [...updated].sort((a, b) => {
              const ta = a.last_message_time ? new Date(a.last_message_time).getTime() : 0;
              const tb = b.last_message_time ? new Date(b.last_message_time).getTime() : 0;
              return tb - ta;
            });
          });
        }
      }
      // Reset typing status immediately
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

      setInputText("");
      await fetchMessages();
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      showToast({ title: "Error", message: "Failed to send message.", type: "error" });
    } finally {
      setSending(false);
    }
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  };

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
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (!result.canceled && result.assets[0]) {
        if (forExisting) {
          setGroupAvatarUri(result.assets[0].uri);
          // Upload immediately if in group profile edit
          if (activeContact && activeContact.type === "group" && activeContact.id !== "group") {
            setUploadingGroupAvatar(true);
            try {
              const fd = new FormData();
              const uri = result.assets[0].uri;
              const filename = uri.split('/').pop() || 'group.jpg';
              const match = /\.(\w+)$/.exec(filename);
              const type = match ? `image/${match[1]}` : 'image/jpeg';
              fd.append('avatar', { uri, name: filename, type } as any);
              const res = await apiService.updateChatGroup(activeContact.id as number, fd as any);
              const updated = res.data;
              setContacts((prev) =>
                prev.map((c) => c.id === activeContact.id ? { ...c, avatar: updated.avatar } : c)
              );
              setActiveContact((prev) => prev ? { ...prev, avatar: updated.avatar } : null);
              showToast({ title: "Avatar Updated", message: "Group picture updated.", type: "success" });
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
  const handleReportUser = (contact: Contact) => {
    Alert.alert(
      "Report User",
      `Report ${contact.name} for inappropriate behavior?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Report",
          style: "destructive",
          onPress: () =>
            showToast({ title: "Reported", message: `${contact.name} has been reported.`, type: "success" }),
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
    if (actionId === "search") {
      setShowSearch(true);
    } else if (actionId === "clear") {
      handleClearChat();
    } else if (actionId === "block") {
      handleBlockDMUser(activeContact);
    } else if (actionId === "report") {
      handleReportUser(activeContact);
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
                },
              ]}
            >
              <ExpandableText
                text={msg.display_text}
                style={[styles.bubbleText, { fontFamily: "Inter_400Regular" }]}
                textColor={textColor}
                activeColor={mine ? textColor : colors.primary}
              />
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
                <Feather name="check-circle" size={10} color={colors.primary + "80"} style={{ marginLeft: 3 }} />
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
          >
            <Feather name={showSearch ? "x" : "search"} size={20} color={colors.foreground} />
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

        {/* ── Floating Action Button ── */}
        <Animated.View style={[styles.fab, { transform: [{ scale: fabScale }], bottom: insets.bottom + 20 }]}>
          <Pressable
            onPress={handleFabPress}
            style={[
              styles.fabInner,
              {
                backgroundColor: colors.primary,
                borderWidth: 2,
                borderColor: isDark ? "rgba(255,255,255,0.25)" : "transparent",
              },
            ]}
          >
            <Feather name="plus" size={26} color="#fff" />
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
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 34 : 0}
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
          onPress={() => setActiveContact(null)}
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
            <Text style={[styles.headerName, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              {activeContact.name}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              {typingStatus ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <TypingIndicator color={colors.primary} />
                  <Text style={[styles.headerSub, { color: colors.primary, fontFamily: "Inter_400Regular" }]}>
                    {typingStatus}
                  </Text>
                </View>
              ) : (
                <Text style={[styles.headerSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  {isGroupChat ? "Tap to view group info" : "Tap to view profile"}
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

        {/* Three-dot menu */}
        <Pressable
          onPress={() => setShowHeaderMenu(true)}
          style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.6 : 1 }]}
          hitSlop={4}
        >
          <Feather name="more-vertical" size={20} color={colors.foreground} />
        </Pressable>
      </View>

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
            contentContainerStyle={[styles.listContent, { paddingBottom: 16 }]}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            showsVerticalScrollIndicator={false}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            ListEmptyComponent={
              <View style={styles.emptyList}>
                <Feather name="message-circle" size={36} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  {t("chat.noMessages")}
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

        {/* Input bar */}
        <View
          style={[
            styles.inputBar,
            {
              paddingBottom: Math.max(insets.bottom, 12),
              backgroundColor: isDark ? "#09090b" : "#fff",
              borderTopColor: colors.border,
            },
          ]}
        >
          <View style={[styles.inputWrap, { backgroundColor: isDark ? "#27272a" : "#f4f4f5", borderColor: colors.border }]}>
            <TextInput
              value={inputText}
              onChangeText={handleTextChange}
              placeholder={editingMsg ? t("chat.editPlaceholder") : t("chat.typePlaceholder")}
              placeholderTextColor={colors.mutedForeground}
              multiline
              style={[styles.input, { color: colors.text, fontFamily: "Inter_400Regular" }]}
              onSubmitEditing={handleSend}
            />
            <Pressable
              onPress={handleSend}
              disabled={!inputText.trim() || sending}
              style={({ pressed }) => [
                styles.sendBtn,
                {
                  backgroundColor: inputText.trim() ? colors.primary : (isDark ? "#27272a" : "#e4e4e7"),
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              {sending ? (
                <ActivityIndicator size={14} color={inputText.trim() ? (colors.primaryForeground || "#fff") : (isDark ? "#52525b" : "#a1a1aa")} />
              ) : (
                <Feather
                  name={editingMsg ? "check" : "send"}
                  size={16}
                  color={inputText.trim() ? (colors.primaryForeground || "#fff") : (isDark ? "#52525b" : "#a1a1aa")}
                />
              )}
            </Pressable>
          </View>
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

            {/* Group avatar — tappable to change for custom groups */}
            <View style={{ alignItems: "center", marginBottom: 16, gap: 8 }}>
              <Pressable
                onPress={() => isCustomGroup && handlePickGroupAvatar(true)}
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
                {isCustomGroup && (
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
                )}
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
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <Text style={[styles.groupProfileSection, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold", marginBottom: 0 }]}>
                {t("chat.membersCount", {
                  count: activeContact.id === "group"
                    ? contacts.filter((c) => c.type === "private").length
                    : (activeContact as any).members?.length || 0
                })}
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

            <ScrollView style={{ maxHeight: 160 }} showsVerticalScrollIndicator={false}>
              {contacts
                .filter((c) => {
                  if (c.type !== "private") return false;
                  if (activeContact.id === "group") return true;
                  return (activeContact as any).members?.includes(c.id as number);
                })
                .map((c) => (
                  <View
                    key={String(c.id)}
                    style={[styles.groupMemberRow, { borderBottomColor: colors.border }]}
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
                    {activeContact.id !== "group" && (
                      <Pressable
                        onPress={() => handleRemoveMember(c.id as number)}
                        hitSlop={8}
                        style={{ padding: 4 }}
                      >
                        <Feather name="user-minus" size={14} color={colors.danger} />
                      </Pressable>
                    )}
                    {c.is_blocked_from_group && (
                      <View style={[styles.lockBadge, { backgroundColor: colors.danger + "20" }]}>
                        <Feather name="slash" size={10} color={colors.danger} />
                        <Text style={[styles.lockBadgeTxt, { color: colors.danger }]}>{t("chat.blocked")}</Text>
                      </View>
                    )}
                  </View>
                ))}
            </ScrollView>

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

      {/* ── Contact Profile Modal (DM) ── */}
      <Modal
        visible={showContactProfile}
        transparent
        animationType="slide"
        onRequestClose={() => setShowContactProfile(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setShowContactProfile(false)}>
          <Pressable
            style={[
              styles.groupProfileSheet,
              { backgroundColor: isDark ? "#18181b" : "#fff", borderColor: colors.border },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

            {activeContact && activeContact.type === "private" && (
              <>
                {/* Avatar */}
                <View style={{ alignItems: "center", marginBottom: 20, gap: 10 }}>
                  <View style={[styles.groupProfileAvatar, { backgroundColor: colors.accent, overflow: "hidden" }]}>
                    {activeContact.avatar ? (
                      <Image source={{ uri: getMediaUrl(activeContact.avatar) }} style={{ width: "100%", height: "100%" }} />
                    ) : (
                      <Text style={{ color: "#fff", fontSize: 24, fontFamily: "Inter_700Bold" }}>{activeContact.initials}</Text>
                    )}
                  </View>
                  <Text style={[styles.groupProfileName, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                    {activeContact.name}
                  </Text>
                  <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular" }}>
                    {t("chat.directMessageChat")}
                  </Text>
                </View>

                {/* Actions */}
                <View style={{ gap: 10, marginTop: 12 }}>
                  <Pressable
                    onPress={() => {
                      setShowContactProfile(false);
                      handleClearChat();
                    }}
                    style={({ pressed }) => [
                      styles.actionItem,
                      { opacity: pressed ? 0.7 : 1, borderBottomColor: colors.border, paddingVertical: 14 },
                    ]}
                  >
                    <Feather name="trash-2" size={18} color={colors.foreground} />
                    <Text style={[styles.actionLabel, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
                      {t("chat.clearConversation")}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      setShowContactProfile(false);
                      handleBlockDMUser(activeContact);
                    }}
                    style={({ pressed }) => [
                      styles.actionItem,
                      { opacity: pressed ? 0.7 : 1, borderBottomColor: colors.border, paddingVertical: 14 },
                    ]}
                  >
                    <Feather name={activeContact.is_blocked_from_group ? "user-check" : "user-x"} size={18} color={colors.danger} />
                    <Text style={[styles.actionLabel, { color: colors.danger, fontFamily: "Inter_500Medium" }]}>
                      {activeContact.is_blocked_from_group ? t("chat.unblockUser") : t("chat.blockUser")}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      setShowContactProfile(false);
                      handleReportUser(activeContact);
                    }}
                    style={({ pressed }) => [
                      styles.actionItem,
                      { opacity: pressed ? 0.7 : 1, borderBottomColor: "transparent", paddingVertical: 14 },
                    ]}
                  >
                    <Feather name="alert-triangle" size={18} color={colors.danger} />
                    <Text style={[styles.actionLabel, { color: colors.danger, fontFamily: "Inter_500Medium" }]}>
                      {t("chat.reportUser")}
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
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
                    setContacts((prev) =>
                      prev.map((c) => c.id === avatarPopupContact.id ? { ...c, unread_count: 0 } : c)
                    );
                    setActiveContact({ ...avatarPopupContact, unread_count: 0 });
                    setMessages([]);
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
    </KeyboardAvoidingView>
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

  // ── Input ──
  inputBar: {
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 26,
    borderWidth: 1,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    maxHeight: 120,
    paddingVertical: Platform.OS === "ios" ? 6 : 4,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
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
});
