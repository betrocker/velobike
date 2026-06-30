import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type DimensionValue,
  type ViewStyle,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, type MapStyleElement } from 'react-native-maps';
import { SvgUri } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { colors } from '@/design/tokens';
import { getPublicTenantBySlug, type PublicTenant, type VehicleType } from '@/lib/data';

type BookingStepId = 'location' | 'vehicle' | 'schedule' | 'summary';
type VehiclePart = 'backWheel' | 'brakes' | 'drivetrain' | 'frontWheel' | 'handlebar';
type MappedVehicleArtwork = 'bike' | 'moto' | 'scooter';
type VehiclePartHotspot =
  | { kind: 'circle'; cx: number; cy: number; part: VehiclePart; r: number }
  | { height: number; kind: 'rect'; part: VehiclePart; width: number; x: number; y: number };
type VehicleArtwork = {
  height: number;
  hotspots: VehiclePartHotspot[];
  svgUri: string;
  width: number;
};

const fallbackVehicleOptions: VehicleType[] = ['bike', 'scooter', 'moto'];
const bookingStepsWithLocation: BookingStepId[] = ['location', 'vehicle', 'schedule', 'summary'];
const bookingStepsWithoutLocation: BookingStepId[] = ['vehicle', 'schedule', 'summary'];

const dummyFaultsByPart: Record<VehiclePart, string[]> = {
  backWheel: ['flatTire', 'wobble', 'spokes'],
  brakes: ['weakBrakes', 'noise', 'lever'],
  drivetrain: ['chain', 'gears', 'motor'],
  frontWheel: ['flatTire', 'wobble', 'bearing'],
  handlebar: ['loose', 'steering', 'controls'],
};

function getFaultId(part: VehiclePart, fault: string) {
  return `${part}:${fault}`;
}

function formatDetectedAddress(place: Location.LocationGeocodedAddress) {
  if (place.formattedAddress) {
    return place.formattedAddress;
  }

  const streetLine = [place.street, place.streetNumber].filter(Boolean).join(' ');
  const cityLine = [place.postalCode, place.city].filter(Boolean).join(' ');

  return [place.name, streetLine, cityLine, place.country].filter(Boolean).join(', ');
}

function percent(value: number): DimensionValue {
  return `${value}%` as DimensionValue;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function toDateId(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);

  return nextDate;
}

function getDateFromId(dateId: string) {
  const [year, month, day] = dateId.split('-').map(Number);

  return new Date(year, month - 1, day);
}

function getBookingLocale(language: string) {
  return language.startsWith('sr') ? 'sr-Latn-RS' : 'en-US';
}

function formatBookingDate(dateId: string, language: string) {
  const date = getDateFromId(dateId);
  const locale = getBookingLocale(language);
  const formatted = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);

  return language.startsWith('sr') ? `${formatted}.` : formatted;
}

function formatBookingWeekday(dateId: string, language: string) {
  return new Intl.DateTimeFormat(getBookingLocale(language), { weekday: 'short' }).format(
    getDateFromId(dateId),
  );
}

function formatBookingDay(dateId: string) {
  return `${getDateFromId(dateId).getDate()}`;
}

const initialClientCoordinate = {
  latitude: 44.8125,
  longitude: 20.4612,
};

const initialClientRegion = {
  ...initialClientCoordinate,
  latitudeDelta: 0.018,
  longitudeDelta: 0.018,
};

const selectedLocationRegionDelta = {
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

const bookingTimeOptions = [
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
];

const bookingTimeItemHeight = 56;
const bookingTimePickerHeight = 224;
const bookingTimePickerPadding = (bookingTimePickerHeight - bookingTimeItemHeight) / 2;

const mappedVehicleArtwork: Record<MappedVehicleArtwork, VehicleArtwork> = {
  bike: {
    svgUri: Image.resolveAssetSource(require('../../assets/vehicles/bicycle_silhouette.svg')).uri,
    width: 1672,
    height: 941,
    hotspots: [
      { kind: 'circle', part: 'backWheel', cx: 330, cy: 620, r: 285 },
      { kind: 'circle', part: 'frontWheel', cx: 1312, cy: 620, r: 285 },
      { kind: 'rect', part: 'handlebar', x: 1015, y: 36, width: 300, height: 170 },
      { kind: 'rect', part: 'brakes', x: 1190, y: 480, width: 210, height: 230 },
      { kind: 'rect', part: 'drivetrain', x: 620, y: 525, width: 340, height: 210 },
    ],
  },
  scooter: {
    svgUri: Image.resolveAssetSource(
      require('../../assets/vehicles/electric_scooter_service_silhouette.svg'),
    ).uri,
    width: 1600,
    height: 900,
    hotspots: [
      { kind: 'circle', part: 'backWheel', cx: 370, cy: 650, r: 170 },
      { kind: 'circle', part: 'frontWheel', cx: 1230, cy: 650, r: 170 },
      { kind: 'rect', part: 'handlebar', x: 910, y: 80, width: 430, height: 260 },
      { kind: 'rect', part: 'brakes', x: 1080, y: 555, width: 260, height: 170 },
      { kind: 'rect', part: 'drivetrain', x: 420, y: 505, width: 760, height: 190 },
    ],
  },
  moto: {
    svgUri: Image.resolveAssetSource(require('../../assets/vehicles/motor_offwhite_transparent.svg'))
      .uri,
    width: 1672,
    height: 941,
    hotspots: [
      { kind: 'circle', part: 'backWheel', cx: 295, cy: 675, r: 235 },
      { kind: 'circle', part: 'frontWheel', cx: 1382, cy: 675, r: 235 },
      { kind: 'rect', part: 'handlebar', x: 1015, y: 20, width: 300, height: 190 },
      { kind: 'rect', part: 'brakes', x: 1260, y: 535, width: 220, height: 210 },
      { kind: 'rect', part: 'drivetrain', x: 700, y: 455, width: 380, height: 290 },
    ],
  },
};

const darkMapStyle: MapStyleElement[] = [
  {
    elementType: 'geometry',
    stylers: [{ color: '#252B35' }],
  },
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: '#A8B0BE' }],
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#1C2129' }],
  },
  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#343D4B' }],
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#2B3340' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#303846' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#202630' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#29313C' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#1D3B5F' }],
  },
];

export default function BookingScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { i18n, t } = useTranslation();
  const mapRef = useRef<MapView | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);
  const timeScrollRef = useRef<ScrollView | null>(null);
  const hasCenteredTimePickerRef = useRef(false);
  const addressInputRef = useRef<TextInput | null>(null);
  const [tenant, setTenant] = useState<PublicTenant | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [address, setAddress] = useState('');
  const [isAddressEditing, setIsAddressEditing] = useState(false);
  const [clientCoordinate, setClientCoordinate] = useState(initialClientCoordinate);
  const [vehicle, setVehicle] = useState<VehicleType>('bike');
  const [selectedPart, setSelectedPart] = useState<VehiclePart | null>(null);
  const [selectedFaults, setSelectedFaults] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => toDateId(new Date()));
  const [selectedTime, setSelectedTime] = useState('14:00');
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [keyboardBottomPadding, setKeyboardBottomPadding] = useState(32);
  const [isLocating, setIsLocating] = useState(false);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const publicSlug = Array.isArray(slug) ? slug[0] : slug;
  const comesToClient = tenant?.comes_to_client ?? true;
  const bookingSteps = useMemo(
    () => (comesToClient ? bookingStepsWithLocation : bookingStepsWithoutLocation),
    [comesToClient],
  );
  const currentStep = bookingSteps[Math.min(currentStepIndex, bookingSteps.length - 1)] ?? 'vehicle';
  const vehicleOptions = useMemo(
    () => (tenant?.vehicle_types?.length ? tenant.vehicle_types : fallbackVehicleOptions),
    [tenant?.vehicle_types],
  );
  const dateOptions = useMemo(() => {
    const today = new Date();

    return Array.from({ length: 14 }).map((_, index) => toDateId(addDays(today, index)));
  }, []);
  const unavailableSlotsByDate = useMemo<Record<string, string[]>>(
    () => ({
      [dateOptions[1]]: ['10:00', '14:00'],
      [dateOptions[2]]: ['12:00', '16:00'],
      [dateOptions[4]]: ['09:00', '15:00', '17:00'],
    }),
    [dateOptions],
  );
  const unavailableTimesForSelectedDate = useMemo(
    () => unavailableSlotsByDate[selectedDate] ?? [],
    [selectedDate, unavailableSlotsByDate],
  );
  const canContinue =
    currentStep === 'location'
      ? address.trim().length > 0
      : currentStep === 'vehicle'
        ? selectedFaults.length > 0
        : currentStep === 'schedule'
          ? selectedDate.trim().length > 0 &&
            selectedTime.trim().length > 0 &&
            !unavailableTimesForSelectedDate.includes(selectedTime)
          : true;
  const scrollTimeIntoView = useCallback((time: string, animated: boolean) => {
    const nextIndex = bookingTimeOptions.indexOf(time);

    timeScrollRef.current?.scrollTo({
      animated,
      y: Math.max(nextIndex, 0) * bookingTimeItemHeight,
    });
  }, []);

  const loadTenant = useCallback(async () => {
    if (!publicSlug) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setTenant(await getPublicTenantBySlug(publicSlug));
    } catch (error) {
      console.error('[booking] failed to load public tenant', error);
      Alert.alert(t('common.error'), t('booking.notFoundMessage'));
    } finally {
      setIsLoading(false);
    }
  }, [publicSlug, t]);

  useEffect(() => {
    void loadTenant();
  }, [loadTenant]);

  useEffect(() => {
    if (vehicleOptions.length > 0 && !vehicleOptions.includes(vehicle)) {
      setVehicle(vehicleOptions[0]);
    }
  }, [vehicle, vehicleOptions]);

  useEffect(() => {
    if (currentStepIndex <= bookingSteps.length - 1) {
      return;
    }

    setCurrentStepIndex(Math.max(bookingSteps.length - 1, 0));
  }, [bookingSteps.length, currentStepIndex]);

  const movePinToCurrentLocation = useCallback(async () => {
    try {
      setIsLocating(true);

      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== Location.PermissionStatus.GRANTED) {
        setHasLocationPermission(false);
        return;
      }

      setHasLocationPermission(true);

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const nextCoordinate = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      };

      setClientCoordinate(nextCoordinate);
      mapRef.current?.animateToRegion(
        {
          ...nextCoordinate,
          ...selectedLocationRegionDelta,
        },
        450,
      );
    } catch (error) {
      console.error('[booking] failed to load client location', error);
      Alert.alert(t('common.error'), t('booking.location.permissionError'));
    } finally {
      setIsLocating(false);
    }
  }, [t]);

  useEffect(() => {
    if (tenant && comesToClient) {
      void movePinToCurrentLocation();
    }
  }, [comesToClient, movePinToCurrentLocation, tenant]);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', (event) => {
      setKeyboardBottomPadding(event.endCoordinates.height + 32);

      if (isAddressEditing) {
        setTimeout(() => {
          scrollRef.current?.scrollToEnd({ animated: true });
        }, 80);
      }
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardBottomPadding(32);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [isAddressEditing]);

  useEffect(() => {
    if (!hasLocationPermission) {
      return;
    }

    let isActive = true;

    const resolveAddress = async () => {
      try {
        setIsResolvingAddress(true);
        const places = await Location.reverseGeocodeAsync(clientCoordinate);
        const nextAddress = places[0] ? formatDetectedAddress(places[0]) : '';

        if (isActive) {
          setAddress(nextAddress);
        }
      } catch (error) {
        console.error('[booking] failed to resolve selected address', error);
      } finally {
        if (isActive) {
          setIsResolvingAddress(false);
        }
      }
    };

    const timeoutId = setTimeout(() => {
      void resolveAddress();
    }, 450);

    return () => {
      isActive = false;
      clearTimeout(timeoutId);
    };
  }, [clientCoordinate, hasLocationPermission]);

  useEffect(() => {
    if (currentStep !== 'schedule') {
      hasCenteredTimePickerRef.current = false;
      return;
    }

    if (hasCenteredTimePickerRef.current) {
      return;
    }

    hasCenteredTimePickerRef.current = true;
    setTimeout(() => {
      scrollTimeIntoView(selectedTime, false);
    }, 0);
  }, [currentStep, scrollTimeIntoView, selectedTime]);

  useEffect(() => {
    if (!unavailableTimesForSelectedDate.includes(selectedTime)) {
      return;
    }

    const nextAvailableTime = bookingTimeOptions.find(
      (time) => !unavailableTimesForSelectedDate.includes(time),
    );

    if (nextAvailableTime) {
      setSelectedTime(nextAvailableTime);
      setTimeout(() => {
        scrollTimeIntoView(nextAvailableTime, true);
      }, 0);
    }
  }, [scrollTimeIntoView, selectedTime, unavailableTimesForSelectedDate]);

  function handleContinue() {
    if (!canContinue) {
      return;
    }

    if (currentStep === 'summary') {
      Alert.alert(
        t('booking.summary.submitComingSoonTitle'),
        t('booking.summary.submitComingSoonMessage'),
      );
      return;
    }

    if (currentStep === 'vehicle') {
      setSelectedPart(null);
    }

    setCurrentStepIndex((index) => Math.min(index + 1, bookingSteps.length - 1));
    setTimeout(() => {
      scrollRef.current?.scrollTo({ animated: false, y: 0 });
    }, 0);
  }

  function handleBack() {
    if (currentStepIndex <= 0) {
      return;
    }

    if (currentStep === 'vehicle') {
      setSelectedPart(null);
    }

    setCurrentStepIndex((index) => Math.max(index - 1, 0));
    setTimeout(() => {
      scrollRef.current?.scrollTo({ animated: false, y: 0 });
    }, 0);
  }

  function toggleFault(fault: string) {
    if (!selectedPart) {
      return;
    }

    const faultId = getFaultId(selectedPart, fault);

    setSelectedFaults((currentFaults) =>
      currentFaults.includes(faultId)
        ? currentFaults.filter((currentFault) => currentFault !== faultId)
        : [...currentFaults, faultId],
    );
  }

  function getSelectedFaultItems() {
    return selectedFaults.map((faultId) => {
      const [part, fault] = faultId.split(':') as [VehiclePart, string];

      return { fault, faultId, part };
    });
  }

  function renderStepDots() {
    return (
      <View className="mt-6 flex-row items-center justify-center gap-2">
        {bookingSteps.map((step, index) => {
          const isActive = index === currentStepIndex;

          return (
            <View
              key={step}
              className={`h-2 rounded-ds-pill ${
                isActive ? 'w-6 bg-ds-accent' : 'w-2 bg-ds-border'
              }`}
            />
          );
        })}
      </View>
    );
  }

  function renderLocationStep() {
    return (
      <>
        <Text className="text-center font-inter-bold text-vb-xl text-ds-text">
          {t('booking.location.title')}
        </Text>
        <Text className="mt-3 text-center font-inter text-vb-base text-ds-muted">
          {t('booking.location.subtitle')}
        </Text>

        {renderStepDots()}

        <View className="mt-7 overflow-hidden rounded-ds-panel border border-ds-hairline bg-ds-canvas">
          <View className="h-96 bg-ds-canvas">
            <MapView
              customMapStyle={darkMapStyle}
              initialRegion={initialClientRegion}
              onPress={(event) => setClientCoordinate(event.nativeEvent.coordinate)}
              provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
              ref={mapRef}
              showsMyLocationButton={hasLocationPermission}
              showsUserLocation={hasLocationPermission}
              style={{ height: '100%', width: '100%' }}>
              <Marker
                coordinate={clientCoordinate}
                draggable
                onDragEnd={(event) => setClientCoordinate(event.nativeEvent.coordinate)}
                pinColor={colors.accent}
                title={address.trim() || t('booking.location.pinLabel')}
              />
            </MapView>

            <View className="absolute left-4 top-4 rounded-ds-pill border border-ds-hairline bg-ds-bg/90 px-3 py-2">
              <Text className="font-inter-semibold text-vb-xs text-ds-muted">
                {t('booking.location.mapLabel')}
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              className="absolute right-4 top-4 h-10 w-10 items-center justify-center rounded-ds-pill border border-ds-hairline bg-ds-bg/90 active:bg-ds-elevated"
              disabled={isLocating}
              onPress={movePinToCurrentLocation}>
              {isLocating ? (
                <ActivityIndicator color={colors.accent} size="small" />
              ) : (
                <MaterialCommunityIcons color={colors.accent} name="crosshairs-gps" size={20} />
              )}
            </Pressable>
          </View>
        </View>

        <View className="mt-6">
          <View className="mb-2 flex-row items-center justify-between gap-3">
            <View className="flex-row items-center gap-2">
              <Text className="font-inter-semibold text-vb-xs uppercase text-ds-subtle">
                {t('booking.location.addressLabel')}
              </Text>
              {!isAddressEditing ? (
                <Text className="font-inter text-vb-xs italic text-ds-subtle">
                  ({t('booking.location.tapToEdit')})
                </Text>
              ) : null}
            </View>
            {isResolvingAddress ? (
              <Text className="font-inter text-vb-xs text-ds-accent">
                {t('booking.location.detectedAddressLoading')}
              </Text>
            ) : null}
          </View>
          {isAddressEditing ? (
            <TextInput
              ref={addressInputRef}
              autoCapitalize="words"
              className="min-h-12 max-h-24 rounded-ds-input border border-ds-accent bg-ds-accent-soft px-3 py-2 font-inter text-vb-base text-ds-text"
              multiline
              onBlur={() => {
                setIsAddressEditing(false);
              }}
              onChangeText={setAddress}
              onFocus={() => {
                setTimeout(() => {
                  scrollRef.current?.scrollToEnd({ animated: true });
                }, 350);
              }}
              placeholder={t('booking.location.addressPlaceholder')}
              placeholderTextColor={colors.subtle}
              returnKeyType="done"
              selectionColor={colors.accent}
              style={{ includeFontPadding: false }}
              textAlignVertical="top"
              value={address}
            />
          ) : (
            <Pressable
              accessibilityRole="button"
              className="min-h-12 justify-center rounded-ds-input px-1 py-2 active:bg-ds-elevated"
              onPress={() => {
                setIsAddressEditing(true);
                setTimeout(() => {
                  addressInputRef.current?.focus();
                  scrollRef.current?.scrollToEnd({ animated: true });
                }, 80);
              }}>
              <Text
                className={`font-inter text-vb-base ${
                  address.trim() ? 'text-ds-text' : 'text-ds-subtle'
                }`}>
                {address.trim() || t('booking.location.detectedAddressFallback')}
              </Text>
            </Pressable>
          )}
        </View>
      </>
    );
  }

  function getHotspotFrame(hotspot: VehiclePartHotspot, artwork: VehicleArtwork): ViewStyle {
    if (hotspot.kind === 'circle') {
      const expandedRadius = hotspot.r * 1.18;
      const size = expandedRadius * 2;
      const left = clamp(hotspot.cx - expandedRadius, 0, artwork.width - size);
      const top = clamp(hotspot.cy - expandedRadius, 0, artwork.height - size);

      return {
        height: percent((size / artwork.height) * 100),
        left: percent((left / artwork.width) * 100),
        top: percent((top / artwork.height) * 100),
        width: percent((size / artwork.width) * 100),
      };
    }

    const expandedWidth = hotspot.width * 1.34;
    const expandedHeight = hotspot.height * 1.44;
    const left = clamp(hotspot.x - (expandedWidth - hotspot.width) / 2, 0, artwork.width - expandedWidth);
    const top = clamp(hotspot.y - (expandedHeight - hotspot.height) / 2, 0, artwork.height - expandedHeight);

    return {
      height: percent((expandedHeight / artwork.height) * 100),
      left: percent((left / artwork.width) * 100),
      top: percent((top / artwork.height) * 100),
      width: percent((expandedWidth / artwork.width) * 100),
    };
  }

  function renderVehiclePartHotspot(hotspot: VehiclePartHotspot, artwork: VehicleArtwork) {
    return (
      <Pressable
        accessibilityLabel={t(`booking.vehicle.parts.${hotspot.part}`)}
        accessibilityRole="button"
        className="absolute"
        key={`hotspot-${hotspot.part}`}
        onPress={() => setSelectedPart(hotspot.part)}
        style={getHotspotFrame(hotspot, artwork)}
      />
    );
  }

  function renderMappedVehicleArtwork(vehicleKey: MappedVehicleArtwork) {
    const artwork = mappedVehicleArtwork[vehicleKey];

    return (
      <View className="h-full w-full items-center justify-center">
        <View
          className="relative w-full overflow-hidden rounded-ds-input"
          style={{ aspectRatio: artwork.width / artwork.height }}>
          <View className="absolute inset-0" pointerEvents="none">
            <SvgUri height="100%" uri={artwork.svgUri} width="100%" />
          </View>

          {artwork.hotspots.map((hotspot) => renderVehiclePartHotspot(hotspot, artwork))}
        </View>
      </View>
    );
  }

  function renderVehicleArtwork() {
    if (vehicle === 'bike') {
      return renderMappedVehicleArtwork('bike');
    }

    if (vehicle === 'scooter') {
      return renderMappedVehicleArtwork('scooter');
    }

    if (vehicle === 'moto') {
      return renderMappedVehicleArtwork('moto');
    }

    return renderMappedVehicleArtwork('bike');
  }

  function renderVehicleSilhouette() {
    return (
      <View className="mt-6 overflow-hidden rounded-ds-panel border border-ds-hairline bg-ds-canvas px-4 py-5">
        <View className="relative h-72">
          <Text className="absolute left-1 top-1 z-10 font-inter text-vb-xs text-ds-subtle">
            {selectedPart ? t('booking.vehicle.chooseIssue') : t('booking.vehicle.tapHint')}
          </Text>

          <View className="absolute inset-0 pt-5">{renderVehicleArtwork()}</View>
          {renderFaultMenu()}
        </View>
      </View>
    );
  }

  function renderSelectedFaultsSummary() {
    const selectedFaultItems = getSelectedFaultItems();

    return (
      <View className="mt-4 px-1">
        <Text className="font-inter-semibold text-vb-xs uppercase text-ds-subtle">
          {t('booking.vehicle.selectedIssuesLabel')}
        </Text>

        {selectedFaultItems.length > 0 ? (
          <View className="mt-3 gap-2">
            {selectedFaultItems.map(({ fault, faultId, part }) => (
              <View className="flex-row items-start gap-2" key={faultId}>
                <View className="mt-2 h-1.5 w-1.5 rounded-ds-pill bg-ds-accent" />
                <Text className="flex-1 font-inter text-vb-sm text-ds-text">
                  <Text className="font-inter-semibold text-ds-muted">
                    {t(`booking.vehicle.parts.${part}`)}:
                  </Text>{' '}
                  {t(`booking.vehicle.faults.${fault}`)}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text className="mt-3 font-inter text-vb-sm text-ds-muted">
            {t('booking.vehicle.noIssuesSelected')}
          </Text>
        )}
      </View>
    );
  }

  function renderFaultMenu() {
    if (!selectedPart) {
      return null;
    }

    const faults = dummyFaultsByPart[selectedPart];

    return (
      <View className="absolute right-3 top-12 z-20 w-64 overflow-hidden rounded-ds-panel border border-white/25 bg-ds-elevated/95">
        <View className="flex-row items-center justify-between px-4 py-3">
          <View className="h-8 w-8" />
          <Text className="flex-1 text-center font-inter-semibold text-vb-base text-ds-text">
            {t(`booking.vehicle.parts.${selectedPart}`)}
          </Text>
          <Pressable
            accessibilityRole="button"
            className="h-8 w-8 items-center justify-center rounded-ds-pill bg-ds-field active:bg-ds-surface"
            onPress={() => setSelectedPart(null)}>
            <MaterialCommunityIcons color={colors.muted} name="close" size={18} />
          </Pressable>
        </View>

        {faults.map((fault) => {
          const isSelected = selectedFaults.includes(getFaultId(selectedPart, fault));
          return (
            <Pressable
              accessibilityRole="button"
              className="flex-row items-center justify-between px-4 py-3 active:bg-ds-field"
              key={fault}
              onPress={() => toggleFault(fault)}>
              <Text className="font-inter text-vb-base text-ds-text">
                {t(`booking.vehicle.faults.${fault}`)}
              </Text>
              <View
                className={`h-5 w-5 items-center justify-center rounded border ${
                  isSelected ? 'border-ds-accent bg-ds-accent' : 'border-ds-subtle bg-ds-bg/40'
                }`}>
                {isSelected ? (
                  <MaterialCommunityIcons color={colors.text} name="check" size={14} />
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    );
  }

  function renderVehicleStep() {
    return (
      <>
        <Text className="text-center font-inter-bold text-vb-xl text-ds-text">
          {t('booking.vehicle.title')}
        </Text>
        <Text className="mt-3 text-center font-inter text-vb-base text-ds-muted">
          {t('booking.vehicle.subtitle')}
        </Text>

        {renderStepDots()}

        <View className="mt-7">
          <Text className="font-inter-semibold text-vb-xs uppercase text-ds-subtle">
            {t('booking.vehicle.vehicleLabel')}
          </Text>
          <View className="mt-3 flex-row gap-2">
            {vehicleOptions.map((option) => {
              const isSelected = vehicle === option;

              return (
                <Pressable
                  className={`h-11 flex-1 items-center justify-center rounded-ds-input border active:opacity-80 ${
                    isSelected
                      ? 'border-ds-accent bg-ds-accent-soft'
                      : 'border-ds-border bg-ds-surface'
                  }`}
                  key={option}
                  onPress={() => {
                    setVehicle(option);
                    setSelectedPart(null);
                  }}>
                  <Text
                    className={`font-inter-semibold text-vb-sm ${
                      isSelected ? 'text-ds-accent' : 'text-ds-muted'
                    }`}>
                    {t(`booking.vehicles.${option}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {renderVehicleSilhouette()}
        {renderSelectedFaultsSummary()}
      </>
    );
  }

  function renderDateOption(dateId: string) {
    const isSelected = selectedDate === dateId;
    const hasUnavailableSlots = Boolean(unavailableSlotsByDate[dateId]?.length);
    const language = i18n.resolvedLanguage ?? i18n.language;

    return (
      <Pressable
        accessibilityRole="button"
        className={`mr-2 h-16 min-w-16 items-center justify-center rounded-ds-pill border px-4 active:opacity-80 ${
          isSelected ? 'border-ds-accent bg-ds-accent-soft' : 'border-ds-hairline bg-ds-surface/70'
        }`}
        key={dateId}
        onPress={() => setSelectedDate(dateId)}>
        <Text
          className={`font-inter-semibold text-vb-xs uppercase ${
            isSelected ? 'text-ds-accent' : 'text-ds-subtle'
          }`}>
          {formatBookingWeekday(dateId, language)}
        </Text>
        <Text
          className={`mt-1 font-inter-bold text-vb-md ${
            isSelected ? 'text-ds-text' : 'text-ds-muted'
          }`}>
          {formatBookingDay(dateId)}
        </Text>
        {isSelected ? (
          <View className="mt-1 h-1 w-5 rounded-ds-pill bg-ds-accent" />
        ) : hasUnavailableSlots ? (
          <View className="mt-1 h-1 w-1 rounded-ds-pill bg-ds-disabled" />
        ) : null}
      </Pressable>
    );
  }

  function getNearestAvailableTime(timeIndex: number) {
    const normalizedIndex = clamp(timeIndex, 0, bookingTimeOptions.length - 1);
    const selectedCandidate = bookingTimeOptions[normalizedIndex];

    if (!unavailableTimesForSelectedDate.includes(selectedCandidate)) {
      return selectedCandidate;
    }

    for (let distance = 1; distance < bookingTimeOptions.length; distance += 1) {
      const before = bookingTimeOptions[normalizedIndex - distance];
      const after = bookingTimeOptions[normalizedIndex + distance];

      if (before && !unavailableTimesForSelectedDate.includes(before)) {
        return before;
      }

      if (after && !unavailableTimesForSelectedDate.includes(after)) {
        return after;
      }
    }

    return selectedCandidate;
  }

  function handleSelectTime(time: string) {
    if (unavailableTimesForSelectedDate.includes(time)) {
      return;
    }

    setSelectedTime(time);
    scrollTimeIntoView(time, true);
  }

  function handleTimeMomentumEnd(offsetY: number) {
    const snappedIndex = clamp(
      Math.round(offsetY / bookingTimeItemHeight),
      0,
      bookingTimeOptions.length - 1,
    );
    const snappedTime = bookingTimeOptions[snappedIndex];
    const nextTime = getNearestAvailableTime(
      clamp(
        snappedIndex,
        0,
        bookingTimeOptions.length - 1,
      ),
    );

    setSelectedTime(nextTime);

    if (nextTime !== snappedTime) {
      scrollTimeIntoView(nextTime, true);
    }
  }

  function renderTimeOption(time: string) {
    const isSelected = selectedTime === time;
    const isUnavailable = unavailableTimesForSelectedDate.includes(time);
    const selectedIndex = bookingTimeOptions.indexOf(selectedTime);
    const optionIndex = bookingTimeOptions.indexOf(time);
    const distance = Math.abs(selectedIndex - optionIndex);

    return (
      <Pressable
        accessibilityRole="button"
        className={`relative flex-row items-center justify-center px-6 ${
          isUnavailable ? 'opacity-35' : 'active:opacity-80'
        }`}
        disabled={isUnavailable}
        key={time}
        onPress={() => handleSelectTime(time)}
        style={{ height: bookingTimeItemHeight }}>
        {isSelected ? (
          <View className="absolute left-8 h-2 w-2 rounded-ds-pill bg-ds-text" />
        ) : null}
        <Text
          className={`text-center font-inter ${
            isUnavailable
              ? 'text-vb-md text-ds-disabled line-through'
              : isSelected
                ? 'text-vb-xl text-ds-text'
                : distance === 1
                  ? 'text-vb-lg text-ds-muted'
                  : 'text-vb-md text-ds-disabled'
          }`}>
          {time}
        </Text>
        {isSelected ? (
          <View className="absolute right-8 h-2 w-2 rounded-ds-pill bg-ds-text" />
        ) : null}
      </Pressable>
    );
  }

  function renderScheduleStep() {
    const language = i18n.resolvedLanguage ?? i18n.language;

    return (
      <>
        <Text className="text-center font-inter-bold text-vb-xl text-ds-text">
          {t('booking.schedule.title')}
        </Text>
        <Text className="mt-3 text-center font-inter text-vb-base text-ds-muted">
          {formatBookingDate(selectedDate, language)}
        </Text>

        {renderStepDots()}

        <View className="mt-8">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 2, paddingVertical: 2 }}>
            {dateOptions.map(renderDateOption)}
          </ScrollView>
        </View>

        <View className="mt-7 items-center">
          <View
            className="relative w-full max-w-72 overflow-hidden"
            style={{ height: bookingTimePickerHeight }}>
            <View
              className="absolute left-6 right-6 rounded-ds-pill border border-ds-hairline bg-ds-elevated/80"
              style={{ height: bookingTimeItemHeight, top: bookingTimePickerPadding }}
            />
            <View className="absolute left-0 right-0 top-0 z-10 h-12 bg-ds-bg/70" pointerEvents="none" />
            <View className="absolute bottom-0 left-0 right-0 z-10 h-12 bg-ds-bg/70" pointerEvents="none" />
            <ScrollView
              ref={timeScrollRef}
              decelerationRate="normal"
              onMomentumScrollEnd={(event) => handleTimeMomentumEnd(event.nativeEvent.contentOffset.y)}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: bookingTimePickerPadding }}
              snapToInterval={bookingTimeItemHeight}>
              {bookingTimeOptions.map(renderTimeOption)}
            </ScrollView>
          </View>
          <Text className="mt-5 text-center font-inter text-vb-xs italic text-ds-subtle">
            ({t('booking.schedule.unavailableHint')})
          </Text>
        </View>
      </>
    );
  }

  function renderSummaryRow(label: string, value: string) {
    return (
      <View className="border-b border-ds-hairline py-4" key={label}>
        <Text className="font-inter-semibold text-vb-xs uppercase text-ds-subtle">{label}</Text>
        <Text className="mt-2 font-inter text-vb-base text-ds-text">{value}</Text>
      </View>
    );
  }

  function renderSummaryStep() {
    const language = i18n.resolvedLanguage ?? i18n.language;
    const selectedFaultItems = getSelectedFaultItems();
    const issueSummary = selectedFaultItems
      .map(
        ({ fault, part }) =>
          `${t(`booking.vehicle.parts.${part}`)}: ${t(`booking.vehicle.faults.${fault}`)}`,
      )
      .join('\n');

    return (
      <>
        <Text className="text-center font-inter-bold text-vb-xl text-ds-text">
          {t('booking.summary.title')}
        </Text>
        <Text className="mt-3 text-center font-inter text-vb-base text-ds-muted">
          {t('booking.summary.subtitle')}
        </Text>

        {renderStepDots()}

        <View className="mt-7 rounded-ds-panel border border-ds-hairline bg-ds-canvas px-4">
          {renderSummaryRow(t('booking.summary.serviceLabel'), tenant?.name ?? t('common.service'))}
          {comesToClient ? renderSummaryRow(t('booking.summary.addressLabel'), address.trim()) : null}
          {renderSummaryRow(t('booking.summary.vehicleLabel'), t(`booking.vehicles.${vehicle}`))}
          {renderSummaryRow(
            t('booking.summary.issuesLabel'),
            issueSummary || t('booking.vehicle.noIssuesSelected'),
          )}
          <View className="py-4">
            <Text className="font-inter-semibold text-vb-xs uppercase text-ds-subtle">
              {t('booking.summary.scheduleLabel')}
            </Text>
            <Text className="mt-2 font-inter text-vb-base text-ds-text">
              {formatBookingDate(selectedDate, language)} · {selectedTime}
            </Text>
          </View>
        </View>
      </>
    );
  }

  function renderCurrentStep() {
    if (currentStep === 'location') {
      return renderLocationStep();
    }

    if (currentStep === 'vehicle') {
      return renderVehicleStep();
    }

    if (currentStep === 'schedule') {
      return renderScheduleStep();
    }

    return renderSummaryStep();
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-ds-bg">
        <ActivityIndicator color={colors.accent} />
        <Text className="mt-4 font-inter text-vb-sm text-ds-muted">{t('booking.loading')}</Text>
      </SafeAreaView>
    );
  }

  if (!tenant) {
    return (
      <SafeAreaView className="flex-1 bg-ds-bg">
        <View className="flex-1 justify-center px-ds-screen">
          <Text className="font-inter-bold text-vb-xl text-ds-text">{t('booking.notFoundTitle')}</Text>
          <Text className="mt-4 font-inter text-vb-base text-ds-muted">
            {t('booking.notFoundMessage')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-ds-bg">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={16}>
        <ScrollView
          ref={scrollRef}
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1, paddingBottom: keyboardBottomPadding }}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled">
          <View className="flex-1 justify-center px-ds-screen py-8">
            {renderCurrentStep()}
          </View>
        </ScrollView>

        <View className="flex-row items-center justify-between px-ds-screen pb-6 pt-2">
          {currentStepIndex > 0 ? (
            <AppButton
              className="min-w-28 px-5"
              onPress={handleBack}
              title={t('common.back')}
              variant="secondary"
            />
          ) : (
            <View />
          )}
          <AppButton
            className="min-w-32 px-6"
            disabled={!canContinue}
            onPress={handleContinue}
            title={currentStep === 'summary' ? t('booking.submit') : t('booking.location.nextAction')}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
