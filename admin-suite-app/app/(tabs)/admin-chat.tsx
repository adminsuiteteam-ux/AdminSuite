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
import * as Haptics from "expo-haptics";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useToast } from "@/context/ToastContext";
import { apiService, getMediaUrl } from "@/services/api";

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
        {...panResponder.panHandlers}
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
  const [showTyping, setShowTyping] = useState(false);

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

  // Group Profile Modal
  const [showGroupProfile, setShowGroupProfile] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const pollRef = useRef<any>(null);
  const fabScale = useRef(new Animated.Value(1)).current;

  // ─── Load contacts ──────────────────────────────────────────────────────────
  const loadContacts = useCallback(async () => {
    try {
      const res = await apiService.getChatContacts();
      const data: Contact[] = res.data;
      setContacts(data);
      const group = data.find((c) => c.id === "group");
      if (group?.group_locked !== undefined) setGroupLocked(group.group_locked);
    } catch {
      showToast({ title: "Error", message: "Could not load contacts.", type: "error" });
    } finally {
      setLoadingContacts(false);
    }
  }, []);

  useEffect(() => { loadContacts(); }, [loadContacts]);

  // ─── Load messages when active contact changes ───────────────────────────────
  const fetchMessages = useCallback(async () => {
    if (!activeContact) return;
    try {
      let res;
      if (activeContact.type === "group") {
        if (activeContact.id === "group") {
          res = await apiService.getChatMessages("group");
        } else {
          res = await apiService.getChatMessages(undefined, activeContact.id as number);
        }
      } else {
        res = await apiService.getChatMessages(activeContact.id as number);
      }
      const newMsgs: ChatMessage[] = res.data;

      // Check for new incoming message → trigger in-app notification
      if (newMsgs.length > 0) {
        const latestMsg = newMsgs[newMsgs.length - 1];
        if (
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
        lastMsgIdRef.current = latestMsg.id;
      } else if (lastMsgIdRef.current === null && newMsgs.length > 0) {
        lastMsgIdRef.current = newMsgs[newMsgs.length - 1].id;
      }

      setMessages(newMsgs);
    } catch {}
  }, [activeContact, user?.id]);

  useEffect(() => {
    if (!activeContact) return;
    setLoadingMessages(true);
    lastMsgIdRef.current = null;
    fetchMessages().finally(() => setLoadingMessages(false));
    pollRef.current = setInterval(() => {
      fetchMessages();
      // Randomly show typing indicator sometimes to simulate real-time feel
    }, 3000);
    return () => clearInterval(pollRef.current);
  }, [activeContact, fetchMessages]);

  // ─── Filtered contacts ──────────────────────────────────────────────────────
  const filteredContacts = contacts.filter((c) => {
    const matchesSearch = !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      activeFilter === "all" ||
      (activeFilter === "unread" && (c.unread_count ?? 0) > 0) ||
      (activeFilter === "groups" && c.type === "group") ||
      (activeFilter === "dms" && c.type === "private");
    return matchesSearch && matchesFilter;
  });

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
      }
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

  // ─── FAB press animation ────────────────────────────────────────────────────
  const handleFabPress = () => {
    Animated.sequence([
      Animated.timing(fabScale, { toValue: 0.88, duration: 100, useNativeDriver: true }),
      Animated.spring(fabScale, { toValue: 1, useNativeDriver: true }),
    ]).start();
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setNewGroupName("");
    setSelectedMembers([]);
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
      await apiService.createChatGroup({
        name,
        members: selectedMembers,
      });
      showToast({ title: "Group Created", message: `"${name}" group is ready.`, type: "success" });
      setShowCreateGroup(false);
      setNewGroupName("");
      setSelectedMembers([]);
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

  const myId = user?.id;

  // ─── Unread count across all contacts ──────────────────────────────────────
  const totalUnread = contacts.reduce((sum, c) => sum + (c.unread_count ?? 0), 0);

  // ─── Render individual message bubble ───────────────────────────────────────
  const renderMessage = ({ item: msg }: { item: ChatMessage }) => {
    const mine = msg.sender_id === myId;
    // Fix: sender bubbles always use primary colour; receiver uses themed card
    const bubbleBg = mine ? colors.primary : isDark ? "#27272a" : "#e4e4e7";
    // Fix: receiver text always uses foreground; sender always white
    const textColor = mine ? "#ffffff" : colors.text;

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
              <Text style={[styles.bubbleText, { color: textColor, fontFamily: "Inter_400Regular" }]}>
                {msg.display_text}
              </Text>
            </View>
            <View style={[styles.metaRow, mine ? { justifyContent: "flex-end" } : {}]}>
              {msg.is_pinned && <Feather name="bookmark" size={10} color={colors.accent} style={{ marginRight: 4 }} />}
              {msg.is_edited && !msg.is_deleted && (
                <Text style={[styles.metaText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  edited ·{" "}
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
              Messages
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
                      setActiveContact(contact);
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
                    {/* Avatar with online dot */}
                    <View style={{ position: "relative" }}>
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
                          <Text style={[styles.contactAvatarTxtLarge, { fontFamily: "Inter_700Bold" }]}>
                            {contact.initials}
                          </Text>
                        )}
                      </View>
                      {isGroup && (
                        <View style={[styles.onlineDot, { backgroundColor: "#22c55e", borderColor: isDark ? "#09090b" : "#fff" }]} />
                      )}
                    </View>

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
                      <Text style={[styles.contactSubLarge, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
                        {contact.last_message || (isGroup ? "Company group chat" : "Employee direct message")}
                      </Text>
                    </View>

                    {/* Status indicators */}
                    <View style={{ alignItems: "flex-end", gap: 4 }}>
                      {contact.last_message_time && (
                        <Text style={[styles.contactTime, { color: unread > 0 ? colors.primary : colors.mutedForeground, fontFamily: unread > 0 ? "Inter_600SemiBold" : "Inter_400Regular" }]}>
                          {formatTime(contact.last_message_time)}
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
            style={[styles.fabInner, { backgroundColor: colors.primary }]}
          >
            <Feather name="edit-3" size={22} color="#fff" />
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
                  New Group Chat
                </Text>
                <Text style={[styles.createGroupSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  Create a new group conversation for your team
                </Text>

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
                  Select Members
                </Text>
                <ScrollView style={{ maxHeight: 180, marginVertical: 6 }} showsVerticalScrollIndicator={false}>
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
                    <Text style={[styles.createGroupBtnTxt, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>Cancel</Text>
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
                      <Text style={[styles.createGroupBtnTxt, { color: "#fff", fontFamily: "Inter_600SemiBold" }]}>Create</Text>
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
  const isGroupChat = activeContact.id === "group";

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
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

        {/* Tappable header → Group Profile */}
        <Pressable
          onPress={() => isGroupChat && setShowGroupProfile(true)}
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
              <Text style={[styles.headerAvatarTxt, { fontFamily: "Inter_700Bold" }]}>
                {activeContact.initials}
              </Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerName, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              {activeContact.name}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              {showTyping ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <TypingIndicator color={colors.primary} />
                  <Text style={[styles.headerSub, { color: colors.primary, fontFamily: "Inter_400Regular" }]}>
                    typing...
                  </Text>
                </View>
              ) : (
                <Text style={[styles.headerSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  {isGroupChat ? "Tap to view group info" : "Private chat"}
                </Text>
              )}
              {isGroupChat && groupLocked && (
                <View style={[styles.lockBadge, { backgroundColor: (colors.warning ?? "#f59e0b") + "20" }]}>
                  <Feather name="lock" size={9} color={colors.warning ?? "#f59e0b"} />
                  <Text style={[styles.lockBadgeTxt, { color: colors.warning ?? "#f59e0b", fontFamily: "Inter_600SemiBold" }]}>
                    Locked
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Pressable>

        {/* Admin controls */}
        <View style={{ flexDirection: "row", gap: 6 }}>
          {isGroupChat && (
            <Pressable
              onPress={handleToggleLock}
              disabled={togglingLock}
              style={({ pressed }) => [
                styles.iconBtn,
                {
                  backgroundColor: groupLocked
                    ? (colors.warning ?? "#f59e0b") + "25"
                    : colors.card,
                  borderColor: groupLocked
                    ? (colors.warning ?? "#f59e0b") + "50"
                    : colors.border,
                  borderWidth: 1,
                  opacity: pressed || togglingLock ? 0.7 : 1,
                },
              ]}
              hitSlop={4}
            >
              {togglingLock ? (
                <ActivityIndicator size={14} color={colors.warning ?? "#f59e0b"} />
              ) : (
                <Feather
                  name={groupLocked ? "lock" : "unlock"}
                  size={16}
                  color={groupLocked ? (colors.warning ?? "#f59e0b") : colors.mutedForeground}
                />
              )}
            </Pressable>
          )}
          {isGroupChat && (
            <Pressable
              onPress={() => setShowGroupProfile(true)}
              style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.6 : 1 }]}
              hitSlop={4}
            >
              <Feather name="info" size={18} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
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
            ListEmptyComponent={
              <View style={styles.emptyList}>
                <Feather name="message-circle" size={36} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  No messages yet. Say hello! 👋
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
                {editingMsg ? "Edit message" : `Reply to ${replyTo?.sender_name}`}
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
              onChangeText={setInputText}
              placeholder={editingMsg ? "Edit message..." : "Type a message..."}
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
                  backgroundColor: inputText.trim() ? colors.primary : isDark ? "#3f3f46" : "#d4d4d8",
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              {sending ? (
                <ActivityIndicator size={14} color="#fff" />
              ) : (
                <Feather name={editingMsg ? "check" : "send"} size={16} color="#fff" />
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
              { id: "reply", icon: "corner-up-left", label: "Reply" },
              { id: "copy", icon: "copy", label: "Copy" },
              ...(selectedMsg?.sender_id === myId && !selectedMsg?.is_deleted
                ? [
                    { id: "edit", icon: "edit-2", label: "Edit" },
                    { id: "delete", icon: "trash-2", label: "Delete", danger: true },
                  ]
                : []),
              { id: "pin", icon: "bookmark", label: selectedMsg?.is_pinned ? "Unpin" : "Pin" },
              ...(isGroupChat && selectedMsg?.sender_id !== myId
                ? [
                    {
                      id: "block_sender",
                      icon: contacts.find((c) => c.id === selectedMsg?.sender_id)?.is_blocked_from_group
                        ? "user-check"
                        : "user-x",
                      label: contacts.find((c) => c.id === selectedMsg?.sender_id)?.is_blocked_from_group
                        ? "Unblock from Group"
                        : "Block from Group",
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
        <Pressable style={styles.backdrop} onPress={() => setShowGroupProfile(false)}>
          <Pressable
            style={[
              styles.groupProfileSheet,
              { backgroundColor: isDark ? "#18181b" : "#fff", borderColor: colors.border },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

            {/* Group avatar */}
            <View style={{ alignItems: "center", marginBottom: 20, gap: 10 }}>
              <View style={[styles.groupProfileAvatar, { backgroundColor: colors.primary }]}>
                <Feather name="users" size={32} color="#fff" />
              </View>
              <Text style={[styles.groupProfileName, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                {activeContact.name}
              </Text>
              <View style={[styles.lockBadge, { backgroundColor: groupLocked ? (colors.warning ?? "#f59e0b") + "20" : colors.primary + "15" }]}>
                <Feather name={groupLocked ? "lock" : "unlock"} size={11} color={groupLocked ? (colors.warning ?? "#f59e0b") : colors.primary} />
                <Text style={[styles.lockBadgeTxt, { color: groupLocked ? (colors.warning ?? "#f59e0b") : colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 11 }]}>
                  {groupLocked ? "Chat Locked" : "Chat Open"}
                </Text>
              </View>
            </View>

            {/* Members list */}
            <Text style={[styles.groupProfileSection, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
              MEMBERS ({
                activeContact.id === "group"
                  ? contacts.filter((c) => c.type === "private").length
                  : (activeContact as any).members?.length || 0
              })
            </Text>
            <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
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
                    {c.is_blocked_from_group && (
                      <View style={[styles.lockBadge, { backgroundColor: colors.danger + "20" }]}>
                        <Feather name="slash" size={10} color={colors.danger} />
                        <Text style={[styles.lockBadgeTxt, { color: colors.danger }]}>Blocked</Text>
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
});
