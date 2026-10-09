import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  Animated,
  StyleSheet,
  Dimensions,
  Platform,
  Alert as NativeAlert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

export type AlertType = "success" | "error" | "warning" | "info";

export interface CustomAlertButton {
  text?: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
  isPreferred?: boolean;
}

export interface CustomAlertOptions {
  cancelable?: boolean;
  onDismiss?: () => void;
}

export interface AlertConfig {
  title?: string;
  message?: string;
  buttons?: CustomAlertButton[];
  options?: CustomAlertOptions;
  type?: AlertType;
}

interface AlertContextValue {
  showAlert: (config: AlertConfig) => void;
  hideAlert: () => void;
}

const AlertContext = createContext<AlertContextValue | null>(null);

let globalShowAlert: ((config: AlertConfig) => void) | null = null;
let globalHideAlert: (() => void) | null = null;

// Global Monkey-patch for React Native's native Alert.alert
const nativeAlert = NativeAlert.alert;
NativeAlert.alert = (title?: string, message?: string, buttons?: any[], options?: any) => {
  if (globalShowAlert) {
    globalShowAlert({
      title: title || "",
      message: message || "",
      buttons: buttons && buttons.length > 0 ? buttons : [{ text: "OK" }],
      options,
    });
  } else {
    nativeAlert(title as any, message as any, buttons as any, options as any);
  }
};

function inferAlertType(title?: string, message?: string, buttons?: CustomAlertButton[]): AlertType {
  const combined = `${title || ""} ${message || ""}`.toLowerCase();
  
  if (
    combined.includes("success") ||
    combined.includes("saved") ||
    combined.includes("updated successfully") ||
    combined.includes("created successfully") ||
    combined.includes("promoted") ||
    combined.includes("restored") ||
    combined.includes("completed")
  ) {
    return "success";
  }

  if (
    combined.includes("error") ||
    combined.includes("failed") ||
    combined.includes("cannot") ||
    combined.includes("could not") ||
    combined.includes("invalid") ||
    combined.includes("delete") ||
    buttons?.some((b) => b.style === "destructive")
  ) {
    if (combined.includes("confirm delete") || combined.includes("are you sure")) {
      return "warning";
    }
    return "error";
  }

  if (
    combined.includes("confirm") ||
    combined.includes("warning") ||
    combined.includes("are you sure") ||
    combined.includes("caution") ||
    combined.includes("attention")
  ) {
    return "warning";
  }

  return "info";
}

const TYPE_CONFIG: Record<
  AlertType,
  {
    icon: keyof typeof Feather.glyphMap;
    color: string;
    bgColor: string;
    borderColor: string;
    btnColor: string;
  }
> = {
  success: {
    icon: "check-circle",
    color: "#22c55e",
    bgColor: "rgba(34, 197, 94, 0.14)",
    borderColor: "rgba(34, 197, 94, 0.35)",
    btnColor: "#22c55e",
  },
  error: {
    icon: "alert-circle",
    color: "#ef4444",
    bgColor: "rgba(239, 68, 68, 0.14)",
    borderColor: "rgba(239, 68, 68, 0.35)",
    btnColor: "#ef4444",
  },
  warning: {
    icon: "alert-triangle",
    color: "#f59e0b",
    bgColor: "rgba(245, 158, 11, 0.14)",
    borderColor: "rgba(245, 158, 11, 0.35)",
    btnColor: "#f59e0b",
  },
  info: {
    icon: "info",
    color: "#6366f1",
    bgColor: "rgba(99, 102, 241, 0.14)",
    borderColor: "rgba(99, 102, 241, 0.35)",
    btnColor: "#6366f1",
  },
};

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [currentAlert, setCurrentAlert] = useState<AlertConfig | null>(null);
  const [visible, setVisible] = useState(false);

  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  const hideAlert = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      const onDismiss = currentAlert?.options?.onDismiss;
      setCurrentAlert(null);
      if (onDismiss) onDismiss();
    });
  }, [currentAlert, opacityAnim, scaleAnim]);

  const showAlert = useCallback(
    (config: AlertConfig) => {
      // Light haptic feedback on alert trigger
      try {
        Haptics.notificationAsync(
          config.type === "error"
            ? Haptics.NotificationFeedbackType.Error
            : config.type === "warning"
            ? Haptics.NotificationFeedbackType.Warning
            : Haptics.NotificationFeedbackType.Success
        ).catch(() => {});
      } catch {}

      setCurrentAlert(config);
      setVisible(true);

      opacityAnim.setValue(0);
      scaleAnim.setValue(0.88);

      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [opacityAnim, scaleAnim]
  );

  useEffect(() => {
    globalShowAlert = showAlert;
    globalHideAlert = hideAlert;
    return () => {
      globalShowAlert = null;
      globalHideAlert = null;
    };
  }, [showAlert, hideAlert]);

  const alertType = currentAlert?.type || inferAlertType(currentAlert?.title, currentAlert?.message, currentAlert?.buttons);
  const typeCfg = TYPE_CONFIG[alertType];
  const buttons = currentAlert?.buttons && currentAlert.buttons.length > 0
    ? currentAlert.buttons
    : [{ text: "OK", style: "default" as const }];

  const handleButtonPress = (btn: CustomAlertButton) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}

    hideAlert();
    if (btn.onPress) {
      setTimeout(() => {
        btn.onPress?.();
      }, 100);
    }
  };

  const isTwoButtons = buttons.length === 2;

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}
      {visible && (
        <Modal
          visible={visible}
          transparent={true}
          animationType="none"
          statusBarTranslucent={true}
          onRequestClose={() => {
            if (currentAlert?.options?.cancelable) {
              hideAlert();
            }
          }}
        >
          <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => {
                if (currentAlert?.options?.cancelable || buttons.length <= 1) {
                  hideAlert();
                }
              }}
            />

            <Animated.View
              style={[
                styles.card,
                {
                  opacity: opacityAnim,
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              {/* Glowing Badge Icon */}
              <View
                style={[
                  styles.iconWrap,
                  {
                    backgroundColor: typeCfg.bgColor,
                    borderColor: typeCfg.borderColor,
                  },
                ]}
              >
                <Feather name={typeCfg.icon} size={26} color={typeCfg.color} />
              </View>

              {/* Title */}
              {!!currentAlert?.title && (
                <Text style={styles.title}>{currentAlert.title}</Text>
              )}

              {/* Message */}
              {!!currentAlert?.message && (
                <Text style={styles.message}>{currentAlert.message}</Text>
              )}

              {/* Action Buttons */}
              <View
                style={[
                  styles.buttonContainer,
                  isTwoButtons ? styles.buttonRow : styles.buttonCol,
                ]}
              >
                {buttons.map((btn, index) => {
                  const isCancel = btn.style === "cancel";
                  const isDestructive = btn.style === "destructive";
                  
                  let btnBg = "rgba(255, 255, 255, 0.08)";
                  let btnBorder = "rgba(255, 255, 255, 0.12)";
                  let textColor = "#f4f4f5";

                  if (isDestructive) {
                    btnBg = "#dc2626";
                    btnBorder = "#ef4444";
                    textColor = "#ffffff";
                  } else if (!isCancel) {
                    btnBg = typeCfg.btnColor;
                    btnBorder = typeCfg.color;
                    textColor = "#ffffff";
                  }

                  return (
                    <Pressable
                      key={index}
                      onPress={() => handleButtonPress(btn)}
                      style={({ pressed }) => [
                        styles.btn,
                        isTwoButtons && { flex: 1 },
                        {
                          backgroundColor: pressed ? "rgba(255,255,255,0.18)" : btnBg,
                          borderColor: btnBorder,
                          transform: [{ scale: pressed ? 0.98 : 1 }],
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.btnText,
                          {
                            color: textColor,
                            fontFamily: isCancel ? "Inter_500Medium" : "Inter_600SemiBold",
                          },
                        ]}
                      >
                        {btn.text || "OK"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Animated.View>
          </Animated.View>
        </Modal>
      )}
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    return {
      showAlert: (cfg: AlertConfig) => {
        if (globalShowAlert) globalShowAlert(cfg);
        else NativeAlert.alert(cfg.title || "", cfg.message, cfg.buttons as any, cfg.options as any);
      },
      hideAlert: () => {
        if (globalHideAlert) globalHideAlert();
      },
    };
  }
  return context;
}

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(5, 5, 8, 0.76)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    zIndex: 99999,
  },
  card: {
    width: Math.min(width - 48, 340),
    backgroundColor: "#16161f",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 20,
  },
  iconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    color: "#f4f4f5",
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: "#a1a1aa",
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 6,
  },
  buttonContainer: {
    width: "100%",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
  },
  buttonCol: {
    flexDirection: "column",
    gap: 10,
  },
  btn: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  btnText: {
    fontSize: 15,
    letterSpacing: -0.2,
  },
});
