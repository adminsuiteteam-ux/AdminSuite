import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useSignIn, useSignUp, useAuth as useClerkAuth } from "@clerk/clerk-expo";
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
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (credentials: { username: string; password: string }) => Promise<void>;
  signUpWithClerk: (email: string, password: string) => Promise<void>;
  verifyClerkEmailCode: (email: string, code: string, password: string) => Promise<void>;
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

  const { signIn, setActive: setSignInActive, isLoaded: isSignInLoaded } = useSignIn();
  const { signUp, setActive: setSignUpActive, isLoaded: isSignUpLoaded } = useSignUp();
  const { signOut } = useClerkAuth();

  useEffect(() => {
    (async () => {
      try {
        const [token, tourRaw] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          AsyncStorage.getItem(TOUR_KEY),
        ]);
        
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
    if (!isSignInLoaded) throw new Error("Authentication service is loading. Please try again.");

    // 1. Sign in with Clerk
    const completeSignIn = await signIn.create({
      identifier: credentials.username,
      password: credentials.password,
    });
    
    if (completeSignIn.status !== "complete") {
      throw new Error("Clerk sign in not completed.");
    }
    
    await setSignInActive({ session: completeSignIn.createdSessionId });

    // 2. Log in with Django backend
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
    
    // Store credentials for biometric quick login
    await Promise.all([
      SecureStore.setItemAsync("admin-suite.username", credentials.username),
      SecureStore.setItemAsync("admin-suite.password", credentials.password),
    ]);

    setUser(u);
  };

  const signUpWithClerk = async (email: string, password: string) => {
    if (!isSignUpLoaded) throw new Error("Authentication service is loading. Please try again.");
    
    await signUp.create({
      emailAddress: email,
      password: password,
    });
    
    await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
  };

  const verifyClerkEmailCode = async (email: string, code: string, password: string) => {
    if (!isSignUpLoaded) throw new Error("Authentication service is loading. Please try again.");
    
    const completeSignUp = await signUp.attemptEmailAddressVerification({
      code,
    });
    
    if (completeSignUp.status !== "complete") {
      throw new Error("Invalid verification code. Please try again.");
    }
    
    await setSignUpActive({ session: completeSignUp.createdSessionId });
    
    // Register the user on the Django backend
    await apiService.signup({
      email,
      password,
      confirm_password: password,
    });
    
    // Log in to get Django token
    await login({ username: email, password });
  };

  const logout = async () => {
    try {
      await signOut();
    } catch (e) {
      console.warn("Clerk sign out error:", e);
    }
    await SecureStore.deleteItemAsync(TOKEN_KEY);
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
        login,
        signUpWithClerk,
        verifyClerkEmailCode,
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
