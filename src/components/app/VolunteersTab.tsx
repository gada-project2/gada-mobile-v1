import { zodResolver } from "@hookform/resolvers/zod";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useRef, useState } from "react";
import { ActivityIndicator, Alert, View } from "react-native";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { ApiError } from "../../lib/api/client";
import { applicationGadaringId, applyToVolunteer } from "../../lib/api/volunteers";
import type { VolunteerApplication, VolunteerRole } from "../../lib/api/types";
import { volunteerKeys } from "../../lib/queries/keys";
import { useMyApplications, useVolunteerConfig } from "../../lib/queries/volunteers";
import { roleName, roleSkills, roleSlots, statusPill } from "../../lib/volunteer-display";
import { Field } from "../auth";
import { Button, Card, Pill, Text } from "../ui";
import { FormSheet } from "./FormSheet";
import { ErrorState } from "./states";

const applySchema = z.object({
  skills: z.string().trim().min(1, "List at least one skill"),
  ageRange: z.string().trim().optional(),
  gender: z.string().trim().optional(),
  experienceLevel: z.string().trim().optional(),
});
type ApplyForm = z.infer<typeof applySchema>;

export function VolunteersTab({ gadaringId }: { gadaringId: string }) {
  const queryClient = useQueryClient();
  const config = useVolunteerConfig(gadaringId);
  const mine = useMyApplications();

  const sheetRef = useRef<BottomSheetModal>(null);
  const [selectedRole, setSelectedRole] = useState<VolunteerRole | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { control, handleSubmit, reset, formState } = useForm<ApplyForm>({
    resolver: zodResolver(applySchema),
    defaultValues: { skills: "", ageRange: "", gender: "", experienceLevel: "" },
  });

  if (config.isLoading) {
    return (
      <View className="py-10">
        <ActivityIndicator color="#378ADD" />
      </View>
    );
  }
  if (config.isError) {
    return <ErrorState message="Couldn't load volunteer roles." onRetry={() => config.refetch()} />;
  }

  const roles = config.data?.roles ?? [];
  const recruiting = !!config.data?.volunteerConfig && roles.length > 0;

  if (!recruiting) {
    return <Text tone="muted">This event isn&apos;t recruiting volunteers right now.</Text>;
  }

  const myAppFor = (roleId: string): VolunteerApplication | undefined =>
    (mine.data ?? []).find(
      (a) => applicationGadaringId(a) === gadaringId && a.volunteerRoleId === roleId,
    );

  const openApply = (role: VolunteerRole) => {
    Haptics.selectionAsync().catch(() => {});
    setSelectedRole(role);
    reset({ skills: "", ageRange: "", gender: "", experienceLevel: "" });
    sheetRef.current?.present();
  };

  const onSubmit = handleSubmit(async (values) => {
    if (!selectedRole) return;
    setSubmitting(true);
    try {
      await applyToVolunteer(gadaringId, {
        volunteerRoleId: selectedRole.id,
        skills: values.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        ageRange: values.ageRange || undefined,
        gender: values.gender || undefined,
        experienceLevel: values.experienceLevel || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await queryClient.invalidateQueries({ queryKey: volunteerKeys.myApplications() });
      sheetRef.current?.dismiss();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.status === 409
            ? "You've already applied for this role."
            : err.message
          : "Couldn't submit your application.";
      Alert.alert("Application failed", msg);
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <View className="gap-3">
      <View className="rounded-md bg-volunteering-tint px-4 py-3">
        <Text tone="volunteering-ink" className="text-sm">
          This event is recruiting volunteers. Apply for a role below.
        </Text>
      </View>

      {roles.map((r) => {
        const app = myAppFor(r.id);
        const slots = roleSlots(r);
        const skills = roleSkills(r);
        return (
          <Card key={r.id} className="gap-2">
            <View className="flex-row items-center justify-between">
              <Text weight="semibold" className="flex-1 text-base">
                {roleName(r)}
              </Text>
              {typeof slots === "number" ? <Pill tone="volunteering" label={`${slots} needed`} /> : null}
            </View>
            {r.benefits ? (
              <Text tone="muted" className="text-sm">
                {r.benefits}
              </Text>
            ) : null}
            {skills.length > 0 ? (
              <View className="flex-row flex-wrap gap-2">
                {skills.map((s, i) => (
                  <Pill key={i} tone="neutral" label={s} />
                ))}
              </View>
            ) : null}
            {r.experienceLevel ? (
              <Text tone="faint" className="text-xs">
                Experience: {r.experienceLevel}
              </Text>
            ) : null}

            {app ? (
              <View className="flex-row items-center gap-2">
                <Text tone="muted" className="text-sm">
                  Your application:
                </Text>
                <Pill {...statusPill(app.status)} />
              </View>
            ) : (
              <Button variant="secondary" label="Apply" onPress={() => openApply(r)} />
            )}
          </Card>
        );
      })}

      <FormSheet
        ref={sheetRef}
        title={selectedRole ? `Apply — ${roleName(selectedRole)}` : "Apply"}
        submitLabel="Submit application"
        submitting={submitting}
        onSubmit={onSubmit}
      >
        <Controller
          control={control}
          name="skills"
          render={({ field }) => (
            <Field
              label="Your skills"
              placeholder="e.g. First aid, crowd control"
              hint="Separate multiple skills with commas."
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={formState.errors.skills?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="experienceLevel"
          render={({ field }) => (
            <Field
              label="Experience level (optional)"
              placeholder="e.g. Beginner, intermediate"
              value={field.value ?? ""}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        />
        <Controller
          control={control}
          name="ageRange"
          render={({ field }) => (
            <Field
              label="Age range (optional)"
              placeholder="e.g. 18-25"
              value={field.value ?? ""}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        />
        <Controller
          control={control}
          name="gender"
          render={({ field }) => (
            <Field
              label="Gender (optional)"
              placeholder="e.g. Female"
              value={field.value ?? ""}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        />
      </FormSheet>
    </View>
  );
}
