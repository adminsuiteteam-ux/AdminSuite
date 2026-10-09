import "react-native-get-random-values";
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
import { Text, View, Pressable, Animated, LogBox, Alert } from "react-native";
import { useTranslation } from "react-i18next";
import React, { useEffect } from "react";

LogBox.ignoreLogs([
  "expo-notifications: Android Push notifications",
]);

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/context/AuthContext";
import { DataProvider } from "@/context/DataContext";
import { SettingsProvider } from "@/context/SettingsContext";
import { ToastProvider, triggerGlobalToast } from "@/context/ToastContext";
import { AlertProvider } from "@/context/AlertContext";
import "../i18n";

// Configure how notifications are displayed when the app is in the foreground
// Disable system heads-up in foreground since our custom in-app banner/modal displays instead!
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: false,
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

function handleNotificationRouting(data: any) {
  if (!data) return;
  if (data.screen === 'tasks') {
    router.push('/(employee)/tasks' as any);
  } else if (data.screen === 'admin-tasks') {
    router.push('/(tabs)/tasks' as any);
  } else if (data.screen === 'chat' || data.screen === 'chat-group') {
    router.push('/(tabs)/admin-chat' as any);
  } else if (data.screen === 'leave') {
    router.push('/(tabs)/employees' as any);
  } else if (data.screen === 'projects') {
    if (data.projectId) {
      router.push(`/project/${data.projectId}` as any);
    } else {
      router.push('/(tabs)/projects' as any);
    }
  } else if (data.screen === 'finance') {
    router.push('/(employee)/finance' as any);
  } else if (data.screen === 'queries') {
    router.push('/(tabs)/employees' as any);
  } else if (data.screen === 'call') {
    router.push({
      pathname: '/call',
      params: {
        callId: data.callId,
        callType: data.callType || 'voice',
        roomUrl: data.roomUrl || '',
        roomName: data.roomName || '',
        token: data.token || '',
        calleeName: data.callerName || data.calleeName || 'Incoming Caller',
        calleeInitials: data.callerInitials || data.calleeInitials || '??',
        isIncoming: 'true',
      },
    } as any);
  }
}

function RootLayoutNav() {
  useEffect(() => {
    // 1. Listen for background/lockscreen notification clicks to wake app and deep link
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data) {
        console.log('[Notification Click] Response data:', data);
        handleNotificationRouting(data);
      }
    });

    // 2. Hybrid Foreground In-App Alert System
    const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
      const { title, body, data } = notification.request.content;
      if (data && data.screen === 'call') {
        handleNotificationRouting(data);
        return;
      }

      const isUrgent =
        Boolean(data?.is_urgent) ||
        data?.priority === 'urgent' ||
        (title && title.toLowerCase().includes('urgent')) ||
        (title && title.toLowerCase().includes('critical'));

      if (isUrgent) {
        // High priority / urgent modal dialog
        Alert.alert(
          title || 'Urgent Notification',
          body || 'You have received an urgent alert.',
          [
            {
              text: 'View Now',
              onPress: () => handleNotificationRouting(data),
            },
            {
              text: 'Dismiss',
              style: 'cancel',
            },
          ]
        );
      } else {
        // Standard in-app floating banner toast with tap navigation
        triggerGlobalToast({
          title: title || 'New Notification',
          message: body || '',
          type: (data?.type as any) || 'info',
          onPress: () => handleNotificationRouting(data),
        });
      }
    });

    return () => {
      subscription.remove();
      foregroundSubscription.remove();
    };
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "fade_from_bottom",
        contentStyle: { backgroundColor: "#09090b" },
      }}
    >
      <Stack.Screen name="index" options={{ animation: "fade" }} />
      <Stack.Screen name="(auth)" options={{ animation: "fade_from_bottom" }} />
      <Stack.Screen name="tour" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
      <Stack.Screen name="(employee)" options={{ animation: "fade" }} />
      <Stack.Screen name="tasks/index" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="attendance/index" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="notebook/index" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="lock" options={{ animation: "fade" }} />
      <Stack.Screen name="call" options={{ animation: "fade_from_bottom", presentation: "fullScreenModal", gestureEnabled: false }} />
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
    <SafeAreaProvider style={{ flex: 1, backgroundColor: "#09090b" }}>
      <ToastProvider>
        <AlertProvider>
          <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
              <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#09090b" }}>
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
        </AlertProvider>
      </ToastProvider>
    </SafeAreaProvider>
  );
}

// Only wrap with Sentry when it was initialised (valid DSN provided)
export default (_sentryDsn && _sentryDsn !== 'YOUR_SENTRY_DSN_HERE')
  ? Sentry.wrap(RootLayout)
  : RootLayout;


import { useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";
import { StyleSheet } from "react-native";

function ConnectionBanner() {
  const { fetchError, refresh } = useData();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const colors = useColors();
  
  if (!fetchError) return null;

  return (
    <View style={[styles.banner, { top: insets.top + 16 }]}>
      <View
        style={[
          styles.bannerInner,
          {
            backgroundColor: colors.isDark ? "rgba(24, 24, 27, 0.96)" : "rgba(255, 255, 255, 0.97)",
            borderColor: colors.isDark ? "rgba(239, 68, 68, 0.35)" : "rgba(239, 68, 68, 0.25)",
          },
        ]}
      >
        <View style={styles.iconContainer}>
          <Feather name="wifi-off" size={18} color="#ef4444" />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.headline, { color: colors.text }]}>
            Offline · Unable to connect to the server.
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Please check your internet connection or try again later.
          </Text>
        </View>
        <Pressable
          onPress={refresh}
          style={({ pressed }) => [
            styles.retryBtn,
            {
              backgroundColor: colors.isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.06)",
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Text style={[styles.retryText, { color: colors.text }]}>{t("common.retry") || "Retry"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  bannerInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  iconContainer: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    flex: 1,
    marginHorizontal: 10,
  },
  headline: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.1,
  },
  subtitle: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
    lineHeight: 14,
  },
  retryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  retryText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
});
