import React from "react";
import { useLocalSearchParams } from "expo-router";
import CallScreen, { CallScreenParams } from "@/components/CallScreen";

export default function CallRoute() {
  const searchParams = useLocalSearchParams();

  const params: CallScreenParams = {
    callId: searchParams.callId ? Number(searchParams.callId) : 0,
    callType: (searchParams.callType as "voice" | "video") || "voice",
    roomUrl: (searchParams.roomUrl as string) || "",
    roomName: (searchParams.roomName as string) || "",
    token: (searchParams.token as string) || "",
    calleeName: (searchParams.calleeName as string) || "Unknown",
    calleeInitials: (searchParams.calleeInitials as string) || "??",
    isIncoming: searchParams.isIncoming === "true",
  };

  return <CallScreen params={params} />;
}
