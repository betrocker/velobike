import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Linking, Platform, Pressable, Text, View } from "react-native";

import { AdminScreenShell } from "@/components/AdminScreenShell";
import { AppButton } from "@/components/AppButton";
import { FormTextInput } from "@/components/FormTextInput";
import { colors } from "@/design/tokens";
import {
  assignJobToTeamMember,
  getAssignableJobs,
  getBookingUrl,
  getCurrentTenantContext,
  getTeamMembers,
  updateTenantInviteCode,
  type AssignedJob,
  type Profile,
  type TenantContext,
} from "@/lib/data";

function getMemberName(member: Profile) {
  return member.full_name?.trim() || "—";
}

export default function AdminTeamScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [context, setContext] = useState<TenantContext | null>(null);
  const [teamMembers, setTeamMembers] = useState<Profile[]>([]);
  const [jobs, setJobs] = useState<AssignedJob[]>([]);
  const [inviteCode, setInviteCode] = useState("");
  const [isInviteCodeFocused, setIsInviteCodeFocused] = useState(false);
  const [assigningJobId, setAssigningJobId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingInviteCode, setIsSavingInviteCode] = useState(false);

  const bookingUrl = context?.tenant.public_slug
    ? getBookingUrl(context.tenant.public_slug)
    : "";

  const loadTeam = useCallback(async () => {
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

      const [members, assignableJobs] = await Promise.all([getTeamMembers(), getAssignableJobs()]);

      setContext(tenantContext);
      setInviteCode(tenantContext.tenant.invite_code);
      setTeamMembers(members);
      setJobs(assignableJobs);
    } catch (error) {
      console.error("[admin team] failed to load team data", error);
      Alert.alert(t("common.error"), t("admin.loadErrorMessage"));
    } finally {
      setIsLoading(false);
    }
  }, [router, t]);

  useFocusEffect(
    useCallback(() => {
      void loadTeam();
    }, [loadTeam]),
  );

  async function handleCopyBookingLink() {
    if (!bookingUrl) {
      return;
    }

    await Clipboard.setStringAsync(bookingUrl);
    Alert.alert(
      t("admin.bookingLinkCopiedTitle"),
      t("admin.bookingLinkCopiedMessage"),
    );
  }

  function handleInviteCodeChange(value: string) {
    setInviteCode(value.toUpperCase());
  }

  async function handleSaveInviteCode() {
    if (!inviteCode.trim()) {
      Alert.alert(t("admin.inviteCodeMissingTitle"), t("admin.inviteCodeMissingMessage"));
      return;
    }

    try {
      setIsSavingInviteCode(true);

      const updatedTenant = await updateTenantInviteCode(inviteCode);

      setContext((currentContext) =>
        currentContext
          ? {
              ...currentContext,
              tenant: updatedTenant,
            }
          : currentContext,
      );
      setInviteCode(updatedTenant.invite_code);
      setIsInviteCodeFocused(false);
      Alert.alert(t("admin.inviteCodeSavedTitle"), t("admin.inviteCodeSavedMessage"));
    } catch (error) {
      console.error("[admin team] failed to update invite code", error);
      Alert.alert(t("common.error"), t("admin.inviteCodeSaveErrorMessage"));
    } finally {
      setIsSavingInviteCode(false);
    }
  }

  function getInviteMessage() {
    return t("admin.inviteShareMessage", {
      code: context?.tenant.invite_code ?? inviteCode,
      serviceName: context?.tenant.name ?? t("common.service"),
    });
  }

  async function openShareUrl(url: string) {
    const canOpen = await Linking.canOpenURL(url);

    if (!canOpen) {
      Alert.alert(t("common.error"), t("admin.inviteShareErrorMessage"));
      return;
    }

    await Linking.openURL(url);
  }

  async function handleShareInvite(channel: "sms" | "viber" | "whatsapp") {
    const message = encodeURIComponent(getInviteMessage());

    if (channel === "sms") {
      const smsUrl = Platform.OS === "ios" ? `sms:&body=${message}` : `sms:?body=${message}`;
      await Linking.openURL(smsUrl);
      return;
    }

    if (channel === "whatsapp") {
      await openShareUrl(`whatsapp://send?text=${message}`);
      return;
    }

    await openShareUrl(`viber://forward?text=${message}`);
  }

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
      console.error("[admin team] failed to assign job", error);
      Alert.alert(t("common.error"), t("admin.assignJobErrorMessage"));
    } finally {
      setAssigningJobId(null);
    }
  }

  return (
    <AdminScreenShell
      isLoading={isLoading}
      onBack={() => router.back()}
      title={t("admin.nav.teamTitle")}
    >
      <View className="mt-8 rounded-ds-panel border border-ds-hairline bg-ds-canvas p-ds-card">
        <Text className="font-inter-semibold text-vb-xs uppercase text-ds-subtle">
          {t("admin.teamMembers")}
        </Text>

        <View className="mt-4 gap-3">
          {teamMembers.map((member) => (
            <View
              className="flex-row items-center justify-between gap-4 border-b border-ds-hairline pb-3"
              key={member.id}
            >
              <View className="flex-1">
                <Text className="font-inter-semibold text-vb-base text-ds-text">
                  {getMemberName(member)}
                </Text>
                <Text className="font-inter mt-1 text-vb-sm text-ds-subtle">
                  {t(`admin.roles.${member.role}`)}
                </Text>
              </View>
            </View>
          ))}

          {!isLoading && teamMembers.length === 0 ? (
            <Text className="font-inter text-vb-sm text-ds-subtle">
              {t("admin.emptyTeamMembers")}
            </Text>
          ) : null}
        </View>
      </View>

      <View className="mt-5 rounded-ds-panel border border-ds-hairline bg-ds-canvas p-ds-card">
        <Text className="font-inter-semibold text-vb-xs uppercase text-ds-subtle">
          {t("admin.jobAssignments")}
        </Text>

        <View className="mt-4 gap-4">
          {jobs.map((job) => (
            <View className="border-b border-ds-hairline pb-4" key={job.id}>
              <View className="flex-row items-start justify-between gap-4">
                <View className="flex-1">
                  <Text className="font-inter-bold text-vb-base text-ds-text">
                    {job.client_name}
                  </Text>
                  <Text className="font-inter mt-1 text-vb-sm text-ds-muted">
                    {t(`staff.vehicles.${job.vehicle}`)} ·{" "}
                    {t(`staff.statuses.${job.status}`, { defaultValue: job.status })}
                  </Text>
                  <Text className="font-inter mt-1 text-vb-sm text-ds-subtle">
                    {job.assignee
                      ? t("admin.assignedTo", { name: getMemberName(job.assignee) })
                      : t("admin.unassigned")}
                  </Text>
                </View>
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
            <Text className="font-inter text-vb-sm text-ds-subtle">
              {t("admin.emptyAssignableJobs")}
            </Text>
          ) : null}
        </View>
      </View>

      <View className="mt-5 rounded-ds-panel border border-ds-hairline bg-ds-canvas p-ds-card">
        <Text className="font-inter-semibold text-vb-xs uppercase text-ds-subtle">
          {t("admin.teamCode")}
        </Text>
        <Text className="font-inter mt-2 text-vb-sm text-ds-muted">
          {t("admin.teamCodeHint")}
        </Text>

        <View className="mt-5 gap-3">
          <FormTextInput
            autoCapitalize="characters"
            autoCorrect={false}
            focused={isInviteCodeFocused}
            label={t("admin.fields.inviteCode")}
            labelVariant="meta"
            onBlur={() => setIsInviteCodeFocused(false)}
            onChangeText={handleInviteCodeChange}
            onFocus={() => setIsInviteCodeFocused(true)}
            placeholder={t("admin.placeholders.inviteCode")}
            value={inviteCode}
          />

          <AppButton
            disabled={isSavingInviteCode || inviteCode.trim() === context?.tenant.invite_code}
            onPress={handleSaveInviteCode}
            size="sm"
            title={
              isSavingInviteCode ? t("admin.savingInviteCode") : t("admin.saveInviteCode")
            }
            variant="secondary"
          />

          <View className="flex-row gap-2">
            <Pressable
              className="flex-1 flex-row items-center justify-center gap-1.5 rounded-ds-input border border-ds-border bg-ds-surface px-3 py-2 active:bg-ds-elevated"
              onPress={() => handleShareInvite("viber")}
            >
              <MaterialCommunityIcons color={colors.anytime} name="phone-message-outline" size={18} />
              <Text className="font-inter-semibold text-vb-sm text-ds-text">Viber</Text>
            </Pressable>

            <Pressable
              className="flex-1 flex-row items-center justify-center gap-1.5 rounded-ds-input border border-ds-border bg-ds-surface px-3 py-2 active:bg-ds-elevated"
              onPress={() => handleShareInvite("whatsapp")}
            >
              <MaterialCommunityIcons color={colors.logbook} name="whatsapp" size={18} />
              <Text className="font-inter-semibold text-vb-sm text-ds-text">WhatsApp</Text>
            </Pressable>

            <Pressable
              className="flex-1 flex-row items-center justify-center gap-1.5 rounded-ds-input border border-ds-border bg-ds-surface px-3 py-2 active:bg-ds-elevated"
              onPress={() => handleShareInvite("sms")}
            >
              <MaterialCommunityIcons color={colors.accent} name="message-text-outline" size={18} />
              <Text className="font-inter-semibold text-vb-sm text-ds-text">SMS</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <View className="mt-5 rounded-ds-panel border border-ds-hairline bg-ds-canvas p-ds-card">
        <Text className="font-inter-semibold text-vb-xs uppercase text-ds-subtle">
          {t("admin.bookingLink")}
        </Text>
        <Text className="font-inter mt-2 text-vb-sm text-ds-muted">
          {t("admin.bookingLinkHint")}
        </Text>

        <Text className="font-inter mt-6 text-vb-xs text-ds-subtle" selectable>
          {bookingUrl}
        </Text>

        <AppButton
          className="mt-5"
          disabled={!bookingUrl}
          onPress={handleCopyBookingLink}
          size="sm"
          title={t("admin.copyBookingLink")}
          variant="secondary"
        />
      </View>
    </AdminScreenShell>
  );
}
