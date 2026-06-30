import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackButton } from '@/components/AppBackButton';
import { ServiceLoginForm } from '@/components/ServiceLoginForm';

export default function LoginScreen() {
  const router = useRouter();
  const { t } = useTranslation();

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

            <View className="flex-1 justify-center">
              <Text className="font-inter-semibold text-vb-xs uppercase text-ds-accent">
                {t('auth.login.eyebrow')}
              </Text>
              <Text className="font-inter-bold mt-4 text-vb-xl text-ds-text">
                {t('auth.login.title')}
              </Text>
              <Text className="font-inter mt-4 text-vb-base text-ds-muted">
                {t('auth.login.subtitle')}
              </Text>

              <View className="mt-10">
                <ServiceLoginForm />
              </View>
            </View>

            <View className="pt-8">
              <Pressable
                className="items-center py-3"
                onPress={() => router.push('/register-staff')}>
                <Text className="font-inter-medium text-vb-sm text-ds-subtle">
                  {t('auth.login.staffRegisterPrompt')}{' '}
                  <Text className="text-ds-muted">{t('auth.login.staffRegisterAction')}</Text>
                </Text>
              </Pressable>

              <Pressable className="mt-6 items-center py-3" onPress={() => router.replace('/')}>
                <Text className="font-inter-medium text-vb-sm text-ds-subtle">
                  {t('auth.login.noAccountPrompt')}{' '}
                  <Text className="text-ds-muted">{t('auth.login.backToStart')}</Text>
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
