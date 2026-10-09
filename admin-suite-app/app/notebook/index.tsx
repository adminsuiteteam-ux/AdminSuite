import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Modal,
  RefreshControl,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useColors } from "@/hooks/useColors";
import { useToast } from "@/context/ToastContext";

interface Note {
  id: string;
  title: string;
  content: string;
  category: "work" | "meetings" | "reminders" | "ideas" | "finance";
  colorTag: string;
  isPinned: boolean;
  updatedAt: string;
}

const CATEGORIES: { id: Note["category"]; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { id: "work", label: "Work", icon: "briefcase" },
  { id: "meetings", label: "Meetings", icon: "users" },
  { id: "reminders", label: "Reminders", icon: "bell" },
  { id: "ideas", label: "Ideas", icon: "zap" },
  { id: "finance", label: "Finance", icon: "dollar-sign" },
];

const COLOR_TAGS = [
  { id: "#6366f1", label: "Indigo" },
  { id: "#10b981", label: "Emerald" },
  { id: "#f59e0b", label: "Amber" },
  { id: "#ef4444", label: "Rose" },
  { id: "#8b5cf6", label: "Purple" },
  { id: "#0ea5e9", label: "Sky" },
];

const STORAGE_KEY_NOTES = "@adminsuite_notebook_notes_v1";

const DEFAULT_SAMPLE_NOTES: Note[] = [
  {
    id: "note-1",
    title: "Weekly Leadership Standup Agenda",
    content: "1. Review branch performance reports.\n2. Finalize hardware inventory acquisitions.\n3. Approve pending leave requests before Friday EOD.\n4. Review client payment milestones.",
    category: "meetings",
    colorTag: "#6366f1",
    isPinned: true,
    updatedAt: "Today, 09:30 AM",
  },
  {
    id: "note-2",
    title: "Quarterly Financial Audit Checklist",
    content: "Reconcile vendor receipts against cash disbursements. Verify outstanding client invoices and review VAT deductions with the finance team.",
    category: "finance",
    colorTag: "#10b981",
    isPinned: true,
    updatedAt: "Yesterday",
  },
  {
    id: "note-3",
    title: "Employee Onboarding Standard Operating Procedure",
    content: "Ensure all new recruits complete KYC verification, configure company email accounts, and sign the digital workspace code of conduct.",
    category: "work",
    colorTag: "#8b5cf6",
    isPinned: false,
    updatedAt: "Oct 06, 2026",
  },
];

export default function NotebookScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  const [refreshing, setRefreshing] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  // Modal / Editor State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [inputTitle, setInputTitle] = useState("");
  const [inputContent, setInputContent] = useState("");
  const [inputCategory, setInputCategory] = useState<Note["category"]>("work");
  const [inputColorTag, setInputColorTag] = useState<string>("#6366f1");
  const [inputIsPinned, setInputIsPinned] = useState(false);

  // Load Notes
  const loadNotes = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_NOTES);
      if (stored) {
        setNotes(JSON.parse(stored));
      } else {
        setNotes(DEFAULT_SAMPLE_NOTES);
        await AsyncStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(DEFAULT_SAMPLE_NOTES));
      }
    } catch (e) {
      console.warn("Failed to load notebook notes:", e);
    }
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotes();
    setRefreshing(false);
  };

  const saveNotesToStorage = async (updated: Note[]) => {
    setNotes(updated);
    await AsyncStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(updated));
  };

  // Open Editor for New or Existing Note
  const handleOpenEditor = (note?: Note) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (note) {
      setEditingNoteId(note.id);
      setInputTitle(note.title);
      setInputContent(note.content);
      setInputCategory(note.category);
      setInputColorTag(note.colorTag);
      setInputIsPinned(note.isPinned);
    } else {
      setEditingNoteId(null);
      setInputTitle("");
      setInputContent("");
      setInputCategory("work");
      setInputColorTag("#6366f1");
      setInputIsPinned(false);
    }
    setModalVisible(true);
  };

  // Save Note Handler
  const handleSaveNote = async () => {
    if (!inputTitle.trim()) {
      Alert.alert("Missing Title", "Please provide a title for your note.");
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const timeLabel = "Today, " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    let updated: Note[];
    if (editingNoteId) {
      updated = notes.map((n) =>
        n.id === editingNoteId
          ? {
              ...n,
              title: inputTitle.trim(),
              content: inputContent.trim(),
              category: inputCategory,
              colorTag: inputColorTag,
              isPinned: inputIsPinned,
              updatedAt: timeLabel,
            }
          : n
      );
      showToast({ title: "Note Updated", message: "Your changes have been saved.", type: "success" });
    } else {
      const newNote: Note = {
        id: "note-" + Date.now(),
        title: inputTitle.trim(),
        content: inputContent.trim(),
        category: inputCategory,
        colorTag: inputColorTag,
        isPinned: inputIsPinned,
        updatedAt: timeLabel,
      };
      updated = [newNote, ...notes];
      showToast({ title: "Note Created", message: "New note saved to notebook.", type: "success" });
    }

    await saveNotesToStorage(updated);
    setModalVisible(false);
  };

  // Toggle Pin
  const handleTogglePin = async (noteId: string) => {
    Haptics.selectionAsync();
    const updated = notes.map((n) => (n.id === noteId ? { ...n, isPinned: !n.isPinned } : n));
    await saveNotesToStorage(updated);
  };

  // Delete Note
  const handleDeleteNote = (note: Note) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert("Delete Note", `Are you sure you want to delete "${note.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const updated = notes.filter((n) => n.id !== note.id);
          await saveNotesToStorage(updated);
          showToast({ title: "Note Deleted", message: "Note removed from notebook.", type: "info" });
        },
      },
    ]);
  };

  // Filtered & Sorted Notes
  const filteredNotes = useMemo(() => {
    const list = notes.filter((n) => {
      const matchesSearch =
        searchQuery === "" ||
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.content.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat = activeCategory === "all" || n.category === activeCategory;
      return matchesSearch && matchesCat;
    });

    // Pinned notes first
    return list.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
  }, [notes, searchQuery, activeCategory]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backBtn,
              { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="arrow-left" size={20} color={colors.text} />
          </Pressable>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Notebook</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
              Workplace notes, minutes & ideas
            </Text>
          </View>
        </View>

        <Pressable
          onPress={() => handleOpenEditor()}
          style={({ pressed }) => [
            styles.createBtn,
            { backgroundColor: colors.accent, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Feather name="plus" size={18} color="#fff" />
          <Text style={styles.createBtnText}>New Note</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar */}
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={18} color={colors.textMuted} />
          <TextInput
            placeholder="Search notes, minutes or topics..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: colors.text }]}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
              <Feather name="x" size={16} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        {/* Category Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setActiveCategory("all");
            }}
            style={[
              styles.filterChip,
              {
                backgroundColor: activeCategory === "all" ? colors.accent : colors.card,
                borderColor: activeCategory === "all" ? colors.accent : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.filterChipText,
                { color: activeCategory === "all" ? "#fff" : colors.textMuted, fontFamily: activeCategory === "all" ? "Inter_700Bold" : "Inter_500Medium" },
              ]}
            >
              All Notes ({notes.length})
            </Text>
          </Pressable>

          {CATEGORIES.map((cat) => {
            const active = activeCategory === cat.id;
            const count = notes.filter((n) => n.category === cat.id).length;
            return (
              <Pressable
                key={cat.id}
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveCategory(cat.id);
                }}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? colors.accent : colors.card,
                    borderColor: active ? colors.accent : colors.border,
                  },
                ]}
              >
                <Feather name={cat.icon} size={12} color={active ? "#fff" : colors.textMuted} />
                <Text
                  style={[
                    styles.filterChipText,
                    { color: active ? "#fff" : colors.textMuted, fontFamily: active ? "Inter_700Bold" : "Inter_500Medium" },
                  ]}
                >
                  {cat.label} ({count})
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Notes Grid / List */}
        {filteredNotes.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.emptyIconCircle, { backgroundColor: colors.cardSelected }]}>
              <Feather name="book-open" size={32} color={colors.accent} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Notes Found</Text>
            <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
              {searchQuery || activeCategory !== "all"
                ? "No notes found matching your filters. Try clearing filters."
                : "You have no notes yet. Tap 'New Note' to start jotting thoughts down."}
            </Text>
            <Pressable
              onPress={() => handleOpenEditor()}
              style={[styles.emptyActionBtn, { backgroundColor: colors.accent }]}
            >
              <Feather name="plus" size={16} color="#fff" />
              <Text style={styles.emptyActionBtnText}>Create Note</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.notesList}>
            {filteredNotes.map((note) => {
              const catObj = CATEGORIES.find((c) => c.id === note.category) || CATEGORIES[0];

              return (
                <Pressable
                  key={note.id}
                  onPress={() => handleOpenEditor(note)}
                  style={({ pressed }) => [
                    styles.noteCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: note.isPinned ? note.colorTag : colors.border,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  {/* Accent tag strip */}
                  <View style={[styles.noteAccentBar, { backgroundColor: note.colorTag }]} />

                  <View style={styles.noteContentWrap}>
                    <View style={styles.noteHeader}>
                      <View style={styles.noteCategoryPill}>
                        <Feather name={catObj.icon} size={11} color={note.colorTag} />
                        <Text style={[styles.noteCategoryText, { color: note.colorTag }]}>
                          {catObj.label}
                        </Text>
                      </View>

                      <View style={styles.noteActions}>
                        <Pressable onPress={() => handleTogglePin(note.id)} hitSlop={10}>
                          <Feather
                            name="bookmark"
                            size={16}
                            color={note.isPinned ? note.colorTag : colors.textMuted}
                          />
                        </Pressable>
                        <Pressable onPress={() => handleDeleteNote(note)} hitSlop={10}>
                          <Feather name="trash-2" size={16} color={colors.textMuted} />
                        </Pressable>
                      </View>
                    </View>

                    <Text style={[styles.noteTitle, { color: colors.text }]}>{note.title}</Text>
                    {note.content ? (
                      <Text style={[styles.noteSnippet, { color: colors.textMuted }]} numberOfLines={4}>
                        {note.content}
                      </Text>
                    ) : null}

                    <View style={[styles.noteFooter, { borderTopColor: colors.border }]}>
                      <Text style={[styles.noteTimestamp, { color: colors.textMuted }]}>
                        {note.updatedAt}
                      </Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Feather name="edit-2" size={12} color={colors.accent} />
                        <Text style={{ fontSize: 11, color: colors.accent, fontFamily: "Inter_600SemiBold" }}>
                          Edit
                        </Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Note Editor Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {editingNoteId ? "Edit Note" : "Create New Note"}
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                  Organize workplace thoughts & references
                </Text>
              </View>
              <Pressable
                onPress={() => setModalVisible(false)}
                style={[styles.modalCloseBtn, { backgroundColor: colors.border }]}
              >
                <Feather name="x" size={18} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
              {/* Title */}
              <Text style={[styles.inputLabel, { color: colors.text }]}>Title *</Text>
              <TextInput
                placeholder="Note title or heading..."
                placeholderTextColor={colors.textMuted}
                value={inputTitle}
                onChangeText={setInputTitle}
                style={[styles.modalInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              />

              {/* Category Picker */}
              <Text style={[styles.inputLabel, { color: colors.text }]}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryPicker}>
                {CATEGORIES.map((cat) => {
                  const isSelected = inputCategory === cat.id;
                  return (
                    <Pressable
                      key={cat.id}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setInputCategory(cat.id);
                      }}
                      style={[
                        styles.catChoiceBtn,
                        {
                          backgroundColor: isSelected ? colors.accent : colors.background,
                          borderColor: isSelected ? colors.accent : colors.border,
                        },
                      ]}
                    >
                      <Feather name={cat.icon} size={12} color={isSelected ? "#fff" : colors.text} />
                      <Text
                        style={[
                          styles.catChoiceText,
                          { color: isSelected ? "#fff" : colors.text, fontFamily: isSelected ? "Inter_700Bold" : "Inter_500Medium" },
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Color Tag Picker */}
              <Text style={[styles.inputLabel, { color: colors.text }]}>Color Theme</Text>
              <View style={styles.colorTagRow}>
                {COLOR_TAGS.map((c) => {
                  const isSelected = inputColorTag === c.id;
                  return (
                    <Pressable
                      key={c.id}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setInputColorTag(c.id);
                      }}
                      style={[
                        styles.colorTagCircle,
                        {
                          backgroundColor: c.id,
                          borderColor: isSelected ? "#fff" : "transparent",
                          borderWidth: isSelected ? 3 : 0,
                        },
                      ]}
                    />
                  );
                })}
              </View>

              {/* Pin to top Toggle */}
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setInputIsPinned(!inputIsPinned);
                }}
                style={[styles.pinToggleRow, { backgroundColor: colors.background, borderColor: colors.border }]}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Feather name="bookmark" size={16} color={inputIsPinned ? inputColorTag : colors.textMuted} />
                  <Text style={[styles.pinToggleText, { color: colors.text }]}>Pin to Top</Text>
                </View>
                <Feather
                  name={inputIsPinned ? "check-circle" : "circle"}
                  size={18}
                  color={inputIsPinned ? inputColorTag : colors.textMuted}
                />
              </Pressable>

              {/* Content Textarea */}
              <Text style={[styles.inputLabel, { color: colors.text }]}>Content / Details</Text>
              <TextInput
                placeholder="Write your notes, action items, meeting minutes..."
                placeholderTextColor={colors.textMuted}
                value={inputContent}
                onChangeText={setInputContent}
                multiline
                numberOfLines={6}
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.text,
                    height: 120,
                    textAlignVertical: "top",
                  },
                ]}
              />
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalActionRow}>
              <Pressable
                onPress={() => setModalVisible(false)}
                style={[styles.cancelBtn, { borderColor: colors.border }]}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textMuted }]}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={handleSaveNote}
                style={[styles.submitBtn, { backgroundColor: colors.accent }]}
              >
                <Feather name="check" size={16} color="#fff" />
                <Text style={styles.submitBtnText}>Save Note</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  createBtnText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    padding: 0,
  },
  filterScroll: {
    flexDirection: "row",
    gap: 8,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
  },
  notesList: {
    gap: 12,
  },
  noteCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    flexDirection: "row",
  },
  noteAccentBar: {
    width: 6,
  },
  noteContentWrap: {
    flex: 1,
    padding: 14,
    gap: 8,
  },
  noteHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  noteCategoryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  noteCategoryText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  noteActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  noteTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  noteSnippet: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  noteFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    marginTop: 4,
  },
  noteTimestamp: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  emptyCard: {
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    gap: 12,
    marginTop: 20,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  emptyDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 18,
  },
  emptyActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  emptyActionBtnText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
    gap: 12,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  modalSubtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    marginTop: 10,
    marginBottom: 4,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  categoryPicker: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
  },
  catChoiceBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  catChoiceText: {
    fontSize: 12,
  },
  colorTagRow: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 4,
  },
  colorTagCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  pinToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
  },
  pinToggleText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  modalActionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  submitBtn: {
    flex: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
