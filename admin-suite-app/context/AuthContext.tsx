import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/services/supabase";
import { apiService } from "@/services/api";

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
    (async () => {
      try {
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
        }
        
        if (tourRaw === "true") setTourComplete(true);
      } catch (err) {
        console.error("Auth init failed:", err);
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        apiService.setToken(null);
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
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (error) {
      console.error("Supabase signUp error:", error.message, error.status);
      throw new Error(error.message);
    }

    // Supabase returns an empty identities array when user already exists
    // (security measure — it won't reveal existing emails via error)
    if (data?.user?.identities?.length === 0) {
      throw new Error("An account with this email already exists. Please sign in instead.");
    }

    // If no session and no confirmed user, OTP was sent successfully
    if (!data?.user) {
      throw new Error("Sign up failed. Please check your email and try again.");
    }
  };

  const resendSupabaseOTP = async (email: string) => {
    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
    });
    
    if (error) {
      throw new Error(error.message);
    }
  };

  const verifySupabaseOTP = async (email: string, code: string, password: string) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: 'signup',
    });
    
    if (error) {
      throw new Error(error.message);
    }
    
    try {
      // Register the user on the Django backend
      const signupRes = await apiService.signup({
        email,
        password,
        confirm_password: password,
        supabase_verified: true,
      });
      
      const token = signupRes.data.token;
      const u = signupRes.data.user;
      u.initials = ((u.name || u.username || u.email || "US")).slice(0, 2).toUpperCase();
      
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      apiService.setToken(token);
      
      // Store email for autocomplete/prefilling (no raw password stored)
      await SecureStore.setItemAsync("admin-suite.username", email);
      
      setUser(u);
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
    } catch (err: any) {
      console.error("Social sync failed:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
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
