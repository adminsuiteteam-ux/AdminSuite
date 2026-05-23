import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

const AUTH_KEY = "admin-suite:auth";
const TOUR_KEY = "admin-suite:tour-complete";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [tourComplete, setTourComplete] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [authRaw, tourRaw] = await Promise.all([
          AsyncStorage.getItem(AUTH_KEY),
          AsyncStorage.getItem(TOUR_KEY),
        ]);
        if (authRaw) setUser(JSON.parse(authRaw));
        if (tourRaw === "true") setTourComplete(true);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const login = async ({ email, name, role }) => {
    const u = {
      email,
      name: name || email.split("@")[0],
      role: role || "admin",
      initials: (name || email).slice(0, 2).toUpperCase(),
    };
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(u));
    setUser(u);
    return u;
  };

  const logout = async () => {
    await AsyncStorage.removeItem(AUTH_KEY);
    setUser(null);
  };

  const completeTour = async () => {
    await AsyncStorage.setItem(TOUR_KEY, "true");
    setTourComplete(true);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, tourComplete, completeTour }}
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
