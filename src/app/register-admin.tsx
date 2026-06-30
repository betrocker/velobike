import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackButton } from '@/components/AppBackButton';
import { AppButton } from '@/components/AppButton';
import { FormTextInput } from '@/components/FormTextInput';
import { signUpAsAdmin } from '@/lib/auth';

type FieldName = 'fullName' | 'email' | 'password' | 'companyName';

export default function RegisterAdminScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [focusedField, setFocusedField] = useState<FieldName | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit =
    fullName.trim().length > 1 &&
    email.trim().length > 3 &&
    password.length >= 6 &&
    companyName.trim().length > 1 &&
    !isSubmitting;

  async function handleSubmit() {
    if (!canSubmit) {
      Alert.alert(t('auth.errors.missingAdminDataTitle'), t('auth.errors.missingAdminDataMessage'));
      return;
    }

    setIsSubmitting(true);

    const result = await signUpAsAdmin(email, password, fullName, companyName);

    setIsSubmitting(false);

    if (result) {
      Alert.alert(t('auth.admin.successTitle'), t('auth.admin.successMessage'));
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-ds-bg">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={16}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled">
          <View className="flex-1 px-ds-screen pt-5">
            <AppBackButton onPress={() => router.back()} />

            <View className="mt-10">
              <Text className="font-inter-semibold text-vb-xs uppercase text-ds-accent">
                {t('auth.admin.eyebrow')}
              </Text>
              <Text className="font-inter-bold mt-4 text-vb-xl text-ds-text">
                {t('auth.admin.title')}
              </Text>
              <Text className="font-inter mt-4 text-vb-base text-ds-muted">
                {t('auth.admin.subtitle')}
              </Text>
            </View>

            <View className="mt-10 gap-5">
              <FormTextInput
                autoCapitalize="words"
                autoComplete="name"
                focused={focusedField === 'fullName'}
                label={t('auth.fields.fullName')}
                onBlur={() => setFocusedField(null)}
                onChangeText={setFullName}
                onFocus={() => setFocusedField('fullName')}
                placeholder={t('auth.placeholders.fullNameAdmin')}
                returnKeyType="next"
                value={fullName}
              />

              <FormTextInput
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                focused={focusedField === 'email'}
                inputMode="email"
                keyboardType="email-address"
                label={t('auth.fields.email')}
                onBlur={() => setFocusedField(null)}
                onChangeText={setEmail}
                onFocus={() => setFocusedField('email')}
                placeholder={t('auth.placeholders.email')}
                returnKeyType="next"
                textContentType="emailAddress"
                value={email}
              />

              <FormTextInput
                autoCapitalize="none"
                autoComplete="new-password"
                autoCorrect={false}
                focused={focusedField === 'password'}
                isPassword
                label={t('auth.fields.password')}
                onBlur={() => setFocusedField(null)}
                onChangeText={setPassword}
                onFocus={() => setFocusedField('password')}
                placeholder={t('auth.placeholders.newPassword')}
                returnKeyType="next"
                textContentType="newPassword"
                value={password}
              />

              <FormTextInput
                autoCapitalize="words"
                focused={focusedField === 'companyName'}
                label={t('auth.fields.companyName')}
                onBlur={() => setFocusedField(null)}
                onChangeText={setCompanyName}
                onFocus={() => setFocusedField('companyName')}
                placeholder={t('auth.placeholders.companyName')}
                returnKeyType="done"
                value={companyName}
              />
            </View>

            <View className="mt-auto pt-10">
              <AppButton
                disabled={!canSubmit}
                onPress={handleSubmit}
                title={isSubmitting ? t('auth.admin.submitting') : t('auth.admin.submit')}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
