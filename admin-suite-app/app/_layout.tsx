import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Sentry from "@sentry/react-native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Text, View, Pressable, Animated } from "react-native";
import { useTranslation } from "react-i18next";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/context/AuthContext";
import { DataProvider } from "@/context/DataContext";
import { SettingsProvider } from "@/context/SettingsContext";
import { ToastProvider } from "@/context/ToastContext";
import "../i18n";

// Initialize Sentry (production only — avoids noisy dev warnings)
if (!__DEV__) {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    enableAutoSessionTracking: true,
    tracesSampleRate: 0.2,
    debug: false,
  });
}


const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "fade_from_bottom" }}>
      <Stack.Screen name="index" options={{ animation: "fade" }} />
      <Stack.Screen name="(auth)" options={{ animation: "fade_from_bottom" }} />
      <Stack.Screen name="tour" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
      <Stack.Screen name="(employee)" options={{ animation: "fade" }} />
      <Stack.Screen name="lock" options={{ animation: "fade" }} />
    </Stack>
  );
}

function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ToastProvider>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <KeyboardProvider>
                <AuthProvider>
                  <DataProvider>
                    <SettingsProvider>
                      <StatusBar style="auto" />
                      <RootLayoutNav />
                      <ConnectionBanner />
                    </SettingsProvider>
                  </DataProvider>
                </AuthProvider>
              </KeyboardProvider>
            </GestureHandlerRootView>
          </QueryClientProvider>
        </ErrorBoundary>
      </ToastProvider>
    </SafeAreaProvider>
  );
}

// Only wrap with Sentry in production to avoid dev-mode warnings
export default __DEV__ ? RootLayout : Sentry.wrap(RootLayout);

import { useData } from "@/context/DataContext";
import { StyleSheet } from "react-native";

function ConnectionBanner() {
  const { fetchError, refresh } = useData();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  
  if (!fetchError) return null;

  return (
    <View style={[styles.banner, { top: insets.top + 60 }]}>
      <View style={styles.bannerInner}>
        <Feather name="wifi-off" size={16} color="#fff" />
        <Text style={styles.bannerText}>{t("common.offline")}{fetchError}</Text>
        <Pressable onPress={refresh} style={styles.retryBtn}>
          <Text style={styles.retryText}>{t("common.retry")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    left: 20,
    right: 20,
    zIndex: 9999,
  },
  bannerInner: {
    backgroundColor: "#ef4444",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  bannerText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  retryBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  retryText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
});
