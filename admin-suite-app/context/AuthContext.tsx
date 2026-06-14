import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "@/services/storage";
import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/services/supabase";
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
  signUpWithSupabase: (email: string, password: string) => Promise<void>;
  resendSupabaseOTP: (email: string) => Promise<void>;
  verifySupabaseOTP: (email: string, code: string, password: string) => Promise<void>;
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
    // 1. Attempt Supabase signIn (non-blocking; session is not persisted)
    try {
      await supabase.auth.signInWithPassword({
        email: credentials.username,
        password: credentials.password,
      });
    } catch (e: any) {
      // Supabase auth is supplementary — Django is the primary auth provider
      console.warn("Supabase signIn skipped:", e?.message);
    }

    // 2. Log in with Django backend (primary auth)
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

  const signUpWithSupabase = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      // Supabase returns an empty identities array when user already exists
      if (data?.user?.identities?.length === 0) {
        throw new Error("An account with this email already exists. Please sign in instead.");
      }

      if (!data?.user) {
        throw new Error("Sign up failed. Please check your email and try again.");
      }

      await AsyncStorage.setItem("auth.use_supabase_signup", "true");
    } catch (err: any) {
      if (err.message && err.message.includes("already exists")) {
        throw err;
      }
      console.warn("Supabase signUp failed, falling back to Django local verification:", err?.message);
      await AsyncStorage.setItem("auth.use_supabase_signup", "false");
      try {
        const res = await apiService.sendEmailCode({ email });
        if (res.data && res.data.code) {
          await AsyncStorage.setItem("auth.debug_otp_code", res.data.code);
        }
      } catch (djangoErr: any) {
        throw new Error(djangoErr.response?.data?.error || djangoErr.message || "Failed to send verification code via Django.");
      }
    }
  };

  const resendSupabaseOTP = async (email: string) => {
    const useSupabase = await AsyncStorage.getItem("auth.use_supabase_signup");
    if (useSupabase !== "false") {
      const { data, error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim().toLowerCase(),
      });
      
      if (error) {
        throw new Error(error.message);
      }
    } else {
      try {
        const res = await apiService.sendEmailCode({ email });
        if (res.data && res.data.code) {
          await AsyncStorage.setItem("auth.debug_otp_code", res.data.code);
        }
      } catch (djangoErr: any) {
        throw new Error(djangoErr.response?.data?.error || djangoErr.message || "Failed to resend verification code.");
      }
    }
  };

  const verifySupabaseOTP = async (email: string, code: string, password: string) => {
    const useSupabase = await AsyncStorage.getItem("auth.use_supabase_signup");
    
    if (useSupabase !== "false") {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: code.trim(),
        type: 'signup',
      });
      
      if (error) {
        throw new Error(error.message);
      }
    } else {
      try {
        await apiService.verifyEmailCode({ email, code: code.trim() });
      } catch (djangoErr: any) {
        throw new Error(djangoErr.response?.data?.error || djangoErr.message || "Invalid or expired verification code.");
      }
    }
    
    try {
      // Register the user on the Django backend
      const signupRes = await apiService.signup({
        email,
        password,
        confirm_password: password,
        supabase_verified: useSupabase !== "false",
      });
      
      const token = signupRes.data.token;
      const u = signupRes.data.user;
      u.initials = ((u.name || u.username || u.email || "US")).slice(0, 2).toUpperCase();
      
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      apiService.setToken(token);
      
      // Store email for autocomplete/prefilling (no raw password stored)
      await SecureStore.setItemAsync("admin-suite.username", email);
      
      setUser(u);
      registerForPushNotificationsAsync().catch(err => console.error("Error registering push token on signup verification:", err));
      return;
    } catch (signupErr: any) {
      console.warn("Django signup warning:", signupErr);
      const errorData = signupErr.response?.data;
      const isAlreadyExists = 
        errorData?.email?.[0]?.includes("already exists") || 
        (errorData && JSON.stringify(errorData).includes("already exists"));
      
      if (!isAlreadyExists) {
        throw new Error(signupErr.response?.data?.email?.[0] || signupErr.message || "Failed to register on backend.");
      }
    }
    
    // Fallback: If user already exists on Django, log in to get Django token
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

    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("Supabase sign out error:", e);
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
        signUpWithSupabase,
        resendSupabaseOTP,
        verifySupabaseOTP,
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
