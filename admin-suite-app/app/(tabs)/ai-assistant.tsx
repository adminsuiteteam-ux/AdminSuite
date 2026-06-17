/**
 * AdminSuite AI Assistant Screen
 * Full-screen chat interface powered by Google Gemini 2.0 Flash.
 * Users can ask anything about their business in plain English.
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import { aiService } from '@/services/aiService';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: Date;
  loading?: boolean;
}

// ─── Suggested prompts shown when the chat is empty ─────────────────────────

const SUGGESTIONS = [
  { icon: 'trending-up', label: 'Finance overview', prompt: 'Give me a summary of my current financial health and any concerns.' },
  { icon: 'users', label: 'Team status', prompt: 'Which employees need my attention right now?' },
  { icon: 'briefcase', label: 'Client risks', prompt: 'Which clients are at risk of churning or have overdue payments?' },
  { icon: 'layers', label: 'Active projects', prompt: 'Show me all active projects and their current progress.' },
  { icon: 'dollar-sign', label: 'Budget burn', prompt: 'Which of my budget categories are close to being overspent?' },
  { icon: 'alert-circle', label: 'Key alerts', prompt: 'What are the most important things I should act on today?' },
];

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function AIAssistantScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: trimmed,
      timestamp: new Date(),
    };
    const placeholderId = `ai-${Date.now()}`;
    const placeholderMsg: Message = {
      id: placeholderId,
      role: 'ai',
      text: '',
      timestamp: new Date(),
      loading: true,
    };

    setMessages(prev => [...prev, userMsg, placeholderMsg]);
    setInput('');
    setLoading(true);
    scrollToBottom();

    try {
      const res = await aiService.chat(trimmed);
      const reply = res.data.reply ?? 'Sorry, I couldn\'t get an answer. Please try again.';
      setMessages(prev =>
        prev.map(m => m.id === placeholderId ? { ...m, text: reply, loading: false } : m)
      );
    } catch {
      setMessages(prev =>
        prev.map(m =>
          m.id === placeholderId
            ? { ...m, text: 'AI is temporarily unavailable. Please check your connection and try again.', loading: false }
            : m
        )
      );
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  }, [loading, scrollToBottom]);

  const handleSuggestion = useCallback((prompt: string) => {
    sendMessage(prompt);
  }, [sendMessage]);

  const handleClear = useCallback(() => {
    setMessages([]);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <LinearGradient
          colors={['#1e1b4b', '#312e81']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.aiAvatarWrap}>
              <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.aiAvatar}>
                <Feather name="cpu" size={20} color="#fff" />
              </LinearGradient>
              <View style={styles.onlineDot} />
            </View>
            <View>
              <Text style={styles.headerTitle}>AdminSuite AI</Text>
              <Text style={styles.headerSub}>Powered by Gemini 2.0 Flash · Always online</Text>
            </View>
          </View>
          {messages.length > 0 && (
            <Pressable onPress={handleClear} style={styles.clearBtn}>
              <Feather name="trash-2" size={16} color="rgba(255,255,255,0.55)" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Chat List */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={item => item.id}
          contentContainerStyle={[
            styles.listContent,
            messages.length === 0 && styles.listEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState colors={colors} onSuggestion={handleSuggestion} />
          }
          renderItem={({ item }) => (
            <MessageBubble message={item} colors={colors} />
          )}
        />

        {/* Input Bar */}
        <View style={[
          styles.inputBar,
          {
            paddingBottom: Math.max(insets.bottom, 16),
            borderTopColor: colors.border,
            backgroundColor: colors.background,
          }
        ]}>
          <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              ref={inputRef}
              style={[styles.textInput, { color: colors.text }]}
              placeholder="Ask anything about your business…"
              placeholderTextColor={colors.muted}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={() => sendMessage(input)}
            />
            <Pressable
              onPress={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              style={({ pressed }) => [
                styles.sendBtn,
                {
                  backgroundColor: input.trim() && !loading ? colors.primary : colors.border,
                  opacity: pressed ? 0.85 : 1,
                }
              ]}
            >
              {loading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Feather name="send" size={16} color="#fff" />
              }
            </Pressable>
          </View>
          <Text style={[styles.disclaimer, { color: colors.muted }]}>
            AI answers are based on your real business data. Always verify important decisions.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Empty State with Suggestions ────────────────────────────────────────────

function EmptyState({ colors, onSuggestion }: { colors: any; onSuggestion: (p: string) => void }) {
  return (
    <View style={styles.emptyWrap}>
      {/* Hero */}
      <LinearGradient colors={['#6366f122', '#8b5cf611']} style={styles.emptyHero}>
        <View style={styles.emptyIconWrap}>
          <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.emptyIcon}>
            <Feather name="cpu" size={32} color="#fff" />
          </LinearGradient>
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          Hi! I'm your AI Business Assistant
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
          Ask me anything about your employees, clients, finances, or projects.{'\n'}
          I read your real data and answer in plain English.
        </Text>
      </LinearGradient>

      {/* Suggestion chips */}
      <Text style={[styles.suggestionsLabel, { color: colors.muted }]}>Try asking:</Text>
      <View style={styles.suggestionsGrid}>
        {SUGGESTIONS.map((s) => (
          <Pressable
            key={s.label}
            onPress={() => onSuggestion(s.prompt)}
            style={({ pressed }) => [
              styles.suggestionChip,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: pressed ? 0.75 : 1,
              }
            ]}
          >
            <Feather name={s.icon as any} size={14} color={colors.primary} />
            <Text style={[styles.suggestionText, { color: colors.text }]}>{s.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({ message, colors }: { message: Message; colors: any }) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <View style={[styles.bubbleRow, styles.bubbleRowUser]}>
        <LinearGradient
          colors={[colors.primary, '#8b5cf6']}
          style={[styles.bubble, styles.bubbleUser]}
        >
          <Text style={styles.bubbleTextUser}>{message.text}</Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={[styles.bubbleRow, styles.bubbleRowAI]}>
      <View style={styles.aiAvatarSmall}>
        <LinearGradient colors={['#6366f1', '#8b5cf6']} style={StyleSheet.absoluteFill} />
        <Feather name="cpu" size={12} color="#fff" />
      </View>
      <View style={[styles.bubble, styles.bubbleAI, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {message.loading ? (
          <View style={styles.typingRow}>
            <TypingDot delay={0} colors={colors} />
            <TypingDot delay={200} colors={colors} />
            <TypingDot delay={400} colors={colors} />
          </View>
        ) : (
          <Text style={[styles.bubbleTextAI, { color: colors.text }]}>{message.text}</Text>
        )}
      </View>
    </View>
  );
}

// ─── Typing Indicator Dots ────────────────────────────────────────────────────

function TypingDot({ delay, colors }: { delay: number; colors: any }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  React.useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 400, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={[styles.typingDot, { backgroundColor: colors.primary, opacity }]}
    />
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: { paddingBottom: 16, overflow: 'hidden' },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  aiAvatarWrap: { position: 'relative' },
  aiAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22c55e',
    borderWidth: 1.5,
    borderColor: '#1e1b4b',
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
  headerSub: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.55)',
    marginTop: 1,
  },
  clearBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  // List
  listContent: { paddingHorizontal: 16, paddingVertical: 16, gap: 12 },
  listEmpty: { flex: 1 },

  // Empty state
  emptyWrap: { flex: 1, gap: 20, paddingTop: 8 },
  emptyHero: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  emptyIconWrap: { marginBottom: 4 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 20,
  },
  suggestionsLabel: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingLeft: 4,
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 99,
    borderWidth: 1,
  },
  suggestionText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },

  // Bubbles
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  bubbleRowUser: { justifyContent: 'flex-end' },
  bubbleRowAI: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '80%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: { borderBottomRightRadius: 4 },
  bubbleAI: {
    borderWidth: 1,
    borderBottomLeftRadius: 4,
  },
  bubbleTextUser: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
  },
  bubbleTextAI: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
  },
  aiAvatarSmall: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },

  // Typing
  typingRow: { flexDirection: 'row', gap: 5, paddingVertical: 4, paddingHorizontal: 2 },
  typingDot: { width: 7, height: 7, borderRadius: 4 },

  // Input bar
  inputBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    borderWidth: 1,
    borderRadius: 20,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    minHeight: 48,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    maxHeight: 120,
    paddingTop: 8,
    paddingBottom: 8,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  disclaimer: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 14,
  },
});
