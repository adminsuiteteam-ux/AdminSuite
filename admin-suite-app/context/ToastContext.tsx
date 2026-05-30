import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { Animated, StyleSheet, Text, View, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastOptions {
  title: string;
  message: string;
  type?: ToastType;
}

interface ToastContextType {
  showToast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastOptions | null>(null);
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-150)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  const timeoutRef = useRef<any>(null);

  const showToast = ({ title, message, type = 'success' }: ToastOptions) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setToast({ title, message, type });

    // Reset animations
    slideAnim.setValue(-150);
    opacityAnim.setValue(0);
    progressAnim.setValue(1);

    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: 4500,
        useNativeDriver: true,
      }),
    ]).start();

    timeoutRef.current = setTimeout(() => {
      hideToast();
    }, 4500);
  };

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -150,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToast(null);
    });
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const getToastColors = (type?: ToastType) => {
    switch (type) {
      case 'success':
        return {
          bg: '#09090b',
          border: 'rgba(34, 197, 94, 0.3)',
          iconBg: 'rgba(34, 197, 94, 0.15)',
          iconColor: '#22c55e',
        };
      case 'error':
        return {
          bg: '#09090b',
          border: 'rgba(239, 68, 68, 0.3)',
          iconBg: 'rgba(239, 68, 68, 0.15)',
          iconColor: '#ef4444',
        };
      case 'warning':
        return {
          bg: '#09090b',
          border: 'rgba(245, 158, 11, 0.3)',
          iconBg: 'rgba(245, 158, 11, 0.15)',
          iconColor: '#f59e0b',
        };
      case 'info':
      default:
        return {
          bg: '#09090b',
          border: 'rgba(59, 130, 246, 0.3)',
          iconBg: 'rgba(59, 130, 246, 0.15)',
          iconColor: '#3b82f6',
        };
    }
  };

  const getIconName = (type?: ToastType): any => {
    switch (type) {
      case 'success':
        return 'check-circle';
      case 'error':
        return 'x-circle';
      case 'warning':
        return 'alert-triangle';
      case 'info':
      default:
        return 'info';
    }
  };

  const toastStyle = toast ? getToastColors(toast.type) : null;

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && toastStyle && (
        <Animated.View
          style={[
            styles.container,
            {
              top: insets.top + 16,
              opacity: opacityAnim,
              transform: [{ translateY: slideAnim }],
              backgroundColor: toastStyle.bg,
              borderColor: toastStyle.border,
            },
          ]}
        >
          <Pressable onPress={hideToast} style={styles.pressable}>
            <View style={[styles.iconCircle, { backgroundColor: toastStyle.iconBg }]}>
              <Feather name={getIconName(toast.type)} size={18} color={toastStyle.iconColor} />
            </View>
            <View style={styles.content}>
              <Text style={styles.title}>{toast.title}</Text>
              <Text style={styles.message}>{toast.message}</Text>
            </View>
            <Feather name="x" size={14} color="#71717a" style={styles.closeIcon} />
          </Pressable>
          <Animated.View
            style={[
              styles.progressBar,
              {
                backgroundColor: toastStyle.iconColor,
                transform: [{ scaleX: progressAnim }],
              },
            ]}
          />
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 12,
    zIndex: 99999,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    overflow: 'hidden',
  },
  pressable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 2,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingRight: 8,
  },
  title: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    marginBottom: 2,
  },
  message: {
    color: '#a1a1aa',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    lineHeight: 16,
  },
  closeIcon: {
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
  },
});
