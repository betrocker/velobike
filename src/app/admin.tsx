import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Pressable, Text, View } from "react-native";

import { AdminScreenShell } from "@/components/AdminScreenShell";
import { SettingsModal } from "@/components/SettingsModal";
import { colors } from "@/design/tokens";
import { setAppLanguage, type AppLanguage } from "@/i18n";
import {
  getCurrentTenantContext,
  getInventory,
  getPendingBookingRequests,
  getTenantJobs,
  getTenantSettings,
  type TenantContext,
} from "@/lib/data";

type AdminDestination = "/admin/requests" | "/admin/jobs" | "/admin/inventory" | "/admin/team";
type AdminIconName = keyof typeof MaterialCommunityIcons.glyphMap;

type AdminLinkProps = {
  title: string;
  color: string;
  detail?: string;
  icon: AdminIconName;
  onPress: () => void;
};

function AdminLink({ title, color, detail, icon, onPress }: AdminLinkProps) {
  return (
    <Pressable className="active:opacity-70" onPress={onPress}>
      <View className="h-12 flex-row items-center gap-2">
        <View className="h-10 w-10 items-center justify-center">
          <MaterialCommunityIcons color={color} name={icon} size={24} />
        </View>

        <Text className="font-inter-semibold flex-1 text-vb-md text-ds-text">
          {title}
        </Text>

        {detail ? (
          <Text className="font-inter-medium min-w-8 text-right text-vb-base text-ds-muted">
            {detail}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function AdminScreen() {
  const router = useRouter();
  const { i18n, t } = useTranslation();
  const [context, setContext] = useState<TenantContext | null>(null);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [jobsCount, setJobsCount] = useState(0);
  const [inventoryCount, setInventoryCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const openScreen = useCallback(
    (destination: AdminDestination) => {
      router.push(destination);
    },
    [router],
  );

  const loadAdminOverview = useCallback(async () => {
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

      const [inventory, jobs, pendingRequests, settings] = await Promise.all([
        getInventory(),
        getTenantJobs(),
        getPendingBookingRequests(),
        getTenantSettings(),
      ]);

      if (settings.app_language !== i18n.language) {
        void setAppLanguage(settings.app_language as AppLanguage);
      }
      setContext(tenantContext);
      setInventoryCount(inventory.length);
      setJobsCount(jobs.length);
      setPendingRequestsCount(pendingRequests.length);
    } catch (error) {
      console.error("[admin] failed to load admin overview", error);
      Alert.alert(t("common.error"), t("admin.loadErrorMessage"));
    } finally {
      setIsLoading(false);
    }
  }, [i18n.language, router, t]);

  useFocusEffect(
    useCallback(() => {
      void loadAdminOverview();
    }, [loadAdminOverview]),
  );

  return (
    <>
      <AdminScreenShell
        compactHeader={false}
        isLoading={isLoading}
        title={context?.tenant.name ?? t("common.service")}
      >
        <View className="mt-12 flex-1 justify-between">
          <View>
            <AdminLink
              color={colors.accent}
              detail={String(pendingRequestsCount)}
              icon="inbox-outline"
              onPress={() => openScreen("/admin/requests")}
              title={t("admin.nav.requestsTitle")}
            />
            <AdminLink
              color={colors.anytime}
              detail={String(jobsCount)}
              icon="clipboard-list-outline"
              onPress={() => openScreen("/admin/jobs")}
              title={t("admin.nav.jobsTitle")}
            />
            <AdminLink
            color={colors.logbook}
            detail={String(inventoryCount)}
            icon="package-variant-closed"
            onPress={() => openScreen("/admin/inventory")}
            title={t("admin.nav.inventoryTitle")}
          />
            <AdminLink
              color={colors.anytime}
              icon="account-group-outline"
              onPress={() => openScreen("/admin/team")}
              title={t("admin.nav.teamTitle")}
            />
          </View>

          <Pressable
            className="mb-2 self-center active:opacity-70"
            onPress={() => setIsSettingsOpen(true)}
          >
            <View className="h-9 flex-row items-center gap-1.5 px-3">
              <MaterialCommunityIcons color={colors.subtle} name="cog-outline" size={18} />

              <Text className="font-inter-medium text-vb-sm text-ds-muted">
                {t("settings.title")}
              </Text>
            </View>
          </Pressable>
        </View>
      </AdminScreenShell>

      <SettingsModal
        onClose={() => setIsSettingsOpen(false)}
        onSettingsSaved={() => {
          void loadAdminOverview();
        }}
        visible={isSettingsOpen}
      />
    </>
  );
}
