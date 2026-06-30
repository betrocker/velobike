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
import { CodeTextInput, FormTextInput } from '@/components/FormTextInput';
import { signUpAsStaff } from '@/lib/auth';

type FieldName = 'inviteCode' | 'fullName' | 'email' | 'password';

export default function RegisterStaffScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [focusedField, setFocusedField] = useState<FieldName | null>(null);
  const [inviteCode, setInviteCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit =
    inviteCode.trim().length >= 4 &&
    fullName.trim().length > 1 &&
    email.trim().length > 3 &&
    password.length >= 6 &&
    !isSubmitting;

  function handleInviteCodeChange(value: string) {
    setInviteCode(value.toUpperCase());
  }

  async function handleSubmit() {
    if (!canSubmit) {
      Alert.alert(t('auth.errors.missingAdminDataTitle'), t('auth.errors.missingStaffDataMessage'));
      return;
    }

    setIsSubmitting(true);

    const result = await signUpAsStaff(email, password, fullName, inviteCode);

    setIsSubmitting(false);

    if (result) {
      Alert.alert(t('auth.staff.successTitle'), t('auth.staff.successMessage'));
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
                {t('auth.staff.eyebrow')}
              </Text>
              <Text className="font-inter-bold mt-4 text-vb-xl text-ds-text">
                {t('auth.staff.title')}
              </Text>
              <Text className="font-inter mt-4 text-vb-base text-ds-muted">
                {t('auth.staff.subtitle')}
              </Text>
            </View>

            <View className="mt-10">
              <CodeTextInput
                focused={focusedField === 'inviteCode'}
                label={t('auth.fields.inviteCode')}
                onBlur={() => setFocusedField(null)}
                onChangeText={handleInviteCodeChange}
                onFocus={() => setFocusedField('inviteCode')}
                placeholder={t('auth.placeholders.inviteCode')}
                returnKeyType="next"
                value={inviteCode}
              />
            </View>

            <View className="mt-8 gap-5">
              <FormTextInput
                autoCapitalize="words"
                autoComplete="name"
                focused={focusedField === 'fullName'}
                label={t('auth.fields.fullName')}
                onBlur={() => setFocusedField(null)}
                onChangeText={setFullName}
                onFocus={() => setFocusedField('fullName')}
                placeholder={t('auth.placeholders.fullNameStaff')}
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
                returnKeyType="done"
                textContentType="newPassword"
                value={password}
              />
            </View>

            <View className="mt-auto pt-10">
              <AppButton
                disabled={!canSubmit}
                onPress={handleSubmit}
                title={isSubmitting ? t('auth.staff.submitting') : t('auth.staff.submit')}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
