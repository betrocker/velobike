import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackButton } from '@/components/AppBackButton';
import { colors } from '@/design/tokens';
import { listPublicTenants, type PublicTenant } from '@/lib/data';

export default function ClientServiceListScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [tenants, setTenants] = useState<PublicTenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadTenants = useCallback(async () => {
    try {
      setIsLoading(true);
      setTenants(await listPublicTenants());
    } catch (error) {
      console.error('[client] failed to load public tenants', error);
      Alert.alert(t('common.error'), t('client.loadErrorMessage'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      void loadTenants();
    }, [loadTenants]),
  );

  return (
    <SafeAreaView className="flex-1 bg-ds-bg">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="px-ds-screen pt-5">
          <AppBackButton onPress={() => router.back()} />

          <View className="mt-10 flex-row items-start justify-between gap-4">
            <View className="flex-1">
              <Text className="font-inter-semibold text-vb-xs uppercase text-ds-accent">
                {t('client.eyebrow')}
              </Text>
              <Text className="font-inter-bold mt-4 text-vb-xl text-ds-text">
                {t('client.title')}
              </Text>
              <Text className="font-inter mt-4 text-vb-base text-ds-muted">
                {t('client.subtitle')}
              </Text>
            </View>

            {isLoading ? <ActivityIndicator color={colors.accent} /> : null}
          </View>

          <View className="mt-8 overflow-hidden rounded-ds-panel border border-ds-hairline bg-ds-canvas">
            {tenants.map((tenant) => (
              <Pressable
                key={tenant.id}
                className="border-b border-ds-hairline px-4 py-4 active:bg-ds-elevated"
                onPress={() =>
                  router.push({
                    pathname: '/book/[slug]',
                    params: { slug: tenant.public_slug },
                  })
                }>
                <View className="flex-row items-center justify-between gap-4">
                  <View className="flex-1">
                    <Text className="font-inter-bold text-vb-base text-ds-text">{tenant.name}</Text>
                    <Text className="font-inter mt-1 text-vb-sm text-ds-subtle">
                      {tenant.public_slug}
                    </Text>
                  </View>
                  <View className="rounded-ds-pill bg-ds-accent-soft px-3 py-2">
                    <Text className="font-inter-semibold text-vb-sm text-ds-accent">
                      {t('client.selectAction')}
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))}

            {!isLoading && tenants.length === 0 ? (
              <View className="p-8">
                <Text className="font-inter-bold text-center text-vb-base text-ds-text">
                  {t('client.emptyTitle')}
                </Text>
                <Text className="font-inter mt-2 text-center text-vb-sm text-ds-subtle">
                  {t('client.emptyMessage')}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
