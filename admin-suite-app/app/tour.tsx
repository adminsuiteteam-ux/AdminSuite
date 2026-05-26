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

import { useAuth } from "@/context/AuthContext";

const { width } = Dimensions.get("window");

const SLIDES = [
  {
    title: "One workspace\nfor everything",
    body: "All your tools and apps unified\nin a single, seamless environment.",
    image: require("@/assets/images/slide1.png"),
  },
  {
    title: "Real-time\nfinancial clarity",
    body: "Keep track of your finances with\ninstant insights and metrics.",
    image: require("@/assets/images/slide2.png"),
  },
  {
    title: "Roles built for\nreal teams",
    body: "Empower collaboration and assign\nresponsibilities effortlessly.",
    image: require("@/assets/images/slide3.png"),
  },
  {
    title: "Customize\nwithout code",
    body: "Adapt your workflow with ease\nusing simple drag-and-drop tools.",
    image: require("@/assets/images/slide4.png"),
  },
];

export default function TourScreen() {
  const insets = useSafeAreaInsets();
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
                      backgroundColor: i === index ? "#000000" : "#d4d4d8",
                      width: i === index ? 8 : 8,
                    },
                  ]}
                />
              ))}
            </View>

            <Text style={[styles.title, { fontFamily: "Inter_700Bold" }]}>
              {item.title}
            </Text>
            <Text style={[styles.body, { fontFamily: "Inter_400Regular" }]}>
              {item.body}
            </Text>
          </View>
        )}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + 32 }]}>
        <Pressable onPress={finish} hitSlop={10}>
          <Text style={[styles.skipBtn, { fontFamily: "Inter_600SemiBold" }]}>
            SKIP
          </Text>
        </Pressable>
        <Pressable
          onPress={next}
          style={({ pressed }) => [
            styles.nextBtn,
            { opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Text style={[styles.nextBtnText, { fontFamily: "Inter_600SemiBold" }]}>
            {index === SLIDES.length - 1 ? "START" : "NEXT"}
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
