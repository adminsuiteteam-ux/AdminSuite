import { Redirect } from "expo-router";
import React from "react";
import { View } from "react-native";

import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";

export default function Index() {
  const { user, tourComplete, loading, suspendedUntil } = useAuth();
  const { biometricsEnabled } = useSettings();

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: "#09090b" }} />;
  }

  if (suspendedUntil && new Date(suspendedUntil) > new Date()) {
    return <Redirect href="/(auth)/suspended" />;
  }

  if (!tourComplete) {
    return <Redirect href="/tour" />;
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  if (user.is_first_login) {
    return <Redirect href="/(auth)/employee-setup" />;
  }

  if (!user.profile_complete) {
    return <Redirect href="/(auth)/complete-profile" />;
  }

  if (biometricsEnabled) {
    return <Redirect href="/lock" />;
  }

  if (['employee', 'hr', 'finance', 'operations', 'secretary', 'dept_manager'].includes(user.role)) {
    return <Redirect href="/(employee)" />;
  }

  return <Redirect href="/(tabs)" />;
}
