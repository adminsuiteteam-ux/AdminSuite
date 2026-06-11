import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  LayoutAnimation,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const FAQS = [
  {
    q: "How do I add and manage employees?",
    a: "Go to the 'Employees' tab or click 'Add Employee' on the Dashboard quick actions. Fill in the employee's name, role, department, and salary. The system will automatically create unique credentials and generate a temporary password. You can share this password with them to log in.",
    category: "employees",
  },
  {
    q: "How does the custom group chat work?",
    a: "As an Admin, click the floating '+' button on the Messages page. Give your group a name, pick a profile picture, and select members from your team directory. Tap on a group's header profile photo to manage group admins, add new members, edit names, or toggle chat lock so only admins can post.",
    category: "chat",
  },
  {
    q: "Where is my financial history stored?",
    a: "All financial income and expenses are stored securely on the Django database. You can search, filter, and review details in the 'Finance' tab, or export your financial reports to CSV or PDF via the 'Export Data' action in settings.",
    category: "finance",
  },
  {
    q: "Can I lock group channels?",
    a: "Yes. Admins can lock the general Team Chat or any custom group. Go to the group's header profile settings, and toggle 'Only Admins Can Chat'. Non-admin members will see a banner and will be restricted from posting messages.",
    category: "chat",
  },
  {
    q: "How do I configure biometrics?",
    a: "Navigate to settings, and tap the switch next to 'Biometric Login'. You will be prompted to authenticate using Face ID or Touch ID. Once enabled, the app will request biometric auth on relaunch for security.",
    category: "security",
  },
];

const GUIDES = [
  { id: "1", title: "Complete organization details", desc: "Define business hours, working days, and logo under More > Organisation." },
  { id: "2", title: "Add your first employee", desc: "Generate credentials for your team to let them view their dashboards and tasks." },
  { id: "3", title: "Create a chat group", desc: "Set up department channels (e.g. Sales, Dev) to start group discussion." },
  { id: "4", title: "Define budget categories", desc: "Allocate monthly spending limits in the Finance tab to monitor budgets." },
];

export default function HelpSupportScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isDark = colors.isDark;

  const [search, setSearch] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState("all");

  const toggleFaq = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  const filteredFaqs = FAQS.filter((faq) => {
    const matchesSearch =
      faq.q.toLowerCase().includes(search.toLowerCase()) ||
      faq.a.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === "all" || faq.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const openMap = () => {
    // Office coordinates (San Francisco)
    const lat = 37.7749;
    const lng = -122.4194;
    const label = encodeURIComponent("Admin Suite HQ");
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(${label})`,
      default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    });
    Linking.openURL(url).catch(() => {
      // Fallback
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.iconBtn,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
          hitSlop={8}
        >
          <Feather name="chevron-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          Help & Support
        </Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── App Info Banner ── */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 12 }]}>
          <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
            <View style={[styles.avatar, { backgroundColor: colors.primary + "1A" }]}>
              <Feather name="info" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 16 }}>
                Admin Suite
              </Text>
              <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 2 }}>
                Version 2.0.0 · Unified Corporate Workspace
              </Text>
            </View>
          </View>
          <Text style={{ color: colors.mutedForeground, fontSize: 13, lineHeight: 20, marginTop: 12, fontFamily: "Inter_400Regular" }}>
            Admin Suite is a fully featured glassmorphic enterprise portal. It syncs real-time financial tracking, employee listings, tasks boards, group leaves, and team conversations into a single, volumetric workspace.
          </Text>
        </View>

        {/* ── Quick Guide Checklist ── */}
        <View style={{ marginTop: 24 }}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            Getting Started Guide
          </Text>
          <View style={{ gap: 10, marginTop: 12 }}>
            {GUIDES.map((g) => (
              <View
                key={g.id}
                style={[
                  styles.guideCard,
                  { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius - 4 },
                ]}
              >
                <View style={[styles.guideStep, { backgroundColor: colors.primary }]}>
                  <Text style={{ color: colors.primaryForeground, fontFamily: "Inter_700Bold", fontSize: 11 }}>
                    {g.id}
                  </Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
                    {g.title}
                  </Text>
                  <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 16 }}>
                    {g.desc}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── FAQ Search & Accordions ── */}
        <View style={{ marginTop: 24 }}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            Frequently Asked Questions
          </Text>

          {/* Search bar */}
          <View style={[styles.searchBar, { backgroundColor: colors.muted, borderColor: colors.border, marginTop: 12 }]}>
            <Feather name="search" size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search help topics..."
              placeholderTextColor={colors.mutedForeground + "80"}
              style={{ flex: 1, color: colors.foreground, fontFamily: "Inter_400Regular", fontSize: 14 }}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch("")}>
                <Feather name="x" size={16} color={colors.mutedForeground} />
              </Pressable>
            )}
          </View>

          {/* Category Filter Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsScroll}>
            {[
              { id: "all", label: "All Topics" },
              { id: "employees", label: "Employees" },
              { id: "chat", label: "Chat Groups" },
              { id: "finance", label: "Finance" },
              { id: "security", label: "Security" },
            ].map((cat) => {
              const active = activeCategory === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => setActiveCategory(cat.id)}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: active ? colors.primary : colors.card,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: active ? colors.primaryForeground : colors.foreground,
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 12,
                    }}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* FAQ Accordions */}
          <View style={{ gap: 8, marginTop: 12 }}>
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map((faq, i) => {
                const expanded = expandedFaq === i;
                return (
                  <View
                    key={faq.q}
                    style={[
                      styles.faqCard,
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    <Pressable onPress={() => toggleFaq(i)} style={styles.faqHeader}>
                      <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 14, flex: 1, paddingRight: 8 }}>
                        {faq.q}
                      </Text>
                      <Feather
                        name={expanded ? "chevron-up" : "chevron-down"}
                        size={16}
                        color={colors.mutedForeground}
                      />
                    </Pressable>
                    {expanded && (
                      <View style={[styles.faqBody, { borderTopColor: colors.border }]}>
                        <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 20 }}>
                          {faq.a}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })
            ) : (
              <View style={{ padding: 20, alignItems: "center" }}>
                <Feather name="help-circle" size={32} color={colors.mutedForeground} style={{ marginBottom: 8 }} />
                <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 14 }}>
                  No matches found for your query.
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Mock Location & Interactive Map Card ── */}
        <View style={{ marginTop: 28 }}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            Our HQ Location
          </Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 12, padding: 0 }]}>
            
            {/* Map Canvas Mockup */}
            <View style={[styles.mapContainer, { backgroundColor: isDark ? "#09090b" : "#e5e7eb" }]}>
              {/* Styled Grid Matrix to simulate maps terrain */}
              <View style={styles.mapGridLines} />
              
              {/* Styled Roads Vector Simulators */}
              <View style={[styles.mapRoad, { top: "40%", height: 10, width: "100%" }]} />
              <View style={[styles.mapRoad, { left: "30%", width: 12, height: "100%" }]} />
              
              {/* Location Marker Pin */}
              <View style={styles.markerContainer}>
                <View style={[styles.markerPulse, { backgroundColor: colors.accent }]} />
                <View style={[styles.markerDot, { backgroundColor: colors.accent }]}>
                  <Feather name="map-pin" size={14} color="#fff" />
                </View>
              </View>

              {/* Glass search float on Map */}
              <View style={[styles.mapFloatSearch, { backgroundColor: isDark ? "rgba(24,24,27,0.8)" : "rgba(255,255,255,0.85)" }]}>
                <Feather name="map" size={12} color={colors.foreground} />
                <Text style={{ color: colors.foreground, fontSize: 11, fontFamily: "Inter_600SemiBold" }}>
                  100 Pine St, San Francisco, CA
                </Text>
              </View>
            </View>

            {/* Map Info Details */}
            <View style={{ padding: 16 }}>
              <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 15 }}>
                Admin Suite Headquarters
              </Text>
              <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 4 }}>
                100 Pine Street, 15th Floor, San Francisco, CA 94111
              </Text>
              
              <Pressable
                onPress={openMap}
                style={({ pressed }) => [
                  styles.mapBtn,
                  {
                    backgroundColor: colors.primary,
                    opacity: pressed ? 0.9 : 1,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  },
                ]}
              >
                <Feather name="navigation" size={16} color={colors.primaryForeground} />
                <Text style={{ color: colors.primaryForeground, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
                  Open in Device Maps
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* ── Contact Details card ── */}
        <View style={{ marginTop: 24 }}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            Still need help?
          </Text>
          <View style={[styles.contactCard, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 12 }]}>
            <View style={[styles.contactItem, { borderRightWidth: 1, borderRightColor: colors.border }]}>
              <View style={[styles.contactIconWrap, { backgroundColor: "#3b82f61A" }]}>
                <Feather name="mail" size={18} color="#3b82f6" />
              </View>
              <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 13, marginTop: 10 }}>
                Email Support
              </Text>
              <Text
                onPress={() => Linking.openURL("mailto:support@adminsuite.app")}
                style={{ color: colors.accent, fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 4, textDecorationLine: "underline" }}
              >
                support@adminsuite.app
              </Text>
            </View>
            
            <View style={styles.contactItem}>
              <View style={[styles.contactIconWrap, { backgroundColor: "#10b9811A" }]}>
                <Feather name="phone" size={18} color="#10b981" />
              </View>
              <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 13, marginTop: 10 }}>
                Phone Support
              </Text>
              <Text
                onPress={() => Linking.openURL("tel:+18005550199")}
                style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 4 }}
              >
                +1 (800) 555-0199
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  title: { fontSize: 18 },
  sectionTitle: { fontSize: 15, paddingHorizontal: 4 },
  card: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  guideCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    gap: 12,
  },
  guideStep: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
  },
  pillsScroll: {
    paddingVertical: 12,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
  },
  faqCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  faqHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  faqBody: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  // Map styles
  mapContainer: {
    height: 180,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  mapGridLines: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.15,
    borderWidth: 1.5,
    borderColor: "#a1a1aa",
    borderStyle: "dashed",
  },
  mapRoad: {
    position: "absolute",
    backgroundColor: "rgba(255,255,255,0.45)",
    opacity: 0.7,
  },
  markerContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  markerPulse: {
    position: "absolute",
    width: 38,
    height: 38,
    borderRadius: 19,
    opacity: 0.3,
  },
  markerDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  mapFloatSearch: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  mapBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: 12,
    gap: 8,
    marginTop: 16,
  },
  // Contact section
  contactCard: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 20,
    overflow: "hidden",
  },
  contactItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 20,
  },
  contactIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
