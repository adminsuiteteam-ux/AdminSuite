import { Redirect } from "expo-router";
import React from "react";
import { PLANS } from "@/constants/premiumPlans";

export { PLANS };

export default function PremiumScreen() {
  return <Redirect href="/(tabs)" />;
}
