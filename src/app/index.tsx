import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const metrics = [
  { label: 'Available bikes', value: '128' },
  { label: 'Open docks', value: '34' },
  { label: 'Service alerts', value: '6' },
];

const nearbyStations = [
  { name: 'City Square', bikes: 18, distance: '350 m' },
  { name: 'Riverside Path', bikes: 9, distance: '620 m' },
  { name: 'North Garage', bikes: 24, distance: '1.1 km' },
];

export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-velo-ink">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="px-6 pt-5">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-sm font-semibold uppercase tracking-normal text-velo-mint">
                VeloBike
              </Text>
              <Text className="mt-2 text-3xl font-bold text-white">Fleet overview</Text>
            </View>
            <View className="h-12 w-12 items-center justify-center rounded-full bg-velo-mint">
              <Text className="text-lg font-black text-velo-ink">VB</Text>
            </View>
          </View>

          <View className="mt-7 rounded-3xl bg-white p-5">
            <Text className="text-sm font-semibold text-slate-500">Today</Text>
            <View className="mt-3 flex-row items-end justify-between">
              <View>
                <Text className="text-4xl font-black text-velo-ink">42 rides</Text>
                <Text className="mt-2 text-base text-slate-500">Peak demand near City Square</Text>
              </View>
              <View className="rounded-full bg-velo-signal px-4 py-2">
                <Text className="font-bold text-velo-ink">Live</Text>
              </View>
            </View>
          </View>

          <View className="mt-4 flex-row gap-3">
            {metrics.map((metric) => (
              <View key={metric.label} className="flex-1 rounded-2xl bg-slate-900 p-4">
                <Text className="text-2xl font-black text-white">{metric.value}</Text>
                <Text className="mt-2 text-xs font-semibold text-slate-400">{metric.label}</Text>
              </View>
            ))}
          </View>

          <View className="mt-7">
            <Text className="text-xl font-bold text-white">Nearby stations</Text>
            <View className="mt-3 gap-3">
              {nearbyStations.map((station) => (
                <Pressable
                  key={station.name}
                  className="flex-row items-center justify-between rounded-2xl bg-white/10 p-4">
                  <View>
                    <Text className="text-base font-bold text-white">{station.name}</Text>
                    <Text className="mt-1 text-sm text-slate-400">{station.distance}</Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-lg font-black text-velo-mint">{station.bikes}</Text>
                    <Text className="text-xs font-semibold text-slate-400">bikes</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
