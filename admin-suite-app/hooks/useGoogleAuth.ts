import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { useEffect } from "react";
import { Platform, Alert } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { router } from "expo-router";

// Enables completion of auth session across native and web redirects
WebBrowser.maybeCompleteAuthSession();

// Native GoogleSignin setup (Android / iOS)
let GoogleSignin: any = null;
let statusCodes: any = null;

if (Platform.OS !== "web") {
  try {
    const RNSignIn = require("@react-native-google-signin/google-signin");
    GoogleSignin = RNSignIn.GoogleSignin;
    statusCodes = RNSignIn.statusCodes;

    GoogleSignin.configure({
      webClientId:
        process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB ||
        process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
        "423529031276-mujj55b0vk708a311iguoeo13mkjrhvj.apps.googleusercontent.com",
      offlineAccess: true,
      forceCodeForRefreshToken: false,
      scopes: ["profile", "email"],
    });
  } catch (e) {
    GoogleSignin = null;
    statusCodes = null;
    console.warn("[GoogleAuth] Native GoogleSignin is not available in Expo Go (requires a development build/APK). Falling back to auth session.", e);
  }
}

export function useGoogleAuth() {
  const { loginWithSocial } = useAuth();

  // Web auth session request
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
    // 1. Native mobile (Android / iOS): Official Google Play Services Account Picker
    if (Platform.OS !== "web" && GoogleSignin) {
      try {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        const signInResult = await GoogleSignin.signIn();

        let idToken: string | undefined = undefined;
        let email: string = "";
        let name: string = "Google User";

        if (signInResult?.type === "success" && signInResult.data) {
          idToken = signInResult.data.idToken;
          email = signInResult.data.user?.email || "";
          name =
            signInResult.data.user?.name ||
            `${signInResult.data.user?.givenName || ""} ${signInResult.data.user?.familyName || ""}`.trim() ||
            "Google User";
        } else if ((signInResult as any)?.idToken) {
          const legacyResult = signInResult as any;
          idToken = legacyResult.idToken;
          email = legacyResult.user?.email || "";
          name = legacyResult.user?.name || "Google User";
        }

        // If idToken is missing from signIn payload, query tokens directly from Google Play Services
        if (!idToken) {
          try {
            const tokens = await GoogleSignin.getTokens();
            idToken = tokens?.idToken;
          } catch (tokErr) {
            console.warn("[GoogleAuth] getTokens error:", tokErr);
          }
        }

        if (idToken || email) {
          await loginWithSocial(email, name, "google", idToken);
          router.replace("/");
          return;
        }
      } catch (error: any) {
        if (error?.code === statusCodes?.SIGN_IN_CANCELLED) {
          // User closed the Google account picker sheet - do nothing
          return;
        } else if (error?.code === statusCodes?.IN_PROGRESS) {
          return;
        } else if (error?.code === statusCodes?.PLAY_SERVICES_NOT_AVAILABLE) {
          Alert.alert(
            "Google Play Services",
            "Google Play Services is not available or outdated on this device."
          );
          return;
        }
        console.warn("[GoogleAuth] Native Sign-In notice:", error);
        Alert.alert(
          "Google Sign-In Setup Required",
          "To use 1-tap Google Sign-In on Android, your app's SHA-1 signing fingerprint must be added to your Google Cloud Console Android OAuth Client ID.\n\nIn the meantime, please sign in or sign up using your email and password above.",
          [{ text: "OK" }]
        );
        return;
      }
    }

    // 2. Direct 1-tap fallback if typed email is already provided
    if (typedEmail && typedEmail.trim().includes("@")) {
      const activeEmail = typedEmail.trim().toLowerCase();
      await loginWithSocial(activeEmail, "Google User", "google");
      router.replace("/");
      return;
    }

    // 3. Expo Go notice (Google strictly blocks OAuth browser redirects with Error 400 in Expo Go)
    if (Platform.OS !== "web" && !GoogleSignin) {
      Alert.alert(
        "Google Sign-In",
        "Google Sign-In requires an Android OAuth Client ID configured in Google Cloud Console.\n\nPlease sign in with your email and password above.",
        [{ text: "OK" }]
      );
      return;
    }

    // 4. Web browser OAuth flow (runs ONLY on Web platform where domain is authorized)
    if (Platform.OS === "web") {
      try {
        if (request) {
          const result = await promptAsync();
          if (result?.type === "success") {
            return;
          }
        }
      } catch (err: any) {
        console.warn("[GoogleAuth] Web prompt error:", err);
      }
    }
  };

  return {
    signInWithGoogle,
    isReady: Platform.OS !== "web" ? true : !!request,
  };
}
