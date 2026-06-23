import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const actions = [
  { title: 'Start a ride', description: 'Scan a dock code and unlock a bike.' },
  { title: 'Report repair', description: 'Flag brakes, tires, lights, or docking issues.' },
  { title: 'Balance top up', description: 'Prepare prepaid credit for the next customer.' },
];

export default function ExploreScreen() {
  return (
    <SafeAreaView className="flex-1 bg-velo-road">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="px-6 pt-5">
          <Text className="text-sm font-semibold uppercase tracking-normal text-slate-500">
            Operations
          </Text>
          <Text className="mt-2 text-3xl font-black text-velo-ink">Quick actions</Text>

          <View className="mt-6 gap-3">
            {actions.map((action) => (
              <Pressable key={action.title} className="rounded-3xl bg-white p-5">
                <Text className="text-lg font-black text-velo-ink">{action.title}</Text>
                <Text className="mt-2 text-base leading-6 text-slate-500">{action.description}</Text>
              </Pressable>
            ))}
          </View>

          <View className="mt-7 rounded-3xl bg-velo-ink p-5">
            <Text className="text-sm font-semibold text-velo-mint">Next check</Text>
            <Text className="mt-2 text-2xl font-black text-white">Battery swap route</Text>
            <Text className="mt-2 text-base leading-6 text-slate-300">
              11 bikes are below the preferred charge threshold across three stations.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
