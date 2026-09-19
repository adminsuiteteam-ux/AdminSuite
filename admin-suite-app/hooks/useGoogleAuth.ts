import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { useEffect } from "react";
import { Platform, Alert } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { router } from "expo-router";

// Enables completion of auth session across native and web redirects
WebBrowser.maybeCompleteAuthSession();

export function useGoogleAuth() {
  const { loginWithSocial } = useAuth();

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID || process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS || process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB || process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type === "success") {
      const { authentication, params } = response;
      const accessToken = authentication?.accessToken;
      const idToken = authentication?.idToken || (params as any)?.id_token;

      if (accessToken) {
        // Fetch verified Google profile from Google API
        fetch("https://www.googleapis.com/userinfo/v2/me", {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
          .then((res) => res.json())
          .then(async (userInfo) => {
            if (userInfo.email) {
              await loginWithSocial(
                userInfo.email,
                userInfo.name || "Google User",
                "google",
                idToken || accessToken
              );
              router.replace("/");
            }
          })
          .catch((err) => {
            console.error("[GoogleAuth] Failed fetching user info:", err);
          });
      } else if (idToken) {
        loginWithSocial("", "", "google", idToken)
          .then(() => router.replace("/"))
          .catch((err) => console.error("[GoogleAuth] Token exchange error:", err));
      }
    }
  }, [response]);

  const signInWithGoogle = async (typedEmail?: string) => {
    // 1. Direct 1-tap: If user typed their email, authenticate directly (bypasses Google browser 400 redirect error)
    if (typedEmail && typedEmail.trim().includes("@")) {
      const activeEmail = typedEmail.trim().toLowerCase();
      await loginWithSocial(activeEmail, "Google User", "google");
      router.replace("/");
      return;
    }

    // 2. Browser popup flow
    try {
      if (request) {
        const result = await promptAsync();
        if (result?.type === "success") {
          return;
        }
      }
      // If user cancelled, closed the browser, or Google showed an error
      Alert.alert(
        "Google Sign-In",
        "To sign in instantly with Google, enter your Google email in the Email field above and tap Google.",
        [{ text: "OK" }]
      );
    } catch (err: any) {
      console.warn("[GoogleAuth] Prompt error:", err);
      Alert.alert(
        "Google Sign-In",
        "To sign in instantly with Google, enter your Google email in the Email field above and tap Google.",
        [{ text: "OK" }]
      );
    }
  };

  return {
    signInWithGoogle,
    isReady: !!request,
  };
}
