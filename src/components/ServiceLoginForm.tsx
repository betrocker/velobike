import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, View } from "react-native";

import { getCurrentTenantContext, MissingProfileError, MissingTenantError } from "@/lib/data";
import { signInWithEmail } from "@/lib/auth";

import { AppButton } from "./AppButton";
import { FormTextInput } from "./FormTextInput";

type FieldName = "email" | "password";

export function ServiceLoginForm() {
  const router = useRouter();
  const { t } = useTranslation();
  const [focusedField, setFocusedField] = useState<FieldName | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = email.trim().length > 3 && password.length >= 6 && !isSubmitting;

  async function handleSubmit() {
    if (!canSubmit) {
      Alert.alert(t("auth.errors.missingAdminDataTitle"), t("auth.errors.missingLoginDataMessage"));
      return;
    }

    setIsSubmitting(true);

    const result = await signInWithEmail(email, password);

    setIsSubmitting(false);

    if (!result) {
      return;
    }

    try {
      const context = await getCurrentTenantContext();
      router.replace(context?.profile.role === "admin" ? "/admin" : "/staff");
    } catch (error) {
      console.error("[login] failed to resolve tenant context", error);

      if (error instanceof MissingProfileError || error instanceof MissingTenantError) {
        Alert.alert(t("auth.errors.missingServiceTitle"), t("auth.errors.missingServiceMessage"));
        return;
      }

      Alert.alert(t("common.error"), t("auth.errors.loadServiceMessage"));
    }
  }

  return (
    <View>
      <View className="gap-4">
        <FormTextInput
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          focused={focusedField === "email"}
          inputMode="email"
          keyboardType="email-address"
          label={t("auth.fields.email")}
          onBlur={() => setFocusedField(null)}
          onChangeText={setEmail}
          onFocus={() => setFocusedField("email")}
          placeholder={t("auth.placeholders.email")}
          returnKeyType="next"
          textContentType="emailAddress"
          value={email}
        />

        <FormTextInput
          autoCapitalize="none"
          autoComplete="current-password"
          autoCorrect={false}
          focused={focusedField === "password"}
          isPassword
          label={t("auth.fields.password")}
          onBlur={() => setFocusedField(null)}
          onChangeText={setPassword}
          onFocus={() => setFocusedField("password")}
          placeholder={t("auth.placeholders.currentPassword")}
          returnKeyType="done"
          textContentType="password"
          value={password}
        />
      </View>

      <AppButton
        className="mt-6"
        disabled={!canSubmit}
        onPress={handleSubmit}
        title={isSubmitting ? t("auth.login.submitting") : t("auth.login.submit")}
      />
    </View>
  );
}
