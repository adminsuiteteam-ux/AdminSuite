import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth } from "./AuthContext";

const KEY = "admin-suite:settings";

export type Currency = {
  code: string;
  symbol: string;
  name: string;
};

export const CURRENCIES: Currency[] = [
  { code: "NGN", symbol: "₦", name: "Nigerian Naira" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "KES", symbol: "KSh", name: "Kenyan Shilling" },
  { code: "GHS", symbol: "₵", name: "Ghanaian Cedi" },
  { code: "ZAR", symbol: "R", name: "South African Rand" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
];

export type ThemeMode = "light" | "dark" | "system";

type SettingsContextType = {
  currency: Currency;
  setCurrency: (code: string) => Promise<void>;
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => Promise<void>;
  biometricsEnabled: boolean;
  setBiometricsEnabled: (enabled: boolean) => Promise<void>;
  loaded: boolean;
};

const Ctx = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currencyCode, setCurrencyCode] = useState("NGN");
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const [biometricsEnabled, setBiometricsEnabledState] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load global settings
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) {
          const s = JSON.parse(raw);
          if (s.currencyCode) setCurrencyCode(s.currencyCode);
          if (s.theme) setThemeMode(s.theme);
        }
      } catch {}
    })();
  }, []);

  // Sync user-specific biometric settings whenever user changes
  useEffect(() => {
    if (!user) {
      setBiometricsEnabledState(false);
      setLoaded(true);
      return;
    }
    (async () => {
      try {
        const key = `admin-suite:biometrics:${user.id}`;
        const val = await AsyncStorage.getItem(key);
        setBiometricsEnabledState(val === "true");
      } catch {
        setBiometricsEnabledState(false);
      }
      setLoaded(true);
    })();
  }, [user?.id]);

  const setCurrency = async (code: string) => {
    setCurrencyCode(code);
    try {
      const raw = await AsyncStorage.getItem(KEY);
      const s = raw ? JSON.parse(raw) : {};
      await AsyncStorage.setItem(KEY, JSON.stringify({ ...s, currencyCode: code }));
    } catch {}
  };

  const setTheme = async (mode: ThemeMode) => {
    setThemeMode(mode);
    try {
      const raw = await AsyncStorage.getItem(KEY);
      const s = raw ? JSON.parse(raw) : {};
      await AsyncStorage.setItem(KEY, JSON.stringify({ ...s, theme: mode }));
    } catch {}
  };

  const setBiometricsEnabled = async (enabled: boolean) => {
    if (!user) return;
    setBiometricsEnabledState(enabled);
    try {
      const key = `admin-suite:biometrics:${user.id}`;
      await AsyncStorage.setItem(key, enabled ? "true" : "false");
    } catch {}
  };

  const currency =
    CURRENCIES.find((c) => c.code === currencyCode) || CURRENCIES[0];

  return (
    <Ctx.Provider
      value={{
        currency,
        setCurrency,
        theme: themeMode,
        setTheme,
        biometricsEnabled,
        setBiometricsEnabled,
        loaded,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(Ctx);
  if (!ctx)
    throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}

export function useCurrencyFmt() {
  const { currency } = useSettings();
  return (n: number) => {
    const sign = n < 0 ? "-" : "";
    const abs = Math.abs(n).toLocaleString("en-US", {
      maximumFractionDigits: 0,
    });
    const space = currency.symbol.length > 1 ? " " : "";
    return `${sign}${currency.symbol}${space}${abs}`;
  };
}
