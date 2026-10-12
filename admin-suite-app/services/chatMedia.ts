import { Platform, Alert, Linking } from "react-native";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { getMediaUrl } from "@/services/api";

/**
 * Robust playback helper for chat voice notes.
 * Pre-caches remote audio files to local storage on native platforms to prevent
 * Android MediaPlayer/ExoPlayer streaming errors, and configures audio routing.
 */
export async function playChatVoiceNote({
  msgId,
  audioUrl,
  currentSoundRef,
  playingAudioId,
  setPlayingAudioId,
  onError,
}: {
  msgId: number;
  audioUrl: string;
  currentSoundRef: { current: Audio.Sound | null };
  playingAudioId: number | null;
  setPlayingAudioId: (id: number | null) => void;
  onError?: (err: any) => void;
}) {
  try {
    // If the user tapped the currently playing voice note, pause/stop it
    if (playingAudioId === msgId && currentSoundRef.current) {
      await currentSoundRef.current.stopAsync();
      await currentSoundRef.current.unloadAsync().catch(() => {});
      currentSoundRef.current = null;
      setPlayingAudioId(null);
      return;
    }

    // Stop and unload any previous sound
    if (currentSoundRef.current) {
      try {
        await currentSoundRef.current.stopAsync();
        await currentSoundRef.current.unloadAsync();
      } catch {}
      currentSoundRef.current = null;
    }

    // Configure audio mode for playback
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    const fullUrl = getMediaUrl(audioUrl);
    let playbackUri = fullUrl;

    // On native devices, pre-cache remote URLs to local cache directory to prevent
    // Android ExoPlayer HTTP streaming timeouts / format errors
    if (Platform.OS !== "web" && (fullUrl.startsWith("http://") || fullUrl.startsWith("https://"))) {
      try {
        const cleanName = fullUrl.split("?")[0].split("/").pop() || `voice_${msgId}.m4a`;
        const fname = cleanName.endsWith(".m4a") || cleanName.endsWith(".mp3") || cleanName.endsWith(".wav") || cleanName.endsWith(".aac")
          ? cleanName
          : `${cleanName}.m4a`;
        const localTarget = `${FileSystem.cacheDirectory}${msgId}_${fname}`;
        const fileInfo = await FileSystem.getInfoAsync(localTarget);

        if (fileInfo.exists && (fileInfo as any).size > 0) {
          playbackUri = localTarget;
        } else {
          const downloadRes = await FileSystem.downloadAsync(fullUrl, localTarget);
          playbackUri = downloadRes.uri;
        }
      } catch (cacheErr) {
        console.warn("[chatMedia] Audio pre-cache failed, trying direct playback:", cacheErr);
        playbackUri = fullUrl;
      }
    }

    const { sound } = await Audio.Sound.createAsync(
      { uri: playbackUri },
      { shouldPlay: true, progressUpdateIntervalMillis: 200 }
    );

    currentSoundRef.current = sound;
    setPlayingAudioId(msgId);

    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        setPlayingAudioId(null);
        sound.unloadAsync().catch(() => {});
        currentSoundRef.current = null;
      }
    });
  } catch (err: any) {
    console.error("[chatMedia] Failed to play voice note:", err);
    setPlayingAudioId(null);
    if (onError) {
      onError(err);
    } else {
      Alert.alert("Audio Error", err?.message || "Could not play voice note.");
    }
  }
}

/**
 * Downloads a remote file to local cache and opens the system Share/Open dialog,
 * enabling document previews, PDF readers, MS Word, and video player applications.
 */
export async function openOrShareMedia(url: string, filename?: string | null) {
  if (!url) return;
  const fullUrl = getMediaUrl(url);

  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      window.open(fullUrl, "_blank");
    }
    return;
  }

  try {
    const rawName = filename || fullUrl.split("?")[0].split("/").pop() || `file_${Date.now()}`;
    const sanitizedName = rawName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const localTarget = `${FileSystem.cacheDirectory}${sanitizedName}`;

    const info = await FileSystem.getInfoAsync(localTarget);
    let targetUri = localTarget;

    if (!info.exists || (info as any).size === 0) {
      const downloadRes = await FileSystem.downloadAsync(fullUrl, localTarget);
      targetUri = downloadRes.uri;
    }

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(targetUri, {
        dialogTitle: filename || "Open Document",
      });
    } else {
      await Linking.openURL(fullUrl);
    }
  } catch (err: any) {
    console.error("[chatMedia] Error opening/sharing media:", err);
    try {
      await Linking.openURL(fullUrl);
    } catch {
      Alert.alert("Open Error", "Could not open or download attachment.");
    }
  }
}
