import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

export default function TermsConditionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const handleOpenEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          hitSlop={12}
        >
          <Feather name="chevron-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          Terms &amp; Conditions
        </Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {/* Badge & Meta */}
        <View style={[styles.badge, { backgroundColor: colors.primary + "1A", borderColor: colors.primary + "33" }]}>
          <Feather name="file-text" size={14} color={colors.primary} />
          <Text style={[styles.badgeText, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>
            User Agreement &amp; Terms of Service
          </Text>
        </View>

        <Text style={[styles.metaText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          Application: Admin Suite{"\n"}
          Owner: ThirdParti{"\n"}
          Effective Date: October 5, 2026
        </Text>

        {/* Section 1 */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.heading, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            1. Acceptance of Terms
          </Text>
          <Text style={[styles.paragraph, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            By downloading, registering, or accessing Admin Suite, you agree to be bound by these Terms and our Privacy Policy. If you do not agree, you must discontinue using our services immediately.
          </Text>
        </View>

        {/* Section 2 - Age Requirement */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.heading, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            2. Age Requirements &amp; Legal Capacity (COPPA)
          </Text>
          <Text style={[styles.paragraph, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Admin Suite is a business-to-business workplace management application. You must be at least eighteen (18) years of age, or the age of legal majority in your jurisdiction, to create an account or use the application. The Services are not intended for individuals under 18 years of age, and we do not knowingly collect personal data from minors.
          </Text>
        </View>

        {/* Section 3 */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.heading, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            3. Workspace Roles &amp; Responsibilities
          </Text>
          <Text style={[styles.paragraph, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            • Workspace Administrators manage employee rosters, shift assignments, payroll calculations, and organizational parameters.{"\n"}
            • Employees and members agree that their attendance logs, assigned tasks, and public workspace records are administered by their organization.
          </Text>
        </View>

        {/* Section 4 */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.heading, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            4. Acceptable Use Policy
          </Text>
          <Text style={[styles.paragraph, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Users agree not to transmit abusive or unlawful content, disrupt platform security, conduct unauthorized surveillance, or attempt to reverse-engineer Admin Suite software.
          </Text>
        </View>

        {/* Section 5 - User Content & DMCA Safe Harbor */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.heading, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            5. User Content, Avatars &amp; DMCA Copyright Policy
          </Text>
          <Text style={[styles.paragraph, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            You retain ownership of any profile avatars, company logos, documents, and chat attachments you upload. However, you represent and warrant that you own or possess all requisite rights, licenses, and permissions to upload such content, and that your uploads do not infringe the intellectual property or privacy rights of any third party.{"\n\n"}
            You agree to indemnify and hold harmless Admin Suite against any third-party claims or damages arising from content you upload.{"\n\n"}
            <Text style={{ fontFamily: "Inter_600SemiBold", color: colors.foreground }}>DMCA Notice &amp; Takedown Procedure:</Text> In accordance with 17 U.S.C. § 512, if you believe that material hosted on Admin Suite infringes your copyright, you may submit a takedown notification to our Designated Copyright Agent at: dmca@adminsuite.com including (a) identification of the copyrighted work, (b) specific location of the infringing material, and (c) your contact information.
          </Text>
        </View>

        {/* Section 6 - Subscription & Auto-Renewal */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.heading, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            6. Subscription Billing &amp; Auto-Renewal Terms
          </Text>
          <Text style={[styles.paragraph, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Paid organization subscriptions automatically renew at the conclusion of each billing cycle (monthly or annually) at the then-current rate unless cancelled prior to renewal. You may cancel your subscription at any time through your Workspace Settings &gt; Subscriptions or by emailing support@adminsuite.com. Cancellation prevents subsequent billing cycles.
          </Text>
        </View>

        {/* Section 7 */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.heading, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            7. Voice &amp; Video Calling Disclaimer
          </Text>
          <Text style={[styles.paragraph, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Real-time calls are provided for internal workplace collaboration. Admin Suite does NOT support emergency telephone calls (e.g., 911, 112, 999). Traditional telephone access must be maintained for emergency services.
          </Text>
        </View>

        {/* Section 8 */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.heading, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            8. Disclaimers &amp; Limitation of Liability
          </Text>
          <Text style={[styles.paragraph, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            The Services are provided "as is" without warranty of any kind. To the maximum extent permitted by applicable law, Admin Suite is not liable for indirect, incidental, punitive, or consequential damages resulting from service interruptions or workplace administrative decisions.
          </Text>
        </View>

        {/* Section 9 - Contact */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.heading, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            9. Legal Notices &amp; Inquiries
          </Text>
          <Text style={[styles.paragraph, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            For legal notices, DMCA inquiries, or questions regarding these terms, contact our compliance team:
          </Text>
          <Pressable
            onPress={() => handleOpenEmail("legal@adminsuite.com")}
            style={[styles.emailBtn, { backgroundColor: colors.primary }]}
          >
            <Feather name="mail" size={16} color="#fff" />
            <Text style={[styles.emailBtnText, { fontFamily: "Inter_600SemiBold" }]}>
              Email legal@adminsuite.com
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  title: { fontSize: 18 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 8,
  },
  badgeText: { fontSize: 12 },
  metaText: { fontSize: 13, lineHeight: 18, marginBottom: 18 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
  heading: { fontSize: 16, marginBottom: 10 },
  paragraph: { fontSize: 13, lineHeight: 20, marginBottom: 8 },
  emailBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 10,
  },
  emailBtnText: { color: "#fff", fontSize: 14 },
});
