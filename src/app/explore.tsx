import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const actionKeys = ['startRide', 'reportRepair', 'topUp'] as const;

function ActionDot({ index }: { index: number }) {
  if (index === 0) {
    return <View className="mb-4 h-8 w-8 rounded-ds-pill bg-ds-accent" />;
  }

  if (index === 1) {
    return <View className="mb-4 h-8 w-8 rounded-ds-pill bg-ds-upcoming" />;
  }

  return <View className="mb-4 h-8 w-8 rounded-ds-pill bg-ds-today" />;
}

export default function ExploreScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView className="flex-1 bg-ds-bg">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="px-ds-screen pt-5">
          <Text className="font-inter-semibold text-vb-xs uppercase text-ds-subtle">
            {t('explore.eyebrow')}
          </Text>
          <Text className="font-inter-black mt-2 text-vb-xl text-ds-text">{t('explore.title')}</Text>

          <View className="mt-6 gap-3">
            {actionKeys.map((actionKey, index) => (
              <Pressable
                key={actionKey}
                className="rounded-ds-panel border border-ds-border bg-ds-surface p-ds-card active:bg-ds-elevated">
                <ActionDot index={index} />
                <Text className="font-inter-black text-vb-lg text-ds-text">
                  {t(`explore.actions.${actionKey}.title`)}
                </Text>
                <Text className="font-inter mt-2 text-vb-base text-ds-muted">
                  {t(`explore.actions.${actionKey}.description`)}
                </Text>
              </Pressable>
            ))}
          </View>

          <View className="mt-7 rounded-ds-panel border border-ds-border bg-ds-elevated p-ds-card">
            <Text className="font-inter-semibold text-vb-sm text-ds-anytime">
              {t('explore.nextCheck')}
            </Text>
            <Text className="font-inter-black mt-2 text-vb-xl text-ds-text">
              {t('explore.batteryRoute')}
            </Text>
            <Text className="font-inter mt-2 text-vb-base text-ds-muted">
              {t('explore.batteryRouteDescription')}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
