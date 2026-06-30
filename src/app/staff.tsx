import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/design/tokens';
import { setAppLanguage, type AppLanguage } from '@/i18n';
import { getTenantJobs, getTenantSettings, type Job } from '@/lib/data';
import { formatCurrency, getLocale } from '@/lib/format';

function getStatusColor(status: string) {
  if (status === 'u_radu') {
    return 'text-ds-anytime';
  }

  if (status === 'zavrseno') {
    return 'text-ds-logbook';
  }

  return 'text-ds-today';
}

function formatDate(value: string, language: string) {
  return new Intl.DateTimeFormat(getLocale(language), {
    day: '2-digit',
    month: 'short',
  }).format(new Date(value));
}

export default function StaffScreen() {
  const { i18n, t } = useTranslation();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [currency, setCurrency] = useState('RSD');
  const [isLoading, setIsLoading] = useState(true);

  const loadJobs = useCallback(async () => {
    try {
      setIsLoading(true);
      const [tenantJobs, settings] = await Promise.all([getTenantJobs(), getTenantSettings()]);

      setCurrency(settings.currency);
      if (settings.app_language !== i18n.language) {
        void setAppLanguage(settings.app_language as AppLanguage);
      }
      setJobs(tenantJobs);
    } catch (error) {
      console.error('[staff] failed to load jobs', error);
      Alert.alert(t('common.error'), t('staff.loadErrorMessage'));
    } finally {
      setIsLoading(false);
    }
  }, [i18n.language, t]);

  useFocusEffect(
    useCallback(() => {
      void loadJobs();
    }, [loadJobs]),
  );

  return (
    <SafeAreaView className="flex-1 bg-ds-bg">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="px-ds-screen pt-5">
          <View className="flex-row items-start justify-between gap-4">
            <View className="flex-1">
              <Text className="font-inter-semibold text-vb-xs uppercase text-ds-accent">
                {t('staff.eyebrow')}
              </Text>
              <Text className="font-inter-bold mt-2 text-vb-xl text-ds-text">
                {t('staff.title')}
              </Text>
              <Text className="font-inter mt-3 text-vb-base text-ds-muted">
                {t('staff.subtitle')}
              </Text>
            </View>

            {isLoading ? <ActivityIndicator color={colors.accent} /> : null}
          </View>

          <View className="mt-8 overflow-hidden rounded-ds-panel border border-ds-hairline bg-ds-canvas">
            {jobs.map((job) => (
              <View key={job.id} className="border-b border-ds-hairline px-4 py-4">
                <View className="flex-row items-start justify-between gap-4">
                  <View className="flex-1">
                    <Text className="font-inter-bold text-vb-base text-ds-text">
                      {job.client_name}
                    </Text>
                    <Text className="font-inter mt-1 text-vb-sm text-ds-muted">
                      {t(`staff.vehicles.${job.vehicle}`)} · {formatDate(job.created_at, i18n.language)}
                    </Text>
                    {job.client_phone ? (
                      <Text className="font-inter mt-1 text-vb-sm text-ds-subtle">
                        {job.client_phone}
                      </Text>
                    ) : null}
                  </View>

                  <View className="items-end">
                    <Text
                      className={`font-inter-semibold text-vb-xs uppercase ${getStatusColor(
                        job.status,
                      )}`}>
                      {t(`staff.statuses.${job.status}`, { defaultValue: job.status })}
                    </Text>
                    <Text className="font-inter-bold mt-2 text-vb-sm text-ds-text">
                      {formatCurrency(job.total_amount, i18n.language, currency)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}

            {!isLoading && jobs.length === 0 ? (
              <View className="p-8">
                <Text className="font-inter-bold text-center text-vb-base text-ds-text">
                  {t('staff.emptyTitle')}
                </Text>
                <Text className="font-inter mt-2 text-center text-vb-sm text-ds-subtle">
                  {t('staff.emptyMessage')}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
