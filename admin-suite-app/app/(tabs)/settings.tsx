import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { employees, clients } = useData();

  const tabBarPad = (Platform.OS === "web" ? 84 : 80) + 24;

  const handleExport = async () => {
    try {
      if (Platform.OS === "web") {
        Alert.alert("Export is only supported on mobile right now.");
        return;
      }
      
      const csvHeader = "Type,Name,Email,Phone,Role_or_Status,Location\n";
      const employeesCsv = employees.map(e => `Employee,${e.name},${e.email},${e.phone},${e.role},${e.location}`).join("\n");
      const clientsCsv = clients.map(c => `Client,${c.company} (${c.contact}),${c.email},,${c.status},${c.location}`).join("\n");
      const csvContent = csvHeader + employeesCsv + "\n" + clientsCsv;
      
      const file = new File(Paths.document, "admin_suite_export.csv");
      file.write(csvContent);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: "text/csv",
          dialogTitle: "Export Admin Data",
          UTI: "public.comma-separated-values-text"
        });
      } else {
        Alert.alert("Sharing is not available on your device");
      }
    } catch (err) {
      console.log(err);
      Alert.alert("Failed to export data");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingBottom: tabBarPad,
          paddingTop: insets.top + 12,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 16 }}>
          <Text
            style={[
              styles.title,
              { color: colors.foreground, fontFamily: "Inter_700Bold" },
            ]}
          >
            Profile
          </Text>

          <View style={styles.profileCard}>
            <LinearGradient
              colors={["#000000", "#1e3a8a", "#4f46e5"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.profileHeaderRow}>
              <View style={[styles.avatarWrap, { backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" }]}>
                <Text style={{ color: "#fff", fontSize: 24, fontFamily: "Inter_700Bold" }}>
                  {user?.initials || "US"}
                </Text>
              </View>
              <Pressable
                style={[styles.editBtn, { backgroundColor: "rgba(255,255,255,0.15)" }]}
                onPress={() => router.push("/settings")}
              >
                <Feather name="edit-2" size={14} color="#fff" />
                <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 12 }}>Edit</Text>
              </Pressable>
            </View>

            <View style={{ marginTop: 12 }}>
              <Text style={[styles.profileName, { fontFamily: "Inter_700Bold" }]}>
                {user?.name ?? "Admin"}
              </Text>
              <View style={styles.profileChip}>
                <Feather name="shield" size={11} color="#fff" />
                <Text style={[styles.chipText, { fontFamily: "Inter_600SemiBold" }]}>
                  {(user?.role ?? "admin").toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.contactWrap}>
              <View style={styles.contactRow}>
                <Feather name="mail" size={14} color="rgba(255,255,255,0.6)" />
                <Text style={[styles.contactText, { fontFamily: "Inter_500Medium" }]}>
                  {user?.email || "No email provided"}
                </Text>
              </View>
            </View>
          </View>

          <Group title="Workspace">
            <Row
              icon="briefcase"
              label="All clients"
              hint={`${clients.length} companies`}
              onPress={() => router.push("/clients")}
            />
            <Row icon="sliders" label="Custom fields" hint="Manage extras" onPress={() => Alert.alert("Custom fields settings coming soon!")} />
            <Row icon="users" label="Team & roles" hint="Admin only" onPress={() => router.push("/employees")} />
            <Row icon="download" label="Export data" hint="CSV / PDF" onPress={handleExport} />
          </Group>

          <Group title="System">
            <Row
              icon="settings"
              label="App Settings"
              hint="Preferences & Account"
              onPress={() => router.push("/settings" as any)}
            />
            <Row
              icon="log-out"
              label="Log Out"
              hint="Sign out of your account"
              onPress={() => {
                Alert.alert("Sign Out", "Are you sure you want to log out?", [
                  { text: "Cancel", style: "cancel" },
                  { text: "Log Out", style: "destructive", onPress: async () => {
                    await logout();
                    router.replace("/(auth)/login");
                  }},
                ]);
              }}
            />
          </Group>

        </View>
      </ScrollView>
    </View>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={{ marginTop: 22 }}>
      <Text
        style={[
          styles.groupTitle,
          { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" },
        ]}
      >
        {title.toUpperCase()}
      </Text>
      <View style={{ gap: 8, marginTop: 8 }}>{children}</View>
    </View>
  );
}

function Row({ icon, label, hint, onPress }: { icon: keyof typeof Feather.glyphMap; label: string; hint?: string; onPress?: () => void }) {
  const colors = useColors();
  return (
    <Pressable onPress={onPress}>
      <View
        style={[
          styles.row,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderRadius: colors.radius,
          },
        ]}
      >
        <View
          style={[
            styles.rowIcon,
            { backgroundColor: colors.primary + "1A" },
          ]}
        >
          <Feather name={icon} size={16} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.rowLabel,
              { color: colors.foreground, fontFamily: "Inter_600SemiBold" },
            ]}
          >
            {label}
          </Text>
          {hint ? (
            <Text
              style={[
                styles.rowHint,
                {
                  color: colors.mutedForeground,
                  fontFamily: "Inter_400Regular",
                },
              ]}
            >
              {hint}
            </Text>
          ) : null}
        </View>
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, letterSpacing: -0.5 },
  profileCard: {
    marginTop: 18,
    padding: 24,
    borderRadius: 24,
    overflow: "hidden",
  },
  profileHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  avatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
    overflow: "hidden",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  profileName: { color: "#fff", fontSize: 24, letterSpacing: -0.5 },
  profileChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  chipText: { color: "#fff", fontSize: 10, letterSpacing: 0.4 },
  bioText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 16,
  },
  contactWrap: {
    marginTop: 18,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.15)",
    gap: 10,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  contactText: {
    color: "#fff",
    fontSize: 13,
  },
  groupTitle: {
    fontSize: 11,
    letterSpacing: 0.6,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: { fontSize: 14 },
  rowHint: { fontSize: 12, marginTop: 2 },
});
