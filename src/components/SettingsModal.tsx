import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { setAppLanguage, type AppLanguage } from "@/i18n";
import { colors } from "@/design/tokens";
import {
  getTenantSettings,
  updateTenantSettings,
  type TenantSettings,
  type VehicleType,
} from "@/lib/data";
import { supabase } from "@/lib/supabase";

import { AppButton } from "./AppButton";
import { FormTextInput } from "./FormTextInput";

type SettingsPane = "main" | "vehicleTypes" | "company" | "language" | "currency";
type SettingsIconName = keyof typeof MaterialCommunityIcons.glyphMap;

type SettingsModalProps = {
  onClose: () => void;
  onSettingsSaved?: () => void;
  visible: boolean;
};
type SettingsTransition = {
  direction: "back" | "forward";
  from: SettingsPane;
  to: SettingsPane;
};

const vehicleOptions: VehicleType[] = ["bike", "moto", "scooter"];
const currencies = ["RSD", "EUR", "BAM"] as const;
const languages = ["sr", "en"] as const;
type SettingsCurrency = (typeof currencies)[number];
type SettingsLanguage = (typeof languages)[number];

type SettingsRowProps = {
  destructive?: boolean;
  icon: SettingsIconName;
  iconColor: string;
  onPress: () => void;
  title: string;
};

type ModalIconButtonProps = {
  icon: SettingsIconName;
  onPress: () => void;
};

function ModalIconButton({ icon, onPress }: ModalIconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      className="h-10 w-10 items-center justify-center rounded-ds-pill bg-ds-field active:bg-ds-surface"
      onPress={onPress}
    >
      <MaterialCommunityIcons color={colors.text} name={icon} size={22} />
    </Pressable>
  );
}

function SettingsRow({ destructive = false, icon, iconColor, onPress, title }: SettingsRowProps) {
  return (
    <Pressable className="active:opacity-70" onPress={onPress}>
      <View className="min-h-12 flex-row items-center gap-4 py-2">
        <View className="h-9 w-9 items-center justify-center">
          <MaterialCommunityIcons color={iconColor} name={icon} size={24} />
        </View>

        <Text
          className={`font-inter-semibold flex-1 text-vb-md ${
            destructive ? "text-ds-danger" : "text-ds-text"
          }`}
        >
          {title}
        </Text>

        {destructive ? null : (
          <MaterialCommunityIcons color={colors.muted} name="chevron-right" size={24} />
        )}
      </View>
    </Pressable>
  );
}

type ChoiceChipProps = {
  onPress: () => void;
  selected: boolean;
  title: string;
};

function ChoiceChip({ onPress, selected, title }: ChoiceChipProps) {
  return (
    <Pressable
      className={`rounded-ds-pill border px-4 py-2 active:opacity-70 ${
        selected ? "border-ds-accent bg-ds-accent-soft" : "border-ds-border bg-ds-surface"
      }`}
      onPress={onPress}
    >
      <Text
        className={`font-inter-semibold text-vb-sm ${
          selected ? "text-ds-accent" : "text-ds-muted"
        }`}
      >
        {title}
      </Text>
    </Pressable>
  );
}

function normalizeCurrency(value: string): SettingsCurrency {
  return currencies.includes(value as SettingsCurrency) ? (value as SettingsCurrency) : "RSD";
}

function normalizeLanguage(value: string): SettingsLanguage {
  return languages.includes(value as SettingsLanguage) ? (value as SettingsLanguage) : "sr";
}

export function SettingsModal({ onClose, onSettingsSaved, visible }: SettingsModalProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { height, width } = useWindowDimensions();
  const [paneStack, setPaneStack] = useState<SettingsPane[]>(["main"]);
  const [transition, setTransition] = useState<SettingsTransition | null>(null);
  const [selectedVehicles, setSelectedVehicles] = useState<VehicleType[]>(vehicleOptions);
  const [selectedCurrency, setSelectedCurrency] = useState<SettingsCurrency>("RSD");
  const [selectedLanguage, setSelectedLanguage] = useState<SettingsLanguage>("sr");
  const [comesToClient, setComesToClient] = useState(true);
  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [focusedCompanyField, setFocusedCompanyField] = useState<
    "address" | "name" | "phone" | null
  >(null);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const transitionProgress = useRef(new Animated.Value(0)).current;

  const currentPane = paneStack[paneStack.length - 1];
  const titlePane = transition?.to ?? currentPane;
  const panelWidth = Math.min(width * 0.8, 340);
  const panelHeight = Math.min(height * 0.72, 560);
  const paneWidth = panelWidth - 40;
  const paneMinHeight = panelHeight - 108;

  const applySettings = useCallback((settings: TenantSettings) => {
    const language = normalizeLanguage(settings.app_language);

    setCompanyName(settings.company_name ?? "");
    setCompanyAddress(settings.company_address ?? "");
    setCompanyPhone(settings.company_phone ?? "");
    setSelectedCurrency(normalizeCurrency(settings.currency));
    setSelectedLanguage(language);
    setComesToClient(settings.comes_to_client ?? true);
    setSelectedVehicles(settings.vehicle_types.length > 0 ? settings.vehicle_types : vehicleOptions);
    void setAppLanguage(language as AppLanguage);
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      setIsLoadingSettings(true);
      applySettings(await getTenantSettings());
    } catch (error) {
      console.error("[settings] failed to load tenant settings", error);
      Alert.alert(t("common.error"), t("settings.loadErrorMessage"));
    } finally {
      setIsLoadingSettings(false);
    }
  }, [applySettings, t]);

  useEffect(() => {
    if (!visible) {
      setPaneStack(["main"]);
      setTransition(null);
      transitionProgress.setValue(0);
      return;
    }

    void loadSettings();
  }, [loadSettings, transitionProgress, visible]);

  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardDidShow", (event) => {
      setKeyboardInset(Math.min(event.endCoordinates.height, paneMinHeight * 0.55));
    });
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardInset(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [paneMinHeight]);

  async function saveSettings(
    overrides: Partial<{
      appLanguage: SettingsLanguage;
      comesToClient: boolean;
      companyAddress: string;
      companyName: string;
      companyPhone: string;
      currency: SettingsCurrency;
      vehicleTypes: VehicleType[];
    }>,
  ): Promise<boolean> {
    const nextSettings = {
      appLanguage: overrides.appLanguage ?? selectedLanguage,
      comesToClient: overrides.comesToClient ?? comesToClient,
      companyAddress: overrides.companyAddress ?? companyAddress,
      companyName: overrides.companyName ?? companyName,
      companyPhone: overrides.companyPhone ?? companyPhone,
      currency: overrides.currency ?? selectedCurrency,
      vehicleTypes: overrides.vehicleTypes ?? selectedVehicles,
    };

    if (nextSettings.vehicleTypes.length === 0) {
      Alert.alert(t("settings.vehicleRequiredTitle"), t("settings.vehicleRequiredMessage"));
      return false;
    }

    try {
      setIsSavingSettings(true);
      applySettings(await updateTenantSettings(nextSettings));
      onSettingsSaved?.();
      return true;
    } catch (error) {
      console.error("[settings] failed to save tenant settings", error);
      Alert.alert(t("common.error"), t("settings.saveErrorMessage"));
      void loadSettings();
      return false;
    } finally {
      setIsSavingSettings(false);
    }
  }

  async function saveCompanySettings() {
    Keyboard.dismiss();
    setFocusedCompanyField(null);

    const didSave = await saveSettings({
      companyAddress,
      companyName,
      companyPhone,
    });

    if (didSave) {
      goBackInModal();
    }
  }

  function closeModal() {
    transitionProgress.stopAnimation();
    setTransition(null);
    setPaneStack(["main"]);
    transitionProgress.setValue(0);
    onClose();
  }

  function openPane(pane: SettingsPane) {
    if (transition) {
      return;
    }

    animateToPane({
      direction: "forward",
      from: currentPane,
      nextStack: [...paneStack, pane],
      to: pane,
    });
  }

  function goBackInModal() {
    if (transition || paneStack.length <= 1) {
      return;
    }

    const nextStack = paneStack.slice(0, -1);

    animateToPane({
      direction: "back",
      from: currentPane,
      nextStack,
      to: nextStack[nextStack.length - 1],
    });
  }

  function animateToPane({
    direction,
    from,
    nextStack,
    to,
  }: {
    direction: SettingsTransition["direction"];
    from: SettingsPane;
    nextStack: SettingsPane[];
    to: SettingsPane;
  }) {
    transitionProgress.setValue(0);
    setTransition({ direction, from, to });

    Animated.timing(transitionProgress, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) {
        return;
      }

      setPaneStack(nextStack);
      setTransition(null);
    });
  }

  function toggleVehicle(vehicle: VehicleType) {
    const nextVehicles = selectedVehicles.includes(vehicle)
      ? selectedVehicles.filter((currentVehicle) => currentVehicle !== vehicle)
      : [...selectedVehicles, vehicle];

    if (nextVehicles.length === 0) {
      Alert.alert(t("settings.vehicleRequiredTitle"), t("settings.vehicleRequiredMessage"));
      return;
    }

    setSelectedVehicles(nextVehicles);
    void saveSettings({ vehicleTypes: nextVehicles });
  }

  function toggleComesToClient(nextValue: boolean) {
    setComesToClient(nextValue);
    void saveSettings({ comesToClient: nextValue });
  }

  function confirmLogout() {
    Alert.alert(t("settings.logoutTitle"), t("settings.logoutMessage"), [
      {
        style: "cancel",
        text: t("common.cancel"),
      },
      {
        onPress: () => {
          void logout();
        },
        style: "destructive",
        text: t("settings.logoutAction"),
      },
    ]);
  }

  async function logout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("[settings] logout failed", error);
      Alert.alert(t("common.error"), t("settings.logoutErrorMessage"));
      return;
    }

    closeModal();
    router.replace("/");
  }

  function getTitle(pane: SettingsPane) {
    if (pane === "vehicleTypes") {
      return t("settings.service.vehicleTypesTitle");
    }

    if (pane === "company") {
      return t("settings.company.title");
    }

    if (pane === "language") {
      return t("settings.localization.language");
    }

    if (pane === "currency") {
      return t("settings.localization.currency");
    }

    return t("settings.title");
  }

  function renderPane(pane: SettingsPane) {
    if (isLoadingSettings) {
      return (
        <View className="min-h-48 items-center justify-center">
          <ActivityIndicator color={colors.accent} />
        </View>
      );
    }

    if (pane === "vehicleTypes") {
      return (
        <View>
          <Text className="font-inter text-vb-base text-ds-muted">
            {t("settings.service.vehicleTypesDescription")}
          </Text>

          <View className="mt-6 gap-2">
            {vehicleOptions.map((vehicle) => {
              const isSelected = selectedVehicles.includes(vehicle);

              return (
                <Pressable
                  className={`flex-row items-center justify-between rounded-ds-input border px-4 py-3 active:opacity-70 ${
                    isSelected
                      ? "border-ds-accent bg-ds-accent-soft"
                      : "border-ds-border bg-ds-canvas"
                  }`}
                  key={vehicle}
                  onPress={() => toggleVehicle(vehicle)}
                >
                  <Text
                    className={`font-inter-semibold text-vb-base ${
                      isSelected ? "text-ds-accent" : "text-ds-text"
                    }`}
                  >
                    {t(`settings.service.vehicles.${vehicle}`)}
                  </Text>
                  <MaterialCommunityIcons
                    color={isSelected ? colors.accent : colors.subtle}
                    name={isSelected ? "check-circle" : "circle-outline"}
                    size={22}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>
      );
    }

    if (pane === "company") {
      return (
        <View>
          <Text className="font-inter text-vb-base text-ds-muted">
            {t("settings.company.description")}
          </Text>

          <View className="mt-6 gap-4">
            <FormTextInput
              autoCapitalize="words"
              focused={focusedCompanyField === "name"}
              label={t("settings.company.fields.name")}
              onBlur={() => setFocusedCompanyField(null)}
              onChangeText={setCompanyName}
              onFocus={() => setFocusedCompanyField("name")}
              placeholder={t("settings.company.placeholders.name")}
              value={companyName}
            />
            <FormTextInput
              autoCapitalize="sentences"
              focused={focusedCompanyField === "address"}
              label={t("settings.company.fields.address")}
              onBlur={() => setFocusedCompanyField(null)}
              onChangeText={setCompanyAddress}
              onFocus={() => setFocusedCompanyField("address")}
              placeholder={t("settings.company.placeholders.address")}
              value={companyAddress}
            />
            <FormTextInput
              autoCapitalize="none"
              focused={focusedCompanyField === "phone"}
              inputMode="tel"
              keyboardType="phone-pad"
              label={t("settings.company.fields.phone")}
              onBlur={() => setFocusedCompanyField(null)}
              onChangeText={setCompanyPhone}
              onFocus={() => setFocusedCompanyField("phone")}
              placeholder={t("settings.company.placeholders.phone")}
              value={companyPhone}
            />
            <AppButton
              disabled={isSavingSettings}
              onPress={saveCompanySettings}
              title={isSavingSettings ? t("settings.saving") : t("settings.save")}
            />
          </View>
        </View>
      );
    }

    if (pane === "language") {
      return (
        <View>
          <Text className="font-inter text-vb-base text-ds-muted">
            {t("settings.localization.description")}
          </Text>

          <View className="mt-6 flex-row flex-wrap gap-2">
            {languages.map((language) => (
              <ChoiceChip
                key={language}
                onPress={() => {
                  setSelectedLanguage(language);
                  void setAppLanguage(language as AppLanguage);
                  void saveSettings({ appLanguage: language });
                }}
                selected={language === selectedLanguage}
                title={t(`settings.localization.languages.${language}`)}
              />
            ))}
          </View>
        </View>
      );
    }

    if (pane === "currency") {
      return (
        <View>
          <Text className="font-inter text-vb-base text-ds-muted">
            {t("settings.localization.description")}
          </Text>

          <View className="mt-6 flex-row flex-wrap gap-2">
            {currencies.map((currency) => (
              <ChoiceChip
                key={currency}
                onPress={() => {
                  setSelectedCurrency(currency);
                  void saveSettings({ currency });
                }}
                selected={currency === selectedCurrency}
                title={currency}
              />
            ))}
          </View>
        </View>
      );
    }

    return (
      <View>
        <Pressable
          className="mb-4 rounded-ds-input border border-ds-hairline bg-ds-canvas px-4 py-3 active:opacity-80"
          disabled={isSavingSettings}
          onPress={() => toggleComesToClient(!comesToClient)}
        >
          <View className="flex-row items-center justify-between gap-4">
            <View className="flex-1">
              <Text className="font-inter-semibold text-vb-base text-ds-text">
                {t("settings.service.comesToClientTitle")}
              </Text>
              <Text className="mt-1 font-inter text-vb-xs text-ds-muted">
                {t("settings.service.comesToClientDescription")}
              </Text>
            </View>

            <Switch
              disabled={isSavingSettings}
              onValueChange={toggleComesToClient}
              thumbColor={comesToClient ? colors.accent : colors.muted}
              trackColor={{ false: colors.field, true: colors.accentSoft }}
              value={comesToClient}
            />
          </View>
        </Pressable>

        <SettingsRow
          icon="storefront-outline"
          iconColor={colors.today}
          onPress={() => openPane("vehicleTypes")}
          title={t("settings.rows.vehicleTypes")}
        />
        <SettingsRow
          icon="domain"
          iconColor={colors.anytime}
          onPress={() => openPane("company")}
          title={t("settings.rows.company")}
        />
        <SettingsRow
          icon="translate"
          iconColor={colors.accent}
          onPress={() => openPane("language")}
          title={t("settings.rows.language")}
        />
        <SettingsRow
          icon="cash-multiple"
          iconColor={colors.accent}
          onPress={() => openPane("currency")}
          title={t("settings.rows.currency")}
        />
        <SettingsRow
          destructive
          icon="logout"
          iconColor={colors.danger}
          onPress={confirmLogout}
          title={t("settings.logoutAction")}
        />
      </View>
    );
  }

  function renderAnimatedPane() {
    if (!transition) {
      return (
        <View style={{ minHeight: paneMinHeight, width: paneWidth }}>
          {renderPane(currentPane)}
        </View>
      );
    }

    const fromOutput =
      transition.direction === "forward" ? [0, -paneWidth] : [0, paneWidth];
    const toOutput =
      transition.direction === "forward" ? [paneWidth, 0] : [-paneWidth, 0];

    const fromTranslateX = transitionProgress.interpolate({
      inputRange: [0, 1],
      outputRange: fromOutput,
    });
    const toTranslateX = transitionProgress.interpolate({
      inputRange: [0, 1],
      outputRange: toOutput,
    });

    return (
      <View className="overflow-hidden" style={{ minHeight: paneMinHeight, width: paneWidth }}>
        <Animated.View
          pointerEvents="none"
          style={{ transform: [{ translateX: fromTranslateX }], width: paneWidth }}
        >
          {renderPane(transition.from)}
        </Animated.View>
        <Animated.View
          style={{
            left: 0,
            position: "absolute",
            top: 0,
            transform: [{ translateX: toTranslateX }],
            width: paneWidth,
          }}
        >
          {renderPane(transition.to)}
        </Animated.View>
      </View>
    );
  }

  return (
    <Modal
      animationType="fade"
      onRequestClose={closeModal}
      transparent
      visible={visible}
    >
      <SafeAreaView className="flex-1 items-center justify-center bg-ds-bg/85">
        <Pressable className="absolute inset-0" onPress={closeModal} />

        <View
          className="overflow-hidden rounded-ds-panel border border-ds-border bg-ds-elevated px-5 pb-6 pt-5"
          style={{ height: panelHeight, width: panelWidth }}
        >
          <View className="flex-row items-center justify-between">
            {titlePane === "main" ? (
              <View className="h-10 w-10" />
            ) : (
              <ModalIconButton icon="chevron-left" onPress={goBackInModal} />
            )}

            <Text className="font-inter-semibold text-vb-md text-ds-text">
              {getTitle(titlePane)}
            </Text>

            {titlePane === "main" ? (
              <ModalIconButton icon="close" onPress={closeModal} />
            ) : (
              <View className="h-10 w-10" />
            )}
          </View>

          <ScrollView
            className="mt-7 flex-1"
            contentContainerStyle={{ paddingBottom: 24 + keyboardInset }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {renderAnimatedPane()}
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
