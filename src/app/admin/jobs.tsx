import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Pressable, Text, View } from "react-native";

import { AdminScreenShell } from "@/components/AdminScreenShell";
import {
  assignJobToTeamMember,
  getAssignableJobs,
  getCurrentTenantContext,
  getTeamMembers,
  type AssignedJob,
  type Profile,
} from "@/lib/data";

function getMemberName(member: Profile) {
  return member.full_name?.trim() || "—";
}

function formatDate(value: string, language: string) {
  const locale = language.startsWith("en") ? "en-US" : "sr-RS";

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function getStatusColor(status: string) {
  if (status === "u_radu") {
    return "text-ds-anytime";
  }

  if (status === "zavrseno") {
    return "text-ds-logbook";
  }

  return "text-ds-today";
}

export default function AdminJobsScreen() {
  const router = useRouter();
  const { i18n, t } = useTranslation();
  const [jobs, setJobs] = useState<AssignedJob[]>([]);
  const [teamMembers, setTeamMembers] = useState<Profile[]>([]);
  const [assigningJobId, setAssigningJobId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadJobs = useCallback(async () => {
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

      const [members, assignableJobs] = await Promise.all([
        getTeamMembers(),
        getAssignableJobs(),
      ]);

      setTeamMembers(members);
      setJobs(assignableJobs);
    } catch (error) {
      console.error("[admin jobs] failed to load jobs", error);
      Alert.alert(t("common.error"), t("admin.loadErrorMessage"));
    } finally {
      setIsLoading(false);
    }
  }, [router, t]);

  useFocusEffect(
    useCallback(() => {
      void loadJobs();
    }, [loadJobs]),
  );

  async function handleAssignJob(jobId: string, assignedTo: string | null) {
    try {
      setAssigningJobId(jobId);

      const updatedJob = await assignJobToTeamMember(jobId, assignedTo);
      const assignee = updatedJob.assigned_to
        ? (teamMembers.find((member) => member.id === updatedJob.assigned_to) ?? null)
        : null;

      setJobs((currentJobs) =>
        currentJobs.map((job) =>
          job.id === jobId
            ? {
                ...job,
                ...updatedJob,
                assignee,
              }
            : job,
        ),
      );
    } catch (error) {
      console.error("[admin jobs] failed to assign job", error);
      Alert.alert(t("common.error"), t("admin.assignJobErrorMessage"));
    } finally {
      setAssigningJobId(null);
    }
  }

  return (
    <AdminScreenShell
      isLoading={isLoading}
      onBack={() => router.back()}
      title={t("admin.jobsTitle")}
    >
      <View className="mt-8 overflow-hidden rounded-ds-panel border border-ds-hairline bg-ds-canvas">
        {jobs.map((job) => (
          <View className="border-b border-ds-hairline p-4" key={job.id}>
            <View className="flex-row items-start justify-between gap-4">
              <View className="flex-1">
                <Text className="font-inter-bold text-vb-base text-ds-text">
                  {job.client_name}
                </Text>
                <Text className="font-inter mt-1 text-vb-sm text-ds-muted">
                  {t(`staff.vehicles.${job.vehicle}`)} ·{" "}
                  {formatDate(job.created_at, i18n.language)}
                </Text>
                {job.client_phone ? (
                  <Text className="font-inter mt-1 text-vb-sm text-ds-subtle">
                    {job.client_phone}
                  </Text>
                ) : null}
                <Text className="font-inter mt-2 text-vb-sm text-ds-subtle">
                  {job.assignee
                    ? t("admin.assignedTo", { name: getMemberName(job.assignee) })
                    : t("admin.unassigned")}
                </Text>
              </View>

              <Text
                className={`font-inter-semibold text-vb-xs uppercase ${getStatusColor(
                  job.status,
                )}`}
              >
                {t(`staff.statuses.${job.status}`, { defaultValue: job.status })}
              </Text>
            </View>

            <View className="mt-3 flex-row flex-wrap gap-2">
              <Pressable
                className={`rounded-ds-pill border px-3 py-2 ${
                  job.assigned_to
                    ? "border-ds-border bg-ds-surface"
                    : "border-ds-accent bg-ds-accent-soft"
                }`}
                disabled={assigningJobId === job.id}
                onPress={() => handleAssignJob(job.id, null)}
              >
                <Text
                  className={`font-inter-semibold text-vb-sm ${
                    job.assigned_to ? "text-ds-muted" : "text-ds-accent"
                  }`}
                >
                  {t("admin.unassigned")}
                </Text>
              </Pressable>

              {teamMembers.map((member) => {
                const isAssigned = job.assigned_to === member.id;

                return (
                  <Pressable
                    className={`rounded-ds-pill border px-3 py-2 ${
                      isAssigned
                        ? "border-ds-accent bg-ds-accent-soft"
                        : "border-ds-border bg-ds-surface"
                    }`}
                    disabled={assigningJobId === job.id}
                    key={member.id}
                    onPress={() => handleAssignJob(job.id, member.id)}
                  >
                    <Text
                      className={`font-inter-semibold text-vb-sm ${
                        isAssigned ? "text-ds-accent" : "text-ds-muted"
                      }`}
                    >
                      {getMemberName(member)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}

        {!isLoading && jobs.length === 0 ? (
          <View className="p-8">
            <Text className="font-inter text-center text-vb-sm text-ds-subtle">
              {t("admin.emptyJobs")}
            </Text>
          </View>
        ) : null}
      </View>
    </AdminScreenShell>
  );
}
