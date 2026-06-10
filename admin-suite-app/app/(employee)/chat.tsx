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
  Platform,
  Pressable,
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

type Contact = {
  id: number | "group";
  type: "group" | "private";
  name: string;
  initials: string;
  avatar: string | null;
  group_locked?: boolean;
  is_blocked_from_group?: boolean;
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

export default function EmployeeChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { showToast } = useToast();

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

  const flatListRef = useRef<FlatList>(null);
  const pollRef = useRef<any>(null);

  // ─── Load contacts ──────────────────────────────────────────────────────────
  const loadContacts = useCallback(async () => {
    try {
      const res = await apiService.getChatContacts();
      const data: Contact[] = res.data;
      setContacts(data);
      setActiveContact((prev) => {
        if (!prev) return data.length > 0 ? data[0] : null;
        const updated = data.find((c) => c.id === prev.id);
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

  // Poll contacts every 8 seconds to update group lock/block status
  useEffect(() => {
    const interval = setInterval(loadContacts, 8000);
    return () => clearInterval(interval);
  }, [loadContacts]);

  // ─── Load messages when active contact changes ──────────────────────────────
  const fetchMessages = useCallback(async () => {
    if (!activeContact) return;
    try {
      const rid = activeContact.id === "group" ? undefined : (activeContact.id as number);
      const res = await apiService.getChatMessages(rid);
      setMessages(res.data);
    } catch {}
  }, [activeContact]);

  useEffect(() => {
    if (!activeContact) return;
    setLoadingMessages(true);
    fetchMessages().finally(() => setLoadingMessages(false));

    // Poll every 3 seconds for new messages
    pollRef.current = setInterval(fetchMessages, 3000);
    return () => clearInterval(pollRef.current);
  }, [activeContact, fetchMessages]);

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
        if (activeContact?.id !== "group") payload.recipient_id = activeContact?.id;
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
                  showToast({ title: "Error", message: "Could not delete message.", type: "error" });
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

  // ─── If no active contact (full-screen chat) ─────────────────────────────────
  if (!activeContact || contacts.length === 0) {
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
          No contacts yet
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
    const textColor = mine ? "#fff" : colors.text;

    return (
      <Pressable
        onLongPress={() => !msg.is_deleted && openMessageActions(msg)}
        delayLongPress={350}
        style={[styles.msgRow, mine ? styles.msgRight : styles.msgLeft]}
      >
        {!mine && (
          <View style={[styles.avatar, { backgroundColor: colors.primary + "33" }, msg.sender_avatar ? { overflow: "hidden" } : {}]}>
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
            <Text style={[styles.bubbleText, { color: textColor, fontFamily: "Inter_400Regular" }]}>
              {msg.display_text}
            </Text>
          </View>

          <View style={[styles.metaRow, mine ? { justifyContent: "flex-end" } : {}]}>
            {msg.is_pinned && (
              <Feather name="bookmark" size={10} color={colors.accent} style={{ marginRight: 4 }} />
            )}
            {msg.is_edited && !msg.is_deleted && (
              <Text style={[styles.metaText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                edited ·{" "}
              </Text>
            )}
            <Text style={[styles.metaText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {formatTime(msg.created_at)}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
          onPress={() => router.back()}
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
            <Text style={[styles.headerSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {activeContact.type === "group" ? "Team group chat" : "Direct message"}
            </Text>
            {isGroup && isLocked && (
              <View style={[styles.lockBadge, { backgroundColor: (colors.warning ?? "#f59e0b") + "20" }]}>
                <Feather name="lock" size={9} color={colors.warning ?? "#f59e0b"} />
                <Text style={[styles.lockBadgeTxt, { color: colors.warning ?? "#f59e0b", fontFamily: "Inter_600SemiBold" }]}>
                  Locked
                </Text>
              </View>
            )}
            {isGroup && isBlocked && (
              <View style={[styles.lockBadge, { backgroundColor: colors.danger + "20" }]}>
                <Feather name="slash" size={9} color={colors.danger} />
                <Text style={[styles.lockBadgeTxt, { color: colors.danger, fontFamily: "Inter_600SemiBold" }]}>
                  Blocked
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Contact switcher */}
        {contacts.length > 1 && (
          <Pressable
            style={({ pressed }) => [styles.contactsBtn, { opacity: pressed ? 0.6 : 1, backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => {
              // Cycle through contacts
              const idx = contacts.findIndex((c) => c.id === activeContact.id);
              const next = contacts[(idx + 1) % contacts.length];
              setActiveContact(next);
              setMessages([]);
              setReplyTo(null);
              setEditingMsg(null);
            }}
          >
            <Feather name="users" size={16} color={colors.foreground} />
          </Pressable>
        )}
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

      {/* Reply / Edit preview bar */}
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
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
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
                  ? "You have been blocked from posting in this group."
                  : "Group is locked — only the admin can post."}
              </Text>
            </View>
          ) : (
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
                    backgroundColor: inputText.trim() ? colors.primary : (isDark ? "#3f3f46" : "#d4d4d8"),
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                {sending ? (
                  <ActivityIndicator size={14} color={inputText.trim() ? colors.primaryForeground : "#fff"} />
                ) : (
                  <Feather name={editingMsg ? "check" : "send"} size={16} color={inputText.trim() ? colors.primaryForeground : "#fff"} />
                )}
              </Pressable>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>

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
              ...(!isDisabled ? [{ id: "reply", icon: "corner-up-left", label: "Reply" }] : []),
              { id: "copy", icon: "copy", label: "Copy" },
              ...(selectedMsg?.sender_id === myId && !selectedMsg?.is_deleted && !isDisabled
                ? [
                    { id: "edit", icon: "edit-2", label: "Edit" },
                    { id: "delete", icon: "trash-2", label: "Delete", danger: true },
                  ]
                : []),
              { id: "pin", icon: selectedMsg?.is_pinned ? "bookmark" : "bookmark", label: selectedMsg?.is_pinned ? "Unpin" : "Pin" },
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
    </View>
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
});
