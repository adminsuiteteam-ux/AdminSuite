import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState, useRef } from "react";
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { supabase } from "@/services/supabase";

type Message = {
  id: string;
  text: string;
  sender: string;
  initials: string;
  timestamp: string;
};

export default function EmployeeChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [status, setStatus] = useState("Connecting...");

  const scrollViewRef = useRef<ScrollView>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    // Generate some mock history messages to seed the chat room
    const mockHistory: Message[] = [
      {
        id: "1",
        text: "Hi everyone! Welcome to the new Admin Suite chat room.",
        sender: "System Bot",
        initials: "SB",
        timestamp: "09:00 AM",
      },
      {
        id: "2",
        text: "Great to be here! Let me know if you need help on any assigned tasks.",
        sender: "Manager",
        initials: "MG",
        timestamp: "09:05 AM",
      },
    ];
    setMessages(mockHistory);

    // Subscribe to Supabase broadcast channel
    const companyChannelName = `company-${user?.business_name ? user.business_name.replace(/\s+/g, '-').toLowerCase() : 'general'}`;
    const channel = supabase.channel(companyChannelName, {
      config: {
        broadcast: { self: true },
      },
    });

    channel
      .on("broadcast", { event: "message" }, ({ payload }) => {
        setMessages((prev) => [...prev, payload]);
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setStatus("Connected");
        } else {
          setStatus("Disconnected");
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleSendMessage = () => {
    if (!inputText.trim() || !channelRef.current) return;

    const timestamp = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const payload: Message = {
      id: Math.random().toString(),
      text: inputText.trim(),
      sender: user?.name || user?.email || "Employee",
      initials: user?.initials || "EM",
      timestamp,
    };

    // Broadcast the message to all clients in the channel
    channelRef.current.send({
      type: "broadcast",
      event: "message",
      payload,
    });

    setInputText("");
    
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  };

  const keyboardOffset = Platform.OS === "ios" ? 84 : 0;
  const isDark = colors.isDark;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={keyboardOffset}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      {/* Top Bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 16, borderBottomColor: colors.border }]}>
        <View style={styles.channelInfo}>
          <View style={[styles.avatarCircle, { backgroundColor: colors.primary }]}>
            <Text style={[styles.avatarText, { fontFamily: "Inter_700Bold" }]}>#</Text>
          </View>
          <View>
            <Text style={[styles.channelName, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              Team General Chat
            </Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: status === "Connected" ? colors.success : colors.danger }]} />
              <Text style={[styles.statusText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                {status}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Messages List */}
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: 16 }}>
          {messages.map((m) => {
            const isMe = m.sender === (user?.name || user?.email);
            return (
              <View key={m.id} style={[styles.msgWrap, isMe ? styles.msgRight : styles.msgLeft]}>
                {!isMe && (
                  <View style={[styles.senderAvatar, { backgroundColor: isDark ? "#3f3f46" : "#e4e4e7" }]}>
                    <Text style={[styles.senderInitials, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>
                      {m.initials}
                    </Text>
                  </View>
                )}
                <View style={{ gap: 4, maxWidth: "75%" }}>
                  {!isMe && (
                    <Text style={[styles.senderName, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
                      {m.sender}
                    </Text>
                  )}
                  <View
                    style={[
                      styles.bubble,
                      {
                        backgroundColor: isMe ? colors.primary : isDark ? colors.card : "#e4e4e7",
                        borderTopRightRadius: isMe ? 4 : 16,
                        borderTopLeftRadius: isMe ? 16 : 4,
                      },
                    ]}
                  >
                    <Text style={[styles.msgText, { color: isMe ? colors.primaryForeground : colors.text, fontFamily: "Inter_500Medium" }]}>
                      {m.text}
                    </Text>
                  </View>
                  <Text style={[styles.msgTime, { color: colors.mutedForeground, alignSelf: isMe ? "flex-end" : "flex-start", fontFamily: "Inter_400Regular" }]}>
                    {m.timestamp}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Message Input Box */}
      <View style={[styles.inputBox, { paddingBottom: Math.max(insets.bottom, 12), borderTopColor: colors.border }]}>
        <View style={[styles.inputContainer, { backgroundColor: colors.inputGlass, borderColor: colors.border }]}>
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message to company..."
            placeholderTextColor={colors.mutedForeground}
            style={[styles.textInput, { color: colors.text, fontFamily: "Inter_500Medium" }]}
          />
          <Pressable
            onPress={handleSendMessage}
            style={({ pressed }) => [
              styles.sendBtn,
              {
                backgroundColor: colors.primary,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Feather name="send" size={16} color={colors.primaryForeground} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  topBar: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  channelInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 20,
  },
  channelName: {
    fontSize: 16,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexGrow: 1,
    justifyContent: "flex-end",
  },
  msgWrap: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  msgLeft: {
    justifyContent: "flex-start",
  },
  msgRight: {
    justifyContent: "flex-end",
  },
  senderAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  senderInitials: {
    fontSize: 12,
  },
  senderName: {
    fontSize: 11,
    marginLeft: 4,
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  msgText: {
    fontSize: 14,
    lineHeight: 20,
  },
  msgTime: {
    fontSize: 10,
    marginTop: 2,
    marginHorizontal: 4,
  },
  inputBox: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 6,
    height: 50,
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
});
