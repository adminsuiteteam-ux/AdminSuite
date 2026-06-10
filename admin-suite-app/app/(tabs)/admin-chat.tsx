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
  KeyboardAvoidingView,
  Modal,
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

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AdminChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { showToast } = useToast();
  const isDark = colors.isDark;

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
  const [showContacts, setShowContacts] = useState(true);

  const flatListRef = useRef<FlatList>(null);
  const pollRef = useRef<any>(null);

  // ─── Load contacts ──────────────────────────────────────────────────────────
  const loadContacts = useCallback(async () => {
    try {
      const res = await apiService.getChatContacts();
      const data: Contact[] = res.data;
      setContacts(data);
      // Sync group lock from first contact (the group)
      const group = data.find((c) => c.id === "group");
      if (group?.group_locked !== undefined) setGroupLocked(group.group_locked);
      if (!activeContact && data.length > 0) setActiveContact(data[0]);
    } catch {
      showToast({ title: "Error", message: "Could not load contacts.", type: "error" });
    } finally {
      setLoadingContacts(false);
    }
  }, []);

  useEffect(() => { loadContacts(); }, [loadContacts]);

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
        message: newLocked
          ? "Only you can post in the group now."
          : "Everyone can post in the group again.",
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
          : `${contact.name} can post in the group again.`,
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
        // Block sender from group
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

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const myId = user?.id;

  // ─── Render individual message bubble ───────────────────────────────────────
  const renderMessage = ({ item: msg }: { item: ChatMessage }) => {
    const mine = msg.sender_id === myId;
    const bubbleBg = mine ? colors.primary : isDark ? "#27272a" : "#e4e4e7";
    const textColor = mine ? "#fff" : colors.text;

    return (
      <Pressable
        onLongPress={() => !msg.is_deleted && openMessageActions(msg)}
        delayLongPress={350}
        style={[styles.msgRow, mine ? styles.msgRight : styles.msgLeft]}
      >
        {!mine && (
          <View style={[styles.avatar, { backgroundColor: colors.primary + "33" }]}>
            <Text style={[styles.avatarTxt, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
              {msg.sender_initials}
            </Text>
          </View>
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
          </View>
        </View>
      </Pressable>
    );
  };

  // ─── Loading state ──────────────────────────────────────────────────────────
  if (loadingContacts) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const isGroupChat = activeContact?.id === "group";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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

        {/* Active contact info */}
        {activeContact ? (
          <>
            <View
              style={[
                styles.headerAvatar,
                {
                  backgroundColor:
                    isGroupChat ? colors.primary : colors.accent,
                },
              ]}
            >
              <Text style={[styles.headerAvatarTxt, { fontFamily: "Inter_700Bold" }]}>
                {activeContact.initials}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.headerName, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                {activeContact.name}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Text style={[styles.headerSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  {isGroupChat ? "Company group" : "Private chat"}
                </Text>
                {isGroupChat && groupLocked && (
                  <View style={[styles.lockBadge, { backgroundColor: colors.warning + "20" }]}>
                    <Feather name="lock" size={9} color={colors.warning ?? "#f59e0b"} />
                    <Text style={[styles.lockBadgeTxt, { color: colors.warning ?? "#f59e0b", fontFamily: "Inter_600SemiBold" }]}>
                      Locked
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </>
        ) : (
          <Text style={[styles.headerName, { color: colors.foreground, fontFamily: "Inter_700Bold", flex: 1 }]}>
            Messages
          </Text>
        )}

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

          {/* Contact list toggle */}
          <Pressable
            onPress={() => setShowContacts((v) => !v)}
            style={({ pressed }) => [
              styles.iconBtn,
              {
                backgroundColor: showContacts ? colors.primary + "20" : colors.card,
                borderColor: showContacts ? colors.primary + "40" : colors.border,
                borderWidth: 1,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            hitSlop={4}
          >
            <Feather name="users" size={16} color={showContacts ? colors.primary : colors.mutedForeground} />
          </Pressable>
        </View>
      </View>

      {/* ── Body: sidebar + chat ── */}
      <View style={{ flex: 1, flexDirection: "row" }}>

        {/* Contact sidebar */}
        {showContacts && (
          <View
            style={[
              styles.sidebar,
              {
                backgroundColor: isDark ? "#0d0d10" : "#f8f8fa",
                borderRightColor: colors.border,
              },
            ]}
          >
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              {contacts.map((contact) => {
                const active = activeContact?.id === contact.id;
                const isGroup = contact.id === "group";
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
                      styles.contactRow,
                      {
                        backgroundColor: active
                          ? colors.primary + "18"
                          : pressed
                          ? colors.card
                          : "transparent",
                        borderLeftColor: active ? colors.primary : "transparent",
                      },
                    ]}
                  >
                    {/* Avatar */}
                    <View
                      style={[
                        styles.contactAvatar,
                        {
                          backgroundColor: isGroup
                            ? colors.primary
                            : colors.accent,
                        },
                      ]}
                    >
                      <Text style={[styles.contactAvatarTxt, { fontFamily: "Inter_700Bold" }]}>
                        {contact.initials}
                      </Text>
                    </View>

                    {/* Info */}
                    <View style={{ flex: 1 }}>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.contactName,
                          {
                            color: active ? colors.primary : colors.foreground,
                            fontFamily: active ? "Inter_700Bold" : "Inter_500Medium",
                          },
                        ]}
                      >
                        {contact.name}
                      </Text>
                      <Text style={[styles.contactSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                        {isGroup ? "Group" : "Employee"}
                      </Text>
                    </View>

                    {/* Status icons */}
                    <View style={{ alignItems: "flex-end", gap: 3 }}>
                      {isGroup && groupLocked && (
                        <Feather name="lock" size={11} color={colors.warning ?? "#f59e0b"} />
                      )}
                      {!isGroup && contact.is_blocked_from_group && (
                        <Feather name="slash" size={11} color={colors.danger} />
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* ── Chat Panel ── */}
        <View style={{ flex: 1 }}>
          {!activeContact ? (
            <View style={styles.center}>
              <Feather name="message-square" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                Select a contact
              </Text>
            </View>
          ) : loadingMessages ? (
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
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>
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
          </KeyboardAvoidingView>
        </View>
      </View>

      {/* ── Message Action Modal ── */}
      <Modal
        visible={showActionSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setShowActionSheet(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setShowActionSheet(false)}>
          <View style={[styles.actionSheet, { backgroundColor: isDark ? "#18181b" : "#fff", borderColor: colors.border }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

            {/* Message preview in sheet */}
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
              // Admin-only: block sender from group (only show for group chat messages from others)
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
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
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
  lockBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  lockBadgeTxt: { fontSize: 9 },
  // ── Sidebar ──
  sidebar: {
    width: 200,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 12,
    gap: 10,
    borderLeftWidth: 3,
  },
  contactAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  contactAvatarTxt: { color: "#fff", fontSize: 13 },
  contactName: { fontSize: 13 },
  contactSub: { fontSize: 11, marginTop: 1 },
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
