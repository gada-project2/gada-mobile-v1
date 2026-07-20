import { zodResolver } from "@hookform/resolvers/zod";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FlashList } from "@shopify/flash-list";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { ConfirmSheet } from "../../../src/components/app/ConfirmSheet";
import { FormSheet } from "../../../src/components/app/FormSheet";
import { HostingDisabled } from "../../../src/components/app/HostingDisabled";
import { SegmentedControl, type Segment } from "../../../src/components/app/SegmentedControl";
import { EmptyState, ErrorState } from "../../../src/components/app/states";
import { Field } from "../../../src/components/auth";
import { Button, Card, Pill, Text } from "../../../src/components/ui";
import { ApiError } from "../../../src/lib/api/client";
import {
  createVolunteerConfig,
  createVolunteerRole,
  deleteVolunteerRole,
  reviewApplication,
  updateVolunteerRole,
} from "../../../src/lib/api/volunteers";
import type { ReviewAction, VolunteerApplication, VolunteerRole } from "../../../src/lib/api/types";
import { useAuth } from "../../../src/lib/auth/AuthContext";
import { canConvene } from "../../../src/lib/capabilities";
import { volunteerKeys } from "../../../src/lib/queries/keys";
import { useApplications, useVolunteerConfig } from "../../../src/lib/queries/volunteers";
import {
  applicantName,
  applicationRoleName,
  roleName,
  roleSkills,
  roleSlots,
  statusPill,
} from "../../../src/lib/volunteer-display";
import { colors } from "../../../src/theme/tokens";

type StatusFilter = "ALL" | "PENDING" | "APPROVED" | "REJECTED";
const FILTERS: Segment<StatusFilter>[] = [
  { key: "ALL", label: "All" },
  { key: "PENDING", label: "Pending" },
  { key: "APPROVED", label: "Approved" },
  { key: "REJECTED", label: "Rejected" },
];

const roleSchema = z.object({
  roleName: z.string().trim().min(1, "Give the role a name"),
  numberNeeded: z.string().regex(/^\d+$/, "Enter a whole number"),
  skillsRequired: z.string().trim().optional(),
  ageRange: z.string().trim().optional(),
  genderPreference: z.string().trim().optional(),
  experienceLevel: z.string().trim().optional(),
  benefits: z.string().trim().optional(),
});
type RoleForm = z.infer<typeof roleSchema>;

export default function ManageVolunteers() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const config = useVolunteerConfig(id);
  const apps = useApplications(id);

  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [busy, setBusy] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<VolunteerRole | null>(null);

  const roleRef = useRef<BottomSheetModal>(null);
  const deleteRef = useRef<BottomSheetModal>(null);
  const pendingDelete = useRef<VolunteerRole | null>(null);

  const { control, handleSubmit, reset, formState } = useForm<RoleForm>({
    resolver: zodResolver(roleSchema),
    defaultValues: { roleName: "", numberNeeded: "", skillsRequired: "", ageRange: "", genderPreference: "", experienceLevel: "", benefits: "" },
  });

  const review = useMutation({
    mutationFn: ({ appId, action }: { appId: string; action: ReviewAction }) =>
      reviewApplication(id, appId, action),
    onMutate: async ({ appId, action }) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      await queryClient.cancelQueries({ queryKey: volunteerKeys.applications(id) });
      const prev = queryClient.getQueryData<VolunteerApplication[]>(volunteerKeys.applications(id));
      queryClient.setQueryData<VolunteerApplication[]>(volunteerKeys.applications(id), (old) =>
        (old ?? []).map((a) =>
          a.id === appId ? { ...a, status: action === "approve" ? "APPROVED" : "REJECTED" } : a,
        ),
      );
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(volunteerKeys.applications(id), ctx.prev);
      Alert.alert("Couldn't update", err instanceof ApiError ? err.message : "Please try again.");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: volunteerKeys.applications(id) }),
  });

  const filtered = useMemo(() => {
    const all = apps.data ?? [];
    return filter === "ALL" ? all : all.filter((a) => a.status === filter);
  }, [apps.data, filter]);

  if (!canConvene(user)) {
    return (
      <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-page">
        <HostingDisabled onBack={() => router.back()} />
      </SafeAreaView>
    );
  }

  const cfg = config.data?.volunteerConfig ?? null;
  const roles = config.data?.roles ?? [];
  const configError = config.error;
  const is403 =
    (configError instanceof ApiError && configError.status === 403) ||
    (apps.error instanceof ApiError && apps.error.status === 403);

  const enableConfig = async () => {
    setBusy("enable");
    try {
      await createVolunteerConfig(id);
      await queryClient.invalidateQueries({ queryKey: volunteerKeys.config(id) });
    } catch (e) {
      Alert.alert("Couldn't enable", e instanceof ApiError ? e.message : "Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const openAddRole = () => {
    setEditingRole(null);
    reset({ roleName: "", numberNeeded: "", skillsRequired: "", ageRange: "", genderPreference: "", experienceLevel: "", benefits: "" });
    roleRef.current?.present();
  };
  const openEditRole = (r: VolunteerRole) => {
    setEditingRole(r);
    reset({
      roleName: roleName(r),
      numberNeeded: roleSlots(r) != null ? String(roleSlots(r)) : "",
      skillsRequired: roleSkills(r).join(", "),
      ageRange: r.ageRange ?? "",
      genderPreference: r.genderPreference ?? "",
      experienceLevel: r.experienceLevel ?? "",
      benefits: r.benefits ?? "",
    });
    roleRef.current?.present();
  };

  const submitRole = handleSubmit(async (v) => {
    setBusy("role");
    const dto = {
      roleName: v.roleName,
      numberNeeded: Number(v.numberNeeded),
      skillsRequired: v.skillsRequired ? v.skillsRequired.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
      ageRange: v.ageRange || undefined,
      genderPreference: v.genderPreference || undefined,
      experienceLevel: v.experienceLevel || undefined,
      benefits: v.benefits || undefined,
    };
    try {
      if (editingRole) await updateVolunteerRole(id, editingRole.id, dto);
      else await createVolunteerRole(id, dto);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await queryClient.invalidateQueries({ queryKey: volunteerKeys.config(id) });
      roleRef.current?.dismiss();
    } catch (e) {
      Alert.alert("Couldn't save role", e instanceof ApiError ? e.message : "Please try again.");
    } finally {
      setBusy(null);
    }
  });

  const confirmDeleteRole = (r: VolunteerRole) => {
    pendingDelete.current = r;
    deleteRef.current?.present();
  };
  const doDeleteRole = async () => {
    const r = pendingDelete.current;
    if (!r) return;
    setBusy("delete");
    try {
      await deleteVolunteerRole(id, r.id);
      await queryClient.invalidateQueries({ queryKey: volunteerKeys.config(id) });
      deleteRef.current?.dismiss();
    } catch (e) {
      Alert.alert("Couldn't delete", e instanceof ApiError ? e.message : "It may have applicants.");
    } finally {
      setBusy(null);
    }
  };

  const header = (
    <View className="gap-4 pb-2">
      <Text weight="semibold" className="text-2xl">
        Volunteers
      </Text>

      {!cfg ? (
        <Card className="gap-3">
          <Text tone="muted">
            Volunteering isn&apos;t enabled for this event yet. Enable it to add roles and take applications.
          </Text>
          <Button label="Enable volunteers" loading={busy === "enable"} onPress={enableConfig} />
        </Card>
      ) : (
        <>
          <View className="flex-row items-center justify-between">
            <Text weight="semibold" className="text-lg">
              Roles
            </Text>
            <Pressable onPress={openAddRole} accessibilityRole="button" accessibilityLabel="Add role" hitSlop={8} className="flex-row items-center gap-1">
              <Ionicons name="add" size={18} color={colors.brandInk} />
              <Text tone="brand-ink" weight="medium" className="text-sm">
                Add role
              </Text>
            </Pressable>
          </View>
          {roles.length === 0 ? (
            <Text tone="muted" className="text-sm">
              No roles yet. Add one so people can apply.
            </Text>
          ) : (
            roles.map((r) => (
              <Card key={r.id} className="gap-2">
                <View className="flex-row items-center justify-between">
                  <Text weight="medium" className="flex-1">
                    {roleName(r)}
                  </Text>
                  {typeof roleSlots(r) === "number" ? (
                    <Pill tone="volunteering" label={`${roleSlots(r)} needed`} />
                  ) : null}
                </View>
                {roleSkills(r).length > 0 ? (
                  <Text tone="muted" className="text-sm">
                    {roleSkills(r).join(", ")}
                  </Text>
                ) : null}
                <View className="flex-row gap-3">
                  <Pressable onPress={() => openEditRole(r)} hitSlop={8} className="flex-row items-center gap-1">
                    <Ionicons name="create-outline" size={16} color={colors.muted} />
                    <Text tone="muted" className="text-sm">
                      Edit
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => confirmDeleteRole(r)} hitSlop={8} className="flex-row items-center gap-1">
                    <Ionicons name="trash-outline" size={16} color={colors.interested} />
                    <Text className="text-sm" style={{ color: colors.interested }}>
                      Delete
                    </Text>
                  </Pressable>
                </View>
              </Card>
            ))
          )}

          <View className="pt-2">
            <Text weight="semibold" className="pb-2 text-lg">
              Applications
            </Text>
            <SegmentedControl segments={FILTERS} value={filter} onChange={setFilter} />
          </View>
        </>
      )}
    </View>
  );

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-page">
      <View className="flex-row items-center gap-2 px-3 py-2">
        <Pressable onPress={() => router.back()} hitSlop={8} className="h-11 w-11 items-center justify-center">
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Text weight="semibold" className="text-lg">
          Manage volunteers
        </Text>
      </View>

      {config.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : is403 ? (
        <View className="flex-1 justify-center">
          <ErrorState message="You don't manage this event." onRetry={() => config.refetch()} />
        </View>
      ) : config.isError ? (
        <View className="flex-1 justify-center">
          <ErrorState message="Couldn't load volunteers." onRetry={() => config.refetch()} />
        </View>
      ) : (
        <FlashList
          data={cfg ? filtered : []}
          keyExtractor={(a) => a.id}
          ListHeaderComponent={header}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          renderItem={({ item }) => (
            <ApplicationRow
              app={item}
              busy={review.isPending}
              onApprove={() => review.mutate({ appId: item.id, action: "approve" })}
              onReject={() => review.mutate({ appId: item.id, action: "reject" })}
            />
          )}
          ListEmptyComponent={
            !cfg ? null : apps.isLoading ? (
              <View className="py-8">
                <ActivityIndicator color={colors.brand} />
              </View>
            ) : (
              <EmptyState title="No applications" message="Applications will appear here as people apply." />
            )
          }
        />
      )}

      <FormSheet
        ref={roleRef}
        title={editingRole ? "Edit role" : "Add role"}
        submitLabel={editingRole ? "Save role" : "Add role"}
        submitting={busy === "role"}
        onSubmit={submitRole}
      >
        <Controller control={control} name="roleName" render={({ field }) => (
          <Field label="Role name" placeholder="e.g. Usher" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={formState.errors.roleName?.message} />
        )} />
        <Controller control={control} name="numberNeeded" render={({ field }) => (
          <Field label="Number needed" placeholder="e.g. 5" keyboardType="number-pad" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={formState.errors.numberNeeded?.message} />
        )} />
        <Controller control={control} name="skillsRequired" render={({ field }) => (
          <Field label="Skills required (optional)" placeholder="Comma separated" value={field.value ?? ""} onChangeText={field.onChange} onBlur={field.onBlur} />
        )} />
        <Controller control={control} name="experienceLevel" render={({ field }) => (
          <Field label="Experience level (optional)" placeholder="e.g. Beginner" value={field.value ?? ""} onChangeText={field.onChange} onBlur={field.onBlur} />
        )} />
        <Controller control={control} name="ageRange" render={({ field }) => (
          <Field label="Age range (optional)" placeholder="e.g. 18-30" value={field.value ?? ""} onChangeText={field.onChange} onBlur={field.onBlur} />
        )} />
        <Controller control={control} name="genderPreference" render={({ field }) => (
          <Field label="Gender preference (optional)" placeholder="e.g. Any" value={field.value ?? ""} onChangeText={field.onChange} onBlur={field.onBlur} />
        )} />
        <Controller control={control} name="benefits" render={({ field }) => (
          <Field label="Benefits (optional)" placeholder="e.g. Free entry, meals" value={field.value ?? ""} onChangeText={field.onChange} onBlur={field.onBlur} multiline />
        )} />
      </FormSheet>

      <ConfirmSheet
        ref={deleteRef}
        title="Delete role?"
        message="This can't be undone."
        confirmLabel="Delete role"
        destructive
        loading={busy === "delete"}
        onConfirm={doDeleteRole}
      />
    </SafeAreaView>
  );
}

function ApplicationRow({
  app,
  busy,
  onApprove,
  onReject,
}: {
  app: VolunteerApplication;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const pill = statusPill(app.status);
  const pending = app.status === "PENDING" || app.status == null;
  return (
    <Card className="gap-2">
      <View className="flex-row items-center justify-between">
        <Text weight="medium" className="flex-1">
          {applicantName(app)}
        </Text>
        <Pill {...pill} />
      </View>
      <Text tone="muted" className="text-sm">
        {applicationRoleName(app)}
      </Text>
      {app.skills && app.skills.length > 0 ? (
        <Text tone="faint" className="text-xs">
          Skills: {app.skills.join(", ")}
        </Text>
      ) : null}
      {pending ? (
        <View className="flex-row gap-3 pt-1">
          <View className="flex-1">
            <Button label="Approve" loading={busy} onPress={onApprove} />
          </View>
          <View className="flex-1">
            <Button variant="secondary" label="Reject" onPress={onReject} />
          </View>
        </View>
      ) : null}
    </Card>
  );
}
