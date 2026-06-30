import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { colors } from '@/design/tokens';
import { getCurrentTenantContext, MissingProfileError, MissingTenantError } from '@/lib/data';

export default function WelcomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function redirectExistingSession() {
      try {
        const context = await getCurrentTenantContext();

        if (!isMounted) {
          return;
        }

        if (context) {
          router.replace(context.profile.role === 'admin' ? '/admin' : '/staff');
          return;
        }
      } catch (error) {
        if (!(error instanceof MissingProfileError || error instanceof MissingTenantError)) {
          console.error('[welcome] failed to restore session', error);
        }
      } finally {
        if (isMounted) {
          setIsCheckingSession(false);
        }
      }
    }

    void redirectExistingSession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (isCheckingSession) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-ds-bg">
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-ds-bg">
      <View className="flex-1 px-ds-screen">
        <View className="flex-1 justify-center">
          <Text className="font-inter-semibold text-vb-xs uppercase text-ds-subtle">
            {t('welcome.brand')}
          </Text>

          <Text className="font-inter-bold mt-5 text-vb-xl text-ds-text">
            {t('welcome.title')}
          </Text>

          <Text className="font-inter mt-5 max-w-sm text-vb-base text-ds-muted">
            {t('welcome.subtitle')}
          </Text>
        </View>

        <View className="pb-8">
          <View className="gap-3">
            <AppButton onPress={() => router.push('/client')} title={t('welcome.bookService')} />

            <AppButton
              onPress={() => router.push('/service-entry')}
              title={t('welcome.serviceAccess')}
              variant="secondary"
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
