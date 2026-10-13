import { Audio } from "expo-av";
import { Platform } from "react-native";

let sentSound: Audio.Sound | null = null;
let receivedSound: Audio.Sound | null = null;
let isAudioConfigured = false;

async function ensureAudioMode() {
  if (isAudioConfigured || Platform.OS === "web") return;
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
    isAudioConfigured = true;
  } catch (e) {
    // Audio mode configuration failed, ignore non-fatal error
  }
}

/**
 * Play subtle pop/tick sound when message is sent
 */
export async function playMessageSentSound(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await ensureAudioMode();
    if (!sentSound) {
      const { sound } = await Audio.Sound.createAsync(
        require("@/assets/sounds/message_sent.wav"),
        { shouldPlay: false, volume: 0.85 }
      );
      sentSound = sound;
    }
    await sentSound.setPositionAsync(0);
    await sentSound.playAsync();
  } catch (err) {
    // Audio error should never disrupt chat messaging flow
    try {
      sentSound = null;
    } catch {}
  }
}

/**
 * Play pleasant two-tone chime when a new message arrives
 */
export async function playMessageReceivedSound(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await ensureAudioMode();
    if (!receivedSound) {
      const { sound } = await Audio.Sound.createAsync(
        require("@/assets/sounds/message_received.wav"),
        { shouldPlay: false, volume: 1.0 }
      );
      receivedSound = sound;
    }
    await receivedSound.setPositionAsync(0);
    await receivedSound.playAsync();
  } catch (err) {
    try {
      receivedSound = null;
    } catch {}
  }
}
