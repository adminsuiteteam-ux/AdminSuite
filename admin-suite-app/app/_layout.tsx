import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Sentry from "@sentry/react-native";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Text, View, Pressable, Animated } from "react-native";
import { useTranslation } from "react-i18next";
import React, { useEffect } from "react";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/context/AuthContext";
import { DataProvider } from "@/context/DataContext";
import { SettingsProvider } from "@/context/SettingsContext";
import { ToastProvider } from "@/context/ToastContext";
import "../i18n";

// Configure how notifications are displayed when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Initialize Sentry whenever a real DSN is provided (works in dev and production)
const _sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
if (_sentryDsn && _sentryDsn !== 'YOUR_SENTRY_DSN_HERE') {
  Sentry.init({
    dsn: _sentryDsn,
    enableAutoSessionTracking: true,
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    debug: __DEV__,
  });
}


const queryClient = new QueryClient();

function RootLayoutNav() {
  useEffect(() => {
    // Listen for notification taps to redirect to correct screens
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data) {
        console.log('[Notification Click] Payload data:', data);
        if (data.screen === 'tasks') {
          router.push('/(employee)/tasks' as any);
        } else if (data.screen === 'admin-tasks') {
          router.push('/(tabs)/tasks' as any);
        } else if (data.screen === 'chat' || data.screen === 'chat-group') {
          // Deep-link to the admin chat tab
          router.push('/(tabs)/admin-chat' as any);
        } else if (data.screen === 'leave') {
          // Deep-link to the employees tab (leave management is there)
          router.push('/(tabs)/employees' as any);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

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

// Only wrap with Sentry when it was initialised (valid DSN provided)
export default (_sentryDsn && _sentryDsn !== 'YOUR_SENTRY_DSN_HERE')
  ? Sentry.wrap(RootLayout)
  : RootLayout;


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
