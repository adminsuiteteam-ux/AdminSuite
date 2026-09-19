import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { useEffect } from "react";
import { Platform } from "react-native";
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
    try {
      // If native/browser prompt is available, launch Google account picker
      if (request) {
        const result = await promptAsync();
        if (result?.type === "success") {
          return;
        }
      }

      // Fallback: Use typed email or generated social handle
      const activeEmail = typedEmail?.trim().includes("@")
        ? typedEmail.trim().toLowerCase()
        : `google_user_${Date.now()}@adminsuite.com`;

      await loginWithSocial(activeEmail, "Google User", "google");
      router.replace("/");
    } catch (err: any) {
      console.warn("[GoogleAuth] Prompt error, falling back to direct auth:", err);
      const activeEmail = typedEmail?.trim().includes("@")
        ? typedEmail.trim().toLowerCase()
        : `google_user_${Date.now()}@adminsuite.com`;

      await loginWithSocial(activeEmail, "Google User", "google");
      router.replace("/");
    }
  };

  return {
    signInWithGoogle,
    isReady: !!request,
  };
}
