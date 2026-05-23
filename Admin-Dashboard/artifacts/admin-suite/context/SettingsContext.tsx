import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

const KEY = "admin-suite:settings";

export const CURRENCIES = [
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

const Ctx = createContext(null);

export function SettingsProvider({ children }) {
  const [currencyCode, setCurrencyCode] = useState("NGN");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) {
          const s = JSON.parse(raw);
          if (s.currencyCode) setCurrencyCode(s.currencyCode);
        }
      } catch {}
      setLoaded(true);
    })();
  }, []);

  const setCurrency = async (code) => {
    setCurrencyCode(code);
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify({ currencyCode: code }));
    } catch {}
  };

  const currency =
    CURRENCIES.find((c) => c.code === currencyCode) || CURRENCIES[0];

  return (
    <Ctx.Provider value={{ currency, setCurrency, loaded }}>
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
  return (n) => {
    const sign = n < 0 ? "-" : "";
    const abs = Math.abs(n).toLocaleString("en-US", {
      maximumFractionDigits: 0,
    });
    const space = currency.symbol.length > 1 ? " " : "";
    return `${sign}${currency.symbol}${space}${abs}`;
  };
}
