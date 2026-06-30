import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Pressable, Text, View } from "react-native";

import { AdminScreenShell } from "@/components/AdminScreenShell";
import { colors } from "@/design/tokens";
import {
  convertBookingRequestToJob,
  getCurrentTenantContext,
  getPendingBookingRequests,
  type BookingRequest,
  type VehicleType,
} from "@/lib/data";

function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  if (day && month && year) {
    return `${day}. ${month}.`;
  }

  const date = new Date(value);

  return `${date.getDate()}. ${date.getMonth() + 1}.`;
}

function getVehicleIcon(vehicle: VehicleType) {
  if (vehicle === "moto") {
    return "motorbike";
  }

  if (vehicle === "scooter") {
    return "scooter-electric";
  }

  return "bicycle";
}

function getRequestTitle(request: BookingRequest) {
  const title = request.problem_description?.trim();

  if (title) {
    return title;
  }

  return "";
}

export default function AdminRequestsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [bookingRequests, setBookingRequests] = useState<BookingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [convertingRequestId, setConvertingRequestId] = useState<string | null>(
    null,
  );

  const loadRequests = useCallback(async () => {
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

      setBookingRequests(await getPendingBookingRequests());
    } catch (error) {
      console.error("[admin requests] failed to load requests", error);
      Alert.alert(t("common.error"), t("admin.loadErrorMessage"));
    } finally {
      setIsLoading(false);
    }
  }, [router, t]);

  useFocusEffect(
    useCallback(() => {
      void loadRequests();
    }, [loadRequests]),
  );

  async function handleConvertBookingRequest(requestId: string) {
    try {
      setConvertingRequestId(requestId);
      await convertBookingRequestToJob(requestId);
      setBookingRequests((currentRequests) =>
        currentRequests.filter((request) => request.id !== requestId),
      );
      Alert.alert(
        t("admin.convertSuccessTitle"),
        t("admin.convertSuccessMessage"),
      );
    } catch (error) {
      console.error(
        "[admin requests] failed to convert booking request",
        error,
      );
      Alert.alert(t("common.error"), t("admin.convertErrorMessage"));
    } finally {
      setConvertingRequestId(null);
    }
  }

  return (
    <AdminScreenShell
      isLoading={isLoading}
      onBack={() => router.back()}
      title={t("admin.bookingRequestsTitle")}
    >
      <View className="mt-8">
        {bookingRequests.map((request) => (
          <Pressable
            className="border-b border-ds-hairline active:bg-ds-surface"
            disabled={convertingRequestId === request.id}
            key={request.id}
            onPress={() => handleConvertBookingRequest(request.id)}
          >
            <View className="min-h-14 flex-row items-center py-2.5">
              <View className="h-8 w-7 items-center justify-start">
                <MaterialCommunityIcons
                  color={colors.subtle}
                  name={getVehicleIcon(request.vehicle)}
                  size={20}
                />
              </View>

              <Text className="font-inter-semibold mx-2 min-w-10 text-vb-sm text-ds-accent">
                {request.preferred_date
                  ? formatDate(request.preferred_date)
                  : "—"}
              </Text>

              <View className="flex-1 gap-0">
                <Text
                  className="font-inter text-vb-md text-ds-text"
                  numberOfLines={1}
                >
                  {getRequestTitle(request) ||
                    t(`booking.vehicles.${request.vehicle}`)}
                </Text>
                <Text className="font-inter text-vb-sm text-ds-muted" numberOfLines={1}>
                  {request.client_name}
                </Text>
              </View>

              {convertingRequestId === request.id ? (
                <Text className="font-inter-medium text-vb-xs text-ds-subtle">
                  {t("admin.convertingRequest")}
                </Text>
              ) : null}
            </View>
          </Pressable>
        ))}

        {!isLoading && bookingRequests.length === 0 ? (
          <View className="p-8">
            <Text className="font-inter text-center text-vb-sm text-ds-subtle">
              {t("admin.bookingRequestsEmpty")}
            </Text>
          </View>
        ) : null}
      </View>
    </AdminScreenShell>
  );
}
