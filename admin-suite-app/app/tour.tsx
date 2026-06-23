import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { useAuth } from "@/context/AuthContext";

const { width } = Dimensions.get("window");

const SLIDES = [
  {
    titleKey: "tour.slide1Title",
    bodyKey: "tour.slide1Body",
    image: require("@/assets/images/slide1.png"),
  },
  {
    titleKey: "tour.slide2Title",
    bodyKey: "tour.slide2Body",
    image: require("@/assets/images/slide2.png"),
  },
  {
    titleKey: "tour.slide3Title",
    bodyKey: "tour.slide3Body",
    image: require("@/assets/images/slide3.png"),
  },
  {
    titleKey: "tour.slide4Title",
    bodyKey: "tour.slide4Body",
    image: require("@/assets/images/slide4.png"),
  },
];

export default function TourScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { completeTour, user } = useAuth();
  const listRef = useRef<FlatList>(null);
  const [index, setIndex] = useState(0);

  const finish = async () => {
    await completeTour();
    if (!user) {
      router.replace("/(auth)/register");
    } else {
      router.replace("/(tabs)");
    }
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
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(s) => s.titleKey}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={{ flex: 1 }}
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
          <View style={[styles.slide, { width, paddingTop: insets.top + 60 }]}>
            <View style={styles.illustrationWrap}>
              <View style={styles.illustrationCircle}>
                <Image
                  source={item.image}
                  style={styles.image}
                  resizeMode="contain"
                />
              </View>
            </View>

            <View style={styles.dots}>
              {SLIDES.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    {
                      backgroundColor: i === index ? "#000000" : "#e4e4e7",
                      width: i === index ? 20 : 8,
                    },
                  ]}
                />
              ))}
            </View>

            <Text style={[styles.title, { fontFamily: "Inter_700Bold" }]}>
              {t(item.titleKey)}
            </Text>
            <Text style={[styles.body, { fontFamily: "Inter_400Regular" }]}>
              {t(item.bodyKey)}
            </Text>
          </View>
        )}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + 32 }]}>
        <Pressable
          onPress={finish}
          hitSlop={10}
          style={({ pressed }) => [
            {
              transform: [{ scale: pressed ? 0.95 : 1 }],
              opacity: pressed ? 0.6 : 1,
            },
          ]}
        >
          <Text style={[styles.skipBtn, { fontFamily: "Inter_600SemiBold" }]}>
            {t("tour.skip")}
          </Text>
        </Pressable>
        <Pressable
          onPress={next}
          style={({ pressed }) => [
            styles.nextBtn,
            {
              transform: [{ scale: pressed ? 0.96 : 1 }],
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <Text style={[styles.nextBtnText, { fontFamily: "Inter_600SemiBold" }]}>
            {index === SLIDES.length - 1 ? t("tour.start") : t("tour.next")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#ffffff",
  },
  slide: {
    paddingHorizontal: 28,
    alignItems: "center",
  },
  illustrationWrap: {
    width: "100%",
    aspectRatio: 1,
    maxHeight: 360,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  illustrationCircle: {
    width: "90%",
    aspectRatio: 1,
    borderRadius: 999,
    backgroundColor: "#fcfcfc",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 32,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  title: {
    fontSize: 24,
    color: "#000000",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 32,
  },
  body: {
    fontSize: 15,
    color: "#71717a",
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  skipBtn: {
    color: "#000000",
    fontSize: 13,
    letterSpacing: 1,
  },
  nextBtn: {
    backgroundColor: "#000000",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
  },
  nextBtnText: {
    color: "#ffffff",
    fontSize: 13,
    letterSpacing: 1,
  },
});
