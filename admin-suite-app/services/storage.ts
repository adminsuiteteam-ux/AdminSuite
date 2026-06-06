/**
 * Cross-platform secure storage utility.
 * Uses expo-secure-store on native (iOS/Android) and localStorage on web.
 */
import { Platform } from 'react-native';

let SecureStore: typeof import('expo-secure-store') | null = null;

if (Platform.OS !== 'web') {
  // Only import SecureStore on native platforms
  SecureStore = require('expo-secure-store');
}

export async function getItemAsync(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  return SecureStore!.getItemAsync(key);
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      localStorage.setItem(key, value);
    } catch {
      // localStorage unavailable (e.g. private browsing quota exceeded)
    }
    return;
  }
  return SecureStore!.setItemAsync(key, value);
}

export async function deleteItemAsync(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      localStorage.removeItem(key);
    } catch {
      // noop
    }
    return;
  }
  return SecureStore!.deleteItemAsync(key);
}
