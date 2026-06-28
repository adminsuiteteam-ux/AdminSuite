import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "@/services/storage";
import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { apiService, resolveBackendUrl } from "@/services/api";
import { registerForPushNotificationsAsync, unregisterFromPushNotificationsAsync } from "@/services/notifications";

const TOKEN_KEY = "admin-suite.token";
const TOUR_KEY = "admin-suite.tour-complete";

export type User = {
  id: number;
  email: string;
  username: string;
  name: string;
  role: string;
  initials: string;
  profile_complete: boolean;
  is_first_login?: boolean;
  notifications_enabled?: boolean;
  employee_id?: number | null;
  location?: string;
  phone?: string;
  bio?: string;
  social_link?: string;
  avatar?: string | null;
  business_name?: string;
  org_location?: string;
  org_email?: string;
  company_line?: string;
  social_handles?: string;
  total_workers?: string;
  opening_time?: string;
  closing_time?: string;
  working_days?: string;
  average_revenue?: string;
  company_logo?: string | null;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  suspendedUntil: string | null;
  setSuspendedUntil: (val: string | null) => Promise<void>;
  login: (credentials: { username: string; password: string }) => Promise<void>;
  /** Step 1 of registration: sends OTP email via Django */
  requestEmailOTP: (email: string, password: string) => Promise<void>;
  /** Resend OTP email via Django */
  resendEmailOTP: (email: string) => Promise<void>;
  /** Step 2: verify OTP then register on Django backend */
  verifyEmailOTP: (email: string, code: string, password: string) => Promise<void>;
  loginWithSocial: (email: string, name: string, provider: 'google' | 'apple') => Promise<void>;
  logout: () => Promise<void>;
  tourComplete: boolean;
  completeTour: () => Promise<void>;
  setUser: (user: User | null) => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tourComplete, setTourComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [suspendedUntil, setSuspendedUntilState] = useState<string | null>(null);

  const setSuspendedUntil = async (val: string | null) => {
    setSuspendedUntilState(val);
    if (val) {
      await AsyncStorage.setItem("admin-suite.suspended-until", val);
    } else {
      await AsyncStorage.removeItem("admin-suite.suspended-until");
    }
  };

  useEffect(() => {
    apiService.onUnauthorized(async () => {
      await logout();
    });

    (async () => {
      try {
        // Only run URL resolution if no explicit API URL is configured
        // (avoids slow startup ping when production URL is already known)
        if (!process.env.EXPO_PUBLIC_API_URL) {
          await resolveBackendUrl();
        }
        const [token, tourRaw, suspendedUntilRaw] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          AsyncStorage.getItem(TOUR_KEY),
          AsyncStorage.getItem("admin-suite.suspended-until"),
        ]);
        
        if (suspendedUntilRaw) {
          const date = new Date(suspendedUntilRaw);
          if (date > new Date()) {
            setSuspendedUntilState(suspendedUntilRaw);
          } else {
            await AsyncStorage.removeItem("admin-suite.suspended-until");
          }
        }
        
        if (token) {
          apiService.setToken(token);
          const res = await apiService.getMe();
          const u = res.data;
          u.initials = ((u.name || u.username || u.email || "US")).slice(0, 2).toUpperCase();
          setUser(u);
          registerForPushNotificationsAsync().catch(err => console.error("Error registering push token on app launch:", err));
          await AsyncStorage.setItem(TOUR_KEY, "true");
          setTourComplete(true);
        } else if (tourRaw === "true") {
          setTourComplete(true);
        }
      } catch (err: any) {
        if (err.response && (err.response.status === 401 || err.response.status === 403)) {
          console.log("Auth session expired (401/403). Clearing token.");
          await SecureStore.deleteItemAsync(TOKEN_KEY);
          apiService.setToken(null);
        } else {
          console.log("Auth init failed (Network/Server error):", err.message || err);
        }
      }

      setLoading(false);
    })();
  }, []);

  const login = async (credentials: { username: string; password: string }) => {
    try {
      const res = await apiService.login({
        username: credentials.username,
        password: credentials.password,
      });
      const token = res.data.token;

      await SecureStore.setItemAsync(TOKEN_KEY, token);
      apiService.setToken(token);

      const userRes = await apiService.getMe();
      const u = userRes.data;
      u.initials = ((u.name || u.username || u.email || "US")).slice(0, 2).toUpperCase();

      // Store username for autocomplete/prefilling (no raw password stored)
      await SecureStore.setItemAsync("admin-suite.username", credentials.username);

      setUser(u);
      registerForPushNotificationsAsync().catch(err => console.error("Error registering push token on login:", err));
    } catch (err: any) {
      if (err.response?.status === 423 || err.response?.data?.error === 'suspended') {
        const until = err.response?.data?.suspended_until;
        if (until) {
          await setSuspendedUntil(until);
        }
      }
      throw err;
    }
  };

  /**
   * Step 1 of registration: sends a 6-digit OTP to the user's email via Django.
   */
  const requestEmailOTP = async (email: string, _password: string) => {
    try {
      const res = await apiService.sendEmailCode({ email });
      // In DEBUG mode the backend returns the code directly for easy testing
      if (res.data?.code) {
        await AsyncStorage.setItem("auth.debug_otp_code", res.data.code);
      }
    } catch (err: any) {
      throw new Error(err.response?.data?.error || err.message || "Failed to send verification email.");
    }
  };

  /**
   * Resend OTP email via Django (same endpoint, generates a fresh code).
   */
  const resendEmailOTP = async (email: string) => {
    try {
      const res = await apiService.sendEmailCode({ email });
      if (res.data?.code) {
        await AsyncStorage.setItem("auth.debug_otp_code", res.data.code);
      }
    } catch (err: any) {
      throw new Error(err.response?.data?.error || err.message || "Failed to resend verification code.");
    }
  };

  /**
   * Step 2: verifies the OTP then registers the user on the Django backend.
   */
  const verifyEmailOTP = async (email: string, code: string, password: string) => {
    // 1. Verify the code
    try {
      await apiService.verifyEmailCode({ email, code: code.trim() });
    } catch (err: any) {
      throw new Error(err.response?.data?.error || err.message || "Invalid or expired verification code.");
    }

    // 2. Register on Django backend
    try {
      const signupRes = await apiService.signup({
        email,
        password,
        confirm_password: password,
      });

      const token = signupRes.data.token;
      const u = signupRes.data.user;
      u.initials = ((u.name || u.username || u.email || "US")).slice(0, 2).toUpperCase();

      await SecureStore.setItemAsync(TOKEN_KEY, token);
      apiService.setToken(token);
      await SecureStore.setItemAsync("admin-suite.username", email);

      setUser(u);
      registerForPushNotificationsAsync().catch(err => console.error("Error registering push token on signup:", err));
      return;
    } catch (signupErr: any) {
      const errorData = signupErr.response?.data;
      const isAlreadyExists =
        errorData?.email?.[0]?.includes("already exists") ||
        (errorData && JSON.stringify(errorData).includes("already exists"));

      if (!isAlreadyExists) {
        throw new Error(signupErr.response?.data?.email?.[0] || signupErr.message || "Failed to register account.");
      }
    }

    // Fallback: email already registered → just log in
    await login({ username: email, password });
  };

  const loginWithSocial = async (email: string, name: string, provider: 'google' | 'apple') => {
    setLoading(true);
    try {
      let res;
      if (provider === 'google') {
        res = await apiService.loginWithGoogle({
          id_token: "dummy_supabase_oauth_token",
          email: email,
          name: name,
        });
      } else {
        res = await apiService.loginWithApple({
          identity_token: "dummy_supabase_oauth_token",
          email: email,
          name: name,
        });
      }
      
      const token = res.data.token;
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      apiService.setToken(token);
      
      const userRes = await apiService.getMe();
      const u = userRes.data;
      u.initials = ((u.name || u.username || u.email || "US")).slice(0, 2).toUpperCase();
      
      setUser(u);
      registerForPushNotificationsAsync().catch(err => console.error("Error registering push token on social login:", err));
    } catch (err: any) {
      console.error("Social sync failed:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await unregisterFromPushNotificationsAsync();
    } catch (e) {
      console.warn("Unregister push notifications error:", e);
    }

    // Note: We DO NOT clear the TOUR_KEY here because the onboarding tour should only be seen by new users.
    // Clear active auth token (username kept for login email prefill)
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync("admin-suite.username"),
    ]);

    apiService.setToken(null);
    setUser(null);
  };

  const completeTour = async () => {
    await AsyncStorage.setItem(TOUR_KEY, "true");
    setTourComplete(true);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        suspendedUntil,
        setSuspendedUntil,
        login,
        requestEmailOTP,
        resendEmailOTP,
        verifyEmailOTP,
        loginWithSocial,
        logout,
        tourComplete,
        completeTour,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
