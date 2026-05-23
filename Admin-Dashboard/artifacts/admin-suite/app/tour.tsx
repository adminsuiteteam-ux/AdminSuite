import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PrimaryButton } from "@/components/PrimaryButton";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

const { width } = Dimensions.get("window");

const SLIDES = [
  {
    title: "One workspace for everything",
    body: "Employees, clients, projects and finances — managed in one elegant place. No more spreadsheets.",
    icon: "grid",
    gradient: ["#4f46e5", "#7c3aed"],
  },
  {
    title: "Real-time financial clarity",
    body: "Track income, expenses and net profit live. Watch your numbers update the moment a manager logs an entry.",
    icon: "trending-up",
    gradient: ["#0ea5e9", "#06b6d4"],
  },
  {
    title: "Roles built for real teams",
    body: "Admins oversee everything, managers handle finance, HR manages people. Permissions just work.",
    icon: "shield",
    gradient: ["#f59e0b", "#ef4444"],
  },
  {
    title: "Customize without code",
    body: "Add custom fields, tax sections, to-do lists or whole new modules — without writing a single line.",
    icon: "sliders",
    gradient: ["#10b981", "#059669"],
  },
];

export default function TourScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { completeTour } = useAuth();
  const listRef = useRef<FlatList>(null);
  const [index, setIndex] = useState(0);

  const finish = async () => {
    await completeTour();
    router.replace("/(tabs)");
  };

  const next = () => {
    if (index < SLIDES.length - 1) {
      const target = index + 1;
      setIndex(target);
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({
          offset: target * width,
          animated: true,
        });
      });
    } else {
      finish();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <View style={{ width: 64 }} />
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    i === index ? colors.primary : colors.border,
                  width: i === index ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>
        <Pressable onPress={finish} hitSlop={10} style={{ width: 64 }}>
          <Text
            style={{
              color: colors.mutedForeground,
              fontFamily: "Inter_600SemiBold",
              textAlign: "right",
              fontSize: 14,
            }}
          >
            Skip
          </Text>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(s) => s.title}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        getItemLayout={(_, i) => ({
          length: width,
          offset: width * i,
          index: i,
        })}
        onScroll={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / width);
          if (i !== index) setIndex(i);
        }}
        scrollEventThrottle={32}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={styles.illustrationWrap}>
              <LinearGradient
                colors={item.gradient as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.illustration}
              >
                <View style={styles.iconBubbleLg}>
                  <Feather name={item.icon as any} size={56} color="#fff" />
                </View>
                <View style={[styles.floater, styles.floaterTL]}>
                  <Feather name="check" size={14} color="#fff" />
                </View>
                <View style={[styles.floater, styles.floaterTR]}>
                  <Feather name="bar-chart-2" size={14} color="#fff" />
                </View>
                <View style={[styles.floater, styles.floaterBR]}>
                  <Feather name="users" size={14} color="#fff" />
                </View>
                <View style={[styles.floater, styles.floaterBL]}>
                  <Feather name="dollar-sign" size={14} color="#fff" />
                </View>
              </LinearGradient>
            </View>

            <Text
              style={[
                styles.title,
                { color: colors.foreground, fontFamily: "Inter_700Bold" },
              ]}
            >
              {item.title}
            </Text>
            <Text
              style={[
                styles.body,
                { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
              ]}
            >
              {item.body}
            </Text>
          </View>
        )}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <PrimaryButton
          label={index === SLIDES.length - 1 ? "Get started" : "Next"}
          onPress={next}
          icon={
            index === SLIDES.length - 1 ? null : (
              <Feather name="arrow-right" size={16} color="#fff" />
            )
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  slide: {
    paddingHorizontal: 28,
    paddingTop: 16,
    alignItems: "center",
  },
  illustrationWrap: {
    width: "100%",
    aspectRatio: 1,
    maxHeight: 360,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  illustration: {
    width: "92%",
    aspectRatio: 1,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  iconBubbleLg: {
    width: 130,
    height: 130,
    borderRadius: 65,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  floater: {
    position: "absolute",
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
  },
  floaterTL: { top: 28, left: 28 },
  floaterTR: { top: 40, right: 24 },
  floaterBR: { bottom: 32, right: 36 },
  floaterBL: { bottom: 40, left: 30 },
  title: {
    fontSize: 26,
    letterSpacing: -0.5,
    textAlign: "center",
    marginBottom: 12,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
});
