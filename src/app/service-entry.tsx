import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackButton } from '@/components/AppBackButton';
import { AppButton } from '@/components/AppButton';
import { ServiceLoginForm } from '@/components/ServiceLoginForm';

export default function ServiceEntryScreen() {
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

            <View className="mt-10">
              <Text className="font-inter-semibold text-vb-xs uppercase text-ds-accent">
                {t('serviceEntry.eyebrow')}
              </Text>

              <Text className="font-inter-bold mt-4 text-vb-xl text-ds-text">
                {t('serviceEntry.title')}
              </Text>

              <Text className="font-inter mt-4 max-w-sm text-vb-sm text-ds-muted">
                {t('serviceEntry.subtitle')}
              </Text>
            </View>

            <View className="mt-9">
              <ServiceLoginForm />
            </View>

            <View className="mt-auto pt-8">
              <View className="gap-3">
                <AppButton
                  onPress={() => router.push('/register-admin')}
                  title={t('serviceEntry.registerAdmin')}
                  variant="secondary"
                />

                <AppButton
                  onPress={() => router.push('/register-staff')}
                  title={t('serviceEntry.registerStaffWithCode')}
                  variant="secondary"
                />
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
