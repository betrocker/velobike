import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Text, View } from "react-native";

import { AdminScreenShell } from "@/components/AdminScreenShell";
import { AppButton } from "@/components/AppButton";
import { FormTextInput } from "@/components/FormTextInput";
import { setAppLanguage, type AppLanguage } from "@/i18n";
import {
  createInventoryItem,
  getCurrentTenantContext,
  getInventory,
  getTenantSettings,
  type InventoryItem,
} from "@/lib/data";
import { formatCurrency } from "@/lib/format";

type FieldName = "partName" | "price" | "stockQuantity";

function parseNumber(value: string) {
  const normalizedValue = value.replace(",", ".").trim();
  const parsedValue = Number(normalizedValue);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function getInventorySummary(inventory: InventoryItem[]) {
  return inventory.reduce(
    (summary, item) => ({
      count: summary.count + 1,
      stock: summary.stock + item.stock_quantity,
      value: summary.value + item.price * item.stock_quantity,
    }),
    { count: 0, stock: 0, value: 0 },
  );
}

export default function AdminInventoryScreen() {
  const router = useRouter();
  const { i18n, t } = useTranslation();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [focusedField, setFocusedField] = useState<FieldName | null>(null);
  const [partName, setPartName] = useState("");
  const [price, setPrice] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currency, setCurrency] = useState("RSD");

  const canSubmit = partName.trim().length > 1 && !isSubmitting;
  const inventorySummary = getInventorySummary(inventory);

  const loadInventory = useCallback(async () => {
    try {
      setIsLoading(true);

      const tenantContext = await getCurrentTenantContext();

      if (!tenantContext) {
        router.replace("/login");
        return;
      }

      if (tenantContext.profile.role !== "admin") {
        Alert.alert(t("admin.noAccessTitle"), t("admin.noAccessMessage"));
        router.replace("/staff");
        return;
      }

      const [items, settings] = await Promise.all([getInventory(), getTenantSettings()]);

      setCurrency(settings.currency);
      if (settings.app_language !== i18n.language) {
        void setAppLanguage(settings.app_language as AppLanguage);
      }
      setInventory(items);
    } catch (error) {
      console.error("[admin inventory] failed to load inventory", error);
      Alert.alert(t("common.error"), t("admin.loadErrorMessage"));
    } finally {
      setIsLoading(false);
    }
  }, [i18n.language, router, t]);

  useFocusEffect(
    useCallback(() => {
      void loadInventory();
    }, [loadInventory]),
  );

  async function handleCreateInventoryItem() {
    if (!canSubmit) {
      Alert.alert(t("admin.missingPartTitle"), t("admin.missingPartMessage"));
      return;
    }

    try {
      setIsSubmitting(true);

      const createdItem = await createInventoryItem({
        name: partName,
        price: parseNumber(price),
        stockQuantity: Math.max(Math.trunc(parseNumber(stockQuantity)), 0),
      });

      setInventory((currentInventory) => [createdItem, ...currentInventory]);
      setPartName("");
      setPrice("");
      setStockQuantity("");
      setFocusedField(null);
    } catch (error) {
      console.error("[admin inventory] failed to create inventory item", error);
      Alert.alert(t("common.error"), t("admin.createPartErrorMessage"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AdminScreenShell
      isLoading={isLoading}
      keyboardAvoiding
      onBack={() => router.back()}
      title={t("admin.inventoryTitle")}
    >
      <View className="mt-4 items-end">
        <Text className="font-inter-black text-vb-xl text-ds-text">
          {inventorySummary.stock}
        </Text>
        <Text className="font-inter-semibold text-vb-xs uppercase text-ds-subtle">
          {t("admin.pieces")}
        </Text>
      </View>

      <View className="mt-8 gap-4 rounded-ds-panel border border-ds-border bg-ds-surface p-ds-card">
        <FormTextInput
          autoCapitalize="sentences"
          focused={focusedField === "partName"}
          inputVariant="panel"
          label={t("admin.fields.part")}
          labelVariant="meta"
          onBlur={() => setFocusedField(null)}
          onChangeText={setPartName}
          onFocus={() => setFocusedField("partName")}
          placeholder={t("admin.placeholders.part")}
          returnKeyType="next"
          value={partName}
        />

        <View className="flex-row gap-3">
          <FormTextInput
            autoCapitalize="none"
            autoCorrect={false}
            focused={focusedField === "price"}
            inputMode="decimal"
            inputVariant="panel"
            keyboardType="decimal-pad"
            label={t("admin.fields.price")}
            labelVariant="meta"
            onBlur={() => setFocusedField(null)}
            onChangeText={setPrice}
            onFocus={() => setFocusedField("price")}
            placeholder={t("admin.placeholders.price")}
            returnKeyType="next"
            value={price}
            wrapperClassName="flex-1"
          />

          <FormTextInput
            autoCapitalize="none"
            autoCorrect={false}
            focused={focusedField === "stockQuantity"}
            inputMode="numeric"
            inputVariant="panel"
            keyboardType="number-pad"
            label={t("admin.fields.stock")}
            labelVariant="meta"
            onBlur={() => setFocusedField(null)}
            onChangeText={setStockQuantity}
            onFocus={() => setFocusedField("stockQuantity")}
            placeholder={t("admin.placeholders.stock")}
            returnKeyType="done"
            value={stockQuantity}
            wrapperClassName="flex-1"
          />
        </View>

        <AppButton
          disabled={!canSubmit}
          onPress={handleCreateInventoryItem}
          title={isSubmitting ? t("admin.addingPart") : t("admin.addPart")}
        />
      </View>

      <View className="mt-8">
        <View className="mb-3 flex-row items-center justify-between gap-4">
          <Text className="font-inter-semibold text-vb-xs uppercase text-ds-subtle">
            {t("admin.parts")}
          </Text>
          <Text className="font-inter-semibold text-right text-vb-xs uppercase text-ds-subtle">
            {t("admin.itemsWithValue", {
              count: inventorySummary.count,
              value: formatCurrency(inventorySummary.value, i18n.language, currency),
            })}
          </Text>
        </View>

        <View className="overflow-hidden rounded-ds-panel border border-ds-hairline bg-ds-canvas">
          {inventory.map((item) => (
            <View
              key={item.id}
              className="border-b border-ds-hairline px-4 py-4"
            >
              <View className="flex-row items-center justify-between gap-4">
                <View className="flex-1">
                  <Text className="font-inter-bold text-vb-base text-ds-text">
                    {item.name}
                  </Text>
                  <Text className="font-inter mt-1 text-vb-sm text-ds-muted">
                    {formatCurrency(item.price, i18n.language, currency)}
                  </Text>
                </View>
                <View className="min-w-20 items-center rounded-ds-pill bg-ds-surface px-3 py-2">
                  <Text className="font-inter-bold text-vb-sm text-ds-accent">
                    {item.stock_quantity} {t("admin.pieces")}
                  </Text>
                </View>
              </View>
            </View>
          ))}

          {!isLoading && inventory.length === 0 ? (
            <View className="p-8">
              <Text className="font-inter text-center text-vb-sm text-ds-subtle">
                {t("admin.emptyInventory")}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </AdminScreenShell>
  );
}
