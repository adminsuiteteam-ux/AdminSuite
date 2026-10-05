import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from './api';

const PUSH_TOKEN_KEY = 'push_device_token';

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  // Check if running inside Expo Go to avoid crashing/redbox error on SDK 53 Android
  const isExpoGo = Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient';
  if (isExpoGo) {
    console.log('[Notification] Skipping push notifications registration in Expo Go client.');
    return null;
  }

  if (!Device.isDevice) {
    console.log('[Notification] Must use a physical device for Push Notifications');
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Notification] Permission not granted for push notifications');
      return null;
    }

    // Ensure Android Notification Channel is set up with high priority and lockscreen visibility
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7A',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    }

    // Retrieve EAS Project ID with robust fallbacks
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as any).easConfig?.projectId ??
      '03fb612c-593e-40ea-a7be-871606c77a6a';

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    
    const token = tokenData.data;
    console.log('[Notification] Registered Token:', token);

    // Register token with the backend
    await apiService.registerDeviceToken({
      expo_push_token: token,
      device_name: Device.modelName || 'Unknown Device',
      device_type: Platform.OS,
    });

    // Cache push token locally for unregistering on logout
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);

    return token;
  } catch (error) {
    console.error('[Notification] Failed to register push notifications:', error);
    return null;
  }
}

export async function unregisterFromPushNotificationsAsync(): Promise<void> {
  try {
    const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (token) {
      // API call to backend to remove device token association
      await apiService.unregisterDeviceToken({ expo_push_token: token });
      await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
      console.log('[Notification] Unregistered push token from server');
    }
  } catch (error) {
    console.error('[Notification] Failed to unregister push token:', error);
  }
}
