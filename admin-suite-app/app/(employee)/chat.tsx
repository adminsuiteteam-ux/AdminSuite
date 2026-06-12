import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  ActionSheetIOS,
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
  TouchableOpacity,
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

// ─── Typing Indicator Dots ───────────────────────────────────────────────────
function TypingDots({ color }: { color: string }) {
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

export default function EmployeeChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation();

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

  // Redesign state
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "unread" | "groups" | "archive">("all");
  const [typingStatus, setTypingStatus] = useState("");
  const [typingStatuses, setTypingStatuses] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const pollRef = useRef<any>(null);
  const lastTypingSentRef = useRef<number>(0);

  // Update router params so the layout tab bar knows whether to hide
  useEffect(() => {
    router.setParams({ showDetail: activeContact ? "true" : "false" });
  }, [activeContact]);

  // ─── Load contacts ──────────────────────────────────────────────────────────
  const loadContacts = useCallback(async () => {
    try {
      const res = await apiService.getChatContacts();
      const data: Contact[] = res.data;
      // Sort contacts by last_message_time descending
      const sorted = [...data].sort((a, b) => {
        const ta = a.last_message_time ? new Date(a.last_message_time).getTime() : 0;
        const tb = b.last_message_time ? new Date(b.last_message_time).getTime() : 0;
        return tb - ta;
      });
      setContacts(sorted);
      setActiveContact((prev) => {
        if (!prev) return null; // Do NOT auto-select
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

  // Poll contacts every 8 seconds to update group lock/block status (only when list is open)
  useEffect(() => {
    if (activeContact) return;
    const interval = setInterval(loadContacts, 8000);
    return () => clearInterval(interval);
  }, [loadContacts, activeContact]);

  // ─── Load messages when active contact changes ──────────────────────────────
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

  // ─── Long-press action sheet ─────────────────────────────────────────────────
  const openMessageActions = (msg: ChatMessage) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
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
        showToast({ title: "Copied", message: "Message copied to clipboard.", type: "success" });
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
          showToast({ title: "Error", message: t("chat.couldNotPin"), type: "error" });
        }
        break;
      case "delete":
        if (selectedMsg.sender_id === user?.id) {
          Alert.alert(t("chat.deleteMessage"), t("chat.deleteMessageConfirm"), [
            { text: t("settings.cancel"), style: "cancel" },
            {
              text: t("chat.actions.delete"),
              style: "destructive",
              onPress: async () => {
                try {
                  await apiService.deleteChatMessage(selectedMsg.id);
                  await fetchMessages();
                } catch {
                  showToast({ title: "Error", message: t("chat.couldNotDelete"), type: "error" });
                }
              },
            },
          ]);
        }
        break;
    }
    setSelectedMsg(null);
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const isDark = colors.isDark;
  const myId = user?.id;

  const isGroup = activeContact?.id === "group";
  const isLocked = isGroup && activeContact?.group_locked;
  const isBlocked = isGroup && activeContact?.is_blocked_from_group;
  const isDisabled = isLocked || isBlocked;

  // ─── If no contacts exist ───────────────────────────────────────────────────
  if (contacts.length === 0) {
    if (loadingContacts) {
      return (
        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      );
    }
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Feather name="message-square" size={40} color={colors.mutedForeground} />
        <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
          {t("chat.noContacts")}
        </Text>
      </View>
    );
  }

  const isMine = (msg: ChatMessage) => msg.sender_id === myId;

  const renderMessage = ({ item: msg }: { item: ChatMessage }) => {
    const mine = isMine(msg);
    const bubbleBg = mine
      ? colors.primary
      : isDark
      ? "#27272a"
      : "#e4e4e7";
    const textColor = mine ? (colors.primaryForeground || "#fff") : colors.foreground;

    return (
      <SwipeableMessage
        onReply={() => setReplyTo(msg)}
        replyColor={colors.primary}
      >
        <Pressable
          onLongPress={() => !msg.is_deleted && openMessageActions(msg)}
          delayLongPress={350}
          style={[styles.msgRow, mine ? styles.msgRight : styles.msgLeft]}
        >
          {!mine && (
            <View style={[styles.avatar, { backgroundColor: colors.primary + "30", overflow: "hidden", borderWidth: 1.5, borderColor: colors.primary + "40" }]}>
              {msg.sender_avatar ? (
                <Image source={{ uri: getMediaUrl(msg.sender_avatar) }} style={{ width: "100%", height: "100%" }} />
              ) : (
                <Text style={[styles.avatarTxt, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
                  {msg.sender_initials}
                </Text>
              )}
            </View>
          )}

          <View style={[styles.msgContent, { maxWidth: "75%" }]}>
            {!mine && (
              <Text style={[styles.senderName, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
                {msg.sender_name}
              </Text>
            )}

            {/* Reply preview */}
            {msg.reply_to_id && msg.reply_to_text && (
              <View style={[styles.replyPreview, { borderLeftColor: mine ? "rgba(255,255,255,0.6)" : colors.primary, backgroundColor: mine ? "rgba(255,255,255,0.15)" : colors.primary + "18" }]}>
                <Text style={[styles.replyName, { color: mine ? "rgba(255,255,255,0.85)" : colors.primary, fontFamily: "Inter_600SemiBold" }]}>
                  {msg.reply_to_sender}
                </Text>
                <Text style={[styles.replyText, { color: mine ? "rgba(255,255,255,0.75)" : colors.mutedForeground, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
                  {msg.reply_to_text}
                </Text>
              </View>
            )}

            <View style={[styles.bubble, { backgroundColor: bubbleBg, borderTopRightRadius: mine ? 4 : 18, borderTopLeftRadius: mine ? 18 : 4 }]}>
              <ExpandableText
                text={msg.display_text}
                style={[styles.bubbleText, { fontFamily: "Inter_400Regular" }]}
                textColor={textColor}
                activeColor={mine ? textColor : colors.primary}
              />
            </View>

            <View style={[styles.metaRow, mine ? { justifyContent: "flex-end" } : {}]}>
              {msg.is_pinned && (
                <Feather name="bookmark" size={10} color={colors.accent} style={{ marginRight: 4 }} />
              )}
              {msg.is_edited && !msg.is_deleted && (
                <Text style={[styles.metaText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  {t("chat.edited") || "edited"} ·{" "}
                </Text>
              )}
              <Text style={[styles.metaText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {formatTime(msg.created_at)}
              </Text>
            </View>
          </View>
        </Pressable>
      </SwipeableMessage>
    );
  };

  // helper to format last message time
  const formatContactTime = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const filteredContacts = contacts.filter((c) => {
    const matchesSearch = !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      activeFilter === "all" ||
      (activeFilter === "unread" && (c.unread_count ?? 0) > 0) ||
      (activeFilter === "groups" && c.type === "group") ||
      (activeFilter === "archive" && false);
    return matchesSearch && matchesFilter;
  });

  if (!activeContact) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Top Header Row */}
        <View
          style={[
            styles.headerRow,
            {
              paddingTop: insets.top + 8,
              backgroundColor: isDark ? "#09090b" : "#fff",
              borderBottomColor: colors.border,
            },
          ]}
        >
          {showSearch ? (
            <View style={[styles.searchBar, { backgroundColor: isDark ? "#27272a" : "#f4f4f5", borderColor: colors.border, flex: 1 }]}>
              <Feather name="search" size={15} color={colors.mutedForeground} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search chats..."
                placeholderTextColor={colors.mutedForeground}
                style={[styles.searchInput, { color: colors.text }]}
                autoFocus
              />
              <Pressable onPress={() => { setSearchQuery(""); setShowSearch(false); }}>
                <Feather name="x" size={16} color={colors.mutedForeground} />
              </Pressable>
            </View>
          ) : (
            <>
              <Pressable
                onPress={() => router.back()}
                style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
                hitSlop={8}
              >
                <Feather name="arrow-left" size={22} color={colors.foreground} />
              </Pressable>
              <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_700Bold", flex: 1 }]}>
                {t("chat.messages") || "Messages"}
              </Text>
              <Pressable
                onPress={() => setShowSearch(true)}
                style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
                hitSlop={8}
              >
                <Feather name="search" size={20} color={colors.foreground} />
              </Pressable>
            </>
          )}
        </View>

        {/* Filter Tabs */}
        <View style={[styles.filterRow, { borderBottomColor: colors.border }]}>
          {(["all", "unread", "groups", "archive"] as const).map((filter) => {
            const active = activeFilter === filter;
            const hasUnread = filter === "unread" && contacts.some((c) => (c.unread_count ?? 0) > 0);
            return (
              <Pressable
                key={filter}
                onPress={() => setActiveFilter(filter)}
                style={[
                  styles.filterTab,
                  {
                    backgroundColor: active ? colors.primary + "1A" : "transparent",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterTabTxt,
                    {
                      color: active ? colors.primary : colors.mutedForeground,
                      fontFamily: active ? "Inter_600SemiBold" : "Inter_500Medium",
                      textTransform: "capitalize",
                    },
                  ]}
                >
                  {filter}
                </Text>
                {filter === "unread" && hasUnread && (
                  <View style={[styles.filterTabDot, { backgroundColor: colors.danger }]} />
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Contacts List */}
        {loadingContacts ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : filteredContacts.length === 0 ? (
          <View style={styles.center}>
            <Feather name="message-square" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
              {searchQuery ? "No results found." : "No conversations yet."}
            </Text>
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ paddingVertical: 8 }}>
              {filteredContacts.map((contact) => {
                const isGroup = contact.id === "group";
                const unread = contact.unread_count ?? 0;
                return (
                  <Pressable
                    key={String(contact.id)}
                    onPress={() => {
                      // Clear unread count locally immediately
                      setContacts((prev) =>
                        prev.map((c) => (c.id === contact.id ? { ...c, unread_count: 0 } : c))
                      );
                      setActiveContact({ ...contact, unread_count: 0 });
                      setMessages([]);
                      setReplyTo(null);
                      setEditingMsg(null);
                      if (Platform.OS !== "web") {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      }
                    }}
                    style={({ pressed }) => [
                      styles.contactRowFull,
                      {
                        backgroundColor: pressed ? colors.card : "transparent",
                        borderBottomColor: colors.border,
                      },
                    ]}
                  >
                    {/* Avatar */}
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

                    {/* Contact Info */}
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
                            {typingTxt ? typingTxt : (contact.last_message || (isGroup ? "Company group chat" : "Direct message"))}
                          </Text>
                        );
                      })()}
                    </View>

                    {/* Right Info */}
                    <View style={{ alignItems: "flex-end", gap: 4 }}>
                      {contact.last_message_time && (
                        <Text
                          style={[
                            styles.contactTime,
                            {
                              color: unread > 0 ? colors.primary : colors.mutedForeground,
                              fontFamily: unread > 0 ? "Inter_600SemiBold" : "Inter_400Regular",
                            },
                          ]}
                        >
                          {formatContactTime(contact.last_message_time)}
                        </Text>
                      )}
                      {unread > 0 ? (
                        <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                          <Text style={styles.unreadBadgeTxt}>{unread > 99 ? "99+" : unread}</Text>
                        </View>
                      ) : (
                        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                      )}
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

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 34 : 0}
    >
      {/* Top Bar — WhatsApp style, no tab bar */}
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
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
          hitSlop={8}
        >
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>

        {/* Contact avatar */}
        <View style={[styles.headerAvatar, { backgroundColor: activeContact.type === "group" ? colors.primary : colors.accent, overflow: "hidden" }]}>
          {activeContact.avatar ? (
            <Image source={{ uri: getMediaUrl(activeContact.avatar) }} style={{ width: "100%", height: "100%" }} />
          ) : (
            <Text style={[styles.headerAvatarTxt, { color: activeContact.type === "group" ? colors.primaryForeground : (colors.accentForeground || "#fff"), fontFamily: "Inter_700Bold" }]}>
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
                <TypingDots color={colors.primary} />
                <Text style={[styles.headerSub, { color: colors.primary, fontFamily: "Inter_400Regular" }]}>
                  {typingStatus}
                </Text>
              </View>
            ) : (
              <Text style={[styles.headerSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {activeContact.type === "group" ? t("chat.teamGroupChat") : t("chat.directMessage")}
              </Text>
            )}
            {!typingStatus && isGroup && isLocked && (
              <View style={[styles.lockBadge, { backgroundColor: (colors.warning ?? "#f59e0b") + "20" }]}>
                <Feather name="lock" size={9} color={colors.warning ?? "#f59e0b"} />
                <Text style={[styles.lockBadgeTxt, { color: colors.warning ?? "#f59e0b", fontFamily: "Inter_600SemiBold" }]}>
                  {t("chat.locked")}
                </Text>
              </View>
            )}
            {!typingStatus && isGroup && isBlocked && (
              <View style={[styles.lockBadge, { backgroundColor: colors.danger + "20" }]}>
                <Feather name="slash" size={9} color={colors.danger} />
                <Text style={[styles.lockBadgeTxt, { color: colors.danger, fontFamily: "Inter_600SemiBold" }]}>
                  {t("chat.blocked")}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Messages */}
      {loadingMessages ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(m) => m.id.toString()}
          renderItem={renderMessage}
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

      {/* Reply / Edit preview bar */}
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
          <Pressable
            onPress={() => {
              setReplyTo(null);
              setEditingMsg(null);
              setInputText("");
            }}
            hitSlop={8}
          >
            <Feather name="x" size={18} color={colors.mutedForeground} />
          </Pressable>
        </View>
      )}

      {/* Input bar */}
      <View
          style={[
            styles.inputBar,
            {
              paddingBottom: Math.max(insets.bottom, 16),
              backgroundColor: isDark ? "#09090b" : "#fff",
              borderTopColor: colors.border,
            },
          ]}
        >
          {isDisabled ? (
            <View
              style={[
                styles.lockBanner,
                {
                  backgroundColor: isBlocked
                    ? colors.danger + "15"
                    : (colors.warning ?? "#f59e0b") + "15",
                  borderColor: isBlocked
                    ? colors.danger + "30"
                    : (colors.warning ?? "#f59e0b") + "30",
                },
              ]}
            >
              <Feather
                name={isBlocked ? "slash" : "lock"}
                size={14}
                color={isBlocked ? colors.danger : (colors.warning ?? "#f59e0b")}
              />
              <Text
                style={[
                  styles.lockBannerText,
                  {
                    color: isBlocked ? colors.danger : (colors.warning ?? "#f59e0b"),
                    fontFamily: "Inter_600SemiBold",
                  },
                ]}
              >
                {isBlocked
                  ? t("chat.blockedFromGroup")
                  : t("chat.groupLocked")}
              </Text>
            </View>
          ) : (
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
          )}
        </View>

      {/* Message Action Modal */}
      <Modal
        visible={showActionSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setShowActionSheet(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setShowActionSheet(false)}>
          <View style={[styles.actionSheet, { backgroundColor: isDark ? "#18181b" : "#fff", borderColor: colors.border }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

            {[
              ...(!isDisabled ? [{ id: "reply", icon: "corner-up-left", label: t("chat.actions.reply") }] : []),
              { id: "copy", icon: "copy", label: t("chat.actions.copy") },
              ...(selectedMsg?.sender_id === myId && !selectedMsg?.is_deleted && !isDisabled
                ? [
                    { id: "edit", icon: "edit-2", label: t("chat.actions.edit") },
                    { id: "delete", icon: "trash-2", label: t("chat.actions.delete"), danger: true },
                  ]
                : []),
              { id: "pin", icon: "bookmark", label: selectedMsg?.is_pinned ? t("chat.actions.unpin") : t("chat.actions.pin") },
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
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
  contactsBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
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
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
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
    marginBottom: 12,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actionLabel: { fontSize: 16 },
  lockBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  lockBadgeTxt: { fontSize: 9 },
  lockBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 22,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginVertical: 4,
  },
  lockBannerText: { fontSize: 12.5 },

  // Redesign additions
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 20,
  },
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
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  unreadBadgeTxt: { color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" },
  swipeReplyIcon: {
    position: "absolute",
    left: 8,
    top: "50%",
    marginTop: -10,
    zIndex: -1,
  },
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
});
