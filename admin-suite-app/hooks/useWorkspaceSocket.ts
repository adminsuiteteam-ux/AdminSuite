import { useEffect, useRef, useState } from "react";
import { router } from "expo-router";
import * as SecureStore from "@/services/storage";
import { getActiveBaseUrl } from "@/services/api";
import { useAuth } from "@/context/AuthContext";

const TOKEN_KEY = "admin-suite.token";

export interface WorkspaceSyncEvent {
  type: string; // "workspace.sync"
  event: string; // "employee.updated" | "employee.created" | "employee.deleted" | "financial_pulse.updated" | "transaction.created" | etc.
  data: any;
}

export function useWorkspaceSocket(onSyncEvent?: (event: WorkspaceSyncEvent) => void) {
  const { user } = useAuth();
  const socketRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<any>(null);
  const pingIntervalRef = useRef<any>(null);
  const onSyncEventRef = useRef(onSyncEvent);
  onSyncEventRef.current = onSyncEvent;

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.close(1000, "user_logged_out");
        socketRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    let isMounted = true;

    const connect = async () => {
      try {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        if (!token) return;

        const baseUrl = getActiveBaseUrl();
        // Convert http/https -> ws/wss
        const wsProto = baseUrl.startsWith("https") ? "wss" : "ws";
        const cleanHost = baseUrl
          .replace(/^https?:\/\//, "")
          .replace(/\/.*$/, "");

        const workspaceId = (user as any).workspace_id || user.id;
        const wsUrl = `${wsProto}://${cleanHost}/ws/chat/${workspaceId}/?token=${encodeURIComponent(token)}`;

        if (
          socketRef.current &&
          (socketRef.current.readyState === WebSocket.OPEN ||
            socketRef.current.readyState === WebSocket.CONNECTING)
        ) {
          return;
        }

        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
          if (!isMounted) return;
          setIsConnected(true);
          console.log(`[WorkspaceSocket] Connected to workspace ${workspaceId}`);

          // Heartbeat ping every 25 seconds
          if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "ping" }));
            }
          }, 25000);
        };

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.type === "workspace.sync") {
              console.log("[WorkspaceSocket] Sync event received:", payload.event);
              if (onSyncEventRef.current) {
                onSyncEventRef.current(payload as WorkspaceSyncEvent);
              }
            } else if (payload.type === "call.signal") {
              const myId = String(user?.id);
              const isTarget = payload.recipient_id && String(payload.recipient_id) === myId;
              if (isTarget) {
                if (payload.signal_type === "offer") {
                  console.log("[WorkspaceSocket] Incoming call received from:", payload.caller_name);
                  router.push({
                    pathname: "/call",
                    params: {
                      callId: payload.call_id,
                      callType: payload.call_type || "voice",
                      roomUrl: payload.room_url || "",
                      roomName: payload.room_name || "",
                      token: payload.token || "",
                      calleeName: payload.caller_name || "Incoming Caller",
                      calleeInitials: payload.caller_initials || "??",
                      isIncoming: "true",
                    },
                  });
                }
              }
            }
          } catch (e) {
            // Ignore non-JSON or heartbeat acks
          }
        };

        ws.onerror = (err) => {
          console.warn("[WorkspaceSocket] Socket error:", (err as any)?.message || err);
        };

        ws.onclose = (event) => {
          if (!isMounted) return;
          setIsConnected(false);
          if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);

          // Auto-reconnect after 4 seconds unless clean close
          if (event.code !== 1000) {
            reconnectTimeoutRef.current = setTimeout(() => {
              if (isMounted) connect();
            }, 4000);
          }
        };
      } catch (err) {
        console.warn("[WorkspaceSocket] Connect failed:", err);
      }
    };

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (socketRef.current) {
        socketRef.current.close(1000, "unmount");
        socketRef.current = null;
      }
    };
  }, [user?.id, (user as any)?.workspace_id]);

  return { isConnected, socketRef };
}
