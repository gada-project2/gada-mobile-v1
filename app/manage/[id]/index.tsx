import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Switch, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ConfirmSheet } from "../../../src/components/app/ConfirmSheet";
import { DateTimeField } from "../../../src/components/app/DateTimeField";
import { FormSheet } from "../../../src/components/app/FormSheet";
import { HostingDisabled } from "../../../src/components/app/HostingDisabled";
import { ErrorState } from "../../../src/components/app/states";
import { TierFields } from "../../../src/components/app/TierFields";
import { Field } from "../../../src/components/auth";
import { Button, Card, ImageUpload, Pill, Text } from "../../../src/components/ui";
import { ApiError } from "../../../src/lib/api/client";
import { deleteFile } from "../../../src/lib/api/storage";
import {
  addAssignee,
  addPingPoint,
  cancelGadaring,
  createTicketTier,
  deletePingPoint,
  deleteTicketTier,
  publishGadaring,
  removeAssignee,
  repeatGadaring,
  updateGadaring,
  updateTicketTier,
} from "../../../src/lib/api/manage";
import type { Ticket } from "../../../src/lib/api/types";
import { useAuth } from "../../../src/lib/auth/AuthContext";
import { canConvene } from "../../../src/lib/capabilities";
import { formatEventRange } from "../../../src/lib/dates";
import { useDeviceLocation } from "../../../src/lib/location";
import { formatNaira } from "../../../src/lib/money";
import { gadaringKeys, manageKeys } from "../../../src/lib/queries/keys";
import {
  useGadaring,
  usePingPoints,
  useTickets,
  useVolunteerConfig,
} from "../../../src/lib/queries/gadarings";
import { useAssignees } from "../../../src/lib/queries/manage";
import { adminPill, statusPill } from "../../../src/lib/status-display";
import { emptyTier, tierToDto, validateTier, type DraftTier } from "../../../src/lib/tier-draft";
import { colors } from "../../../src/theme/tokens";

function ticketToDraft(t: Ticket): DraftTier {
  return {
    name: t.name,
    type: t.type ?? "REGULAR",
    isFree: t.priceKobo <= 0,
    priceNaira: t.priceKobo > 0 ? String(t.priceKobo / 100) : "",
    quantity: t.quantity != null ? String(t.quantity) : "",
    perks: (t.perks ?? []).join(", "),
    description: t.description ?? "",
  };
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="flex-1 gap-1">
      <Text weight="semibold" className="text-2xl">
        {value}
      </Text>
      <Text tone="muted" className="text-sm">
        {label}
      </Text>
      {hint ? (
        <Text tone="faint" className="text-xs">
          {hint}
        </Text>
      ) : null}
    </Card>
  );
}

function SectionHeader({ title, onAdd }: { title: string; onAdd?: () => void }) {
  return (
    <View className="flex-row items-center justify-between pt-2">
      <Text weight="semibold" className="text-lg">
        {title}
      </Text>
      {onAdd ? (
        <Pressable onPress={onAdd} accessibilityRole="button" accessibilityLabel={`Add to ${title}`} hitSlop={8} className="flex-row items-center gap-1">
          <Ionicons name="add" size={18} color={colors.brandInk} />
          <Text tone="brand-ink" weight="medium" className="text-sm">
            Add
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function ManageDashboard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const location = useDeviceLocation();

  const detail = useGadaring(id);
  const event = detail.data;
  const tickets = useTickets(id);
  const volunteer = useVolunteerConfig(id);
  const pings = usePingPoints(id);
  const assignees = useAssignees(id);

  // Sheet refs
  const publishRef = useRef<BottomSheetModal>(null);
  const cancelRef = useRef<BottomSheetModal>(null);
  const repeatRef = useRef<BottomSheetModal>(null);
  const tierRef = useRef<BottomSheetModal>(null);
  const pingRef = useRef<BottomSheetModal>(null);
  const assigneeRef = useRef<BottomSheetModal>(null);
  const basicsRef = useRef<BottomSheetModal>(null);

  const [busy, setBusy] = useState<string | null>(null);

  // Drafts
  const [tierDraft, setTierDraft] = useState<DraftTier>(emptyTier());
  const [tierEditingId, setTierEditingId] = useState<string | null>(null);
  const [tierError, setTierError] = useState<string | null>(null);
  const [pingDraft, setPingDraft] = useState({ name: "", description: "" });
  const [assigneeDraft, setAssigneeDraft] = useState({ email: "", role: "" });
  const [repeatStart, setRepeatStart] = useState<Date | null>(null);
  const [repeatEnd, setRepeatEnd] = useState<Date | null>(null);
  const [basics, setBasics] = useState({
    title: "",
    description: "",
    venue: "",
    capacity: "",
    dressCode: "",
    isPrivate: false,
  });

  const invalidate = async (...keys: (readonly unknown[])[]) => {
    await Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
  };

  if (!canConvene(user)) {
    return (
      <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-page">
        <HostingDisabled onBack={() => router.replace("/(tabs)")} />
      </SafeAreaView>
    );
  }

  if (detail.isLoading) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-page">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  if (detail.isError || !event) {
    const status = detail.error instanceof ApiError ? detail.error.status : 0;
    const message =
      status === 403
        ? "You don't manage this event."
        : status === 404
          ? "This event couldn't be found."
          : "Couldn't load this event.";
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-page">
        <View className="flex-row items-center gap-2 px-3 py-2">
          <Pressable onPress={() => router.back()} hitSlop={8} className="h-11 w-11 items-center justify-center">
            <Ionicons name="chevron-back" size={24} color={colors.ink} />
          </Pressable>
        </View>
        <View className="flex-1 justify-center">
          <ErrorState message={message} onRetry={() => detail.refetch()} />
        </View>
      </SafeAreaView>
    );
  }

  const s = statusPill(event.status);
  const admin = adminPill(event.adminStatus);
  const isDraft = event.status === "DRAFT";
  const isCancelled = event.status === "CANCELLED";

  // Derived metrics (no stats endpoint — computed from ticket tiers).
  const tierList = tickets.data ?? [];
  let sold = 0;
  let revenue = 0;
  let hasSoldData = false;
  for (const t of tierList) {
    if (typeof t.sold === "number") {
      sold += t.sold;
      revenue += t.sold * t.priceKobo;
      hasSoldData = true;
    }
  }
  const volunteerRoles = volunteer.data?.roles?.length ?? 0;

  // Banner: persist the new key (or null to remove) then best-effort delete the
  // replaced R2 object (our own key — never a pasted CDN URL).
  const handleBanner = async (key: string | null) => {
    const prev = event.bannerKey ?? undefined;
    try {
      await updateGadaring(event.id, { bannerKey: key });
      await invalidate(gadaringKeys.detail(event.id), manageKeys.all, gadaringKeys.all);
      if (prev && prev !== key && !/^https?:\/\//i.test(prev)) {
        deleteFile(prev).catch((err) =>
          console.warn("Failed to delete old banner", err instanceof ApiError ? err.status : err),
        );
      }
    } catch (e) {
      Alert.alert("Couldn't update banner", e instanceof ApiError ? e.message : "Please try again.");
    }
  };

  // --- Lifecycle actions ---
  const doPublish = async () => {
    setBusy("publish");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      await publishGadaring(event.id);
      await invalidate(gadaringKeys.detail(event.id), manageKeys.all, gadaringKeys.all);
      publishRef.current?.dismiss();
    } catch (err) {
      Alert.alert("Couldn't publish", err instanceof ApiError ? err.message : "Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const doCancel = async () => {
    setBusy("cancel");
    try {
      await cancelGadaring(event.id);
      await invalidate(gadaringKeys.detail(event.id), manageKeys.all, gadaringKeys.all);
      cancelRef.current?.dismiss();
    } catch (err) {
      Alert.alert("Couldn't cancel", err instanceof ApiError ? err.message : "Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const doRepeat = async () => {
    if (!repeatStart || !repeatEnd || repeatEnd <= repeatStart) {
      Alert.alert("Pick dates", "Choose a start and a later end time for the new event.");
      return;
    }
    setBusy("repeat");
    try {
      const clone = await repeatGadaring(event.id, {
        startDate: repeatStart.toISOString(),
        endDate: repeatEnd.toISOString(),
      });
      await invalidate(manageKeys.all, gadaringKeys.all);
      repeatRef.current?.dismiss();
      router.replace({ pathname: "/manage/[id]", params: { id: clone.id } });
    } catch (err) {
      Alert.alert("Couldn't repeat", err instanceof ApiError ? err.message : "Please try again.");
    } finally {
      setBusy(null);
    }
  };

  // --- Ticket tier CRUD ---
  const openAddTier = () => {
    setTierDraft(emptyTier());
    setTierEditingId(null);
    setTierError(null);
    tierRef.current?.present();
  };
  const openEditTier = (t: Ticket) => {
    setTierDraft(ticketToDraft(t));
    setTierEditingId(t.id);
    setTierError(null);
    tierRef.current?.present();
  };
  const submitTier = async () => {
    const err = validateTier(tierDraft);
    if (err) {
      setTierError(err);
      return;
    }
    setBusy("tier");
    try {
      if (tierEditingId) {
        await updateTicketTier(event.id, tierEditingId, tierToDto(tierDraft));
      } else {
        await createTicketTier(event.id, tierToDto(tierDraft));
      }
      await invalidate(gadaringKeys.tickets(event.id));
      tierRef.current?.dismiss();
    } catch (e) {
      setTierError(e instanceof ApiError ? e.message : "Couldn't save the tier.");
    } finally {
      setBusy(null);
    }
  };
  const confirmDeleteTier = (t: Ticket) => {
    Alert.alert("Delete tier", `Delete "${t.name}"? This can't be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteTicketTier(event.id, t.id);
            await invalidate(gadaringKeys.tickets(event.id));
          } catch (e) {
            Alert.alert("Couldn't delete", e instanceof ApiError ? e.message : "It may have purchases.");
          }
        },
      },
    ]);
  };

  // --- Ping points CRUD ---
  const openAddPing = () => {
    setPingDraft({ name: "", description: "" });
    pingRef.current?.present();
  };
  const submitPing = async () => {
    if (!pingDraft.name.trim()) {
      Alert.alert("Name needed", "Give the ping point a name.");
      return;
    }
    setBusy("ping");
    try {
      await addPingPoint(event.id, {
        label: pingDraft.name.trim(),
        latitude: location.coords.lat,
        longitude: location.coords.lng,
        description: pingDraft.description.trim() || undefined,
      });
      await invalidate(gadaringKeys.pingPoints(event.id));
      pingRef.current?.dismiss();
    } catch (e) {
      Alert.alert("Couldn't add", e instanceof ApiError ? e.message : "Please try again.");
    } finally {
      setBusy(null);
    }
  };
  const confirmDeletePing = (ppId: string, name: string) => {
    Alert.alert("Delete ping point", `Delete "${name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deletePingPoint(event.id, ppId);
            await invalidate(gadaringKeys.pingPoints(event.id));
          } catch (e) {
            Alert.alert("Couldn't delete", e instanceof ApiError ? e.message : "Please try again.");
          }
        },
      },
    ]);
  };

  // --- Assignees CRUD ---
  const openAddAssignee = () => {
    setAssigneeDraft({ email: "", role: "" });
    assigneeRef.current?.present();
  };
  const submitAssignee = async () => {
    if (!assigneeDraft.email.trim()) {
      Alert.alert("Email needed", "Enter the person's email.");
      return;
    }
    setBusy("assignee");
    try {
      await addAssignee(event.id, {
        email: assigneeDraft.email.trim(),
        role: assigneeDraft.role.trim() || undefined,
      });
      await invalidate(manageKeys.assignees(event.id));
      assigneeRef.current?.dismiss();
    } catch (e) {
      Alert.alert("Couldn't add", e instanceof ApiError ? e.message : "Please try again.");
    } finally {
      setBusy(null);
    }
  };
  const confirmRemoveAssignee = (assigneeId: string, label: string) => {
    Alert.alert("Remove assignee", `Remove ${label}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await removeAssignee(event.id, assigneeId);
            await invalidate(manageKeys.assignees(event.id));
          } catch (e) {
            Alert.alert("Couldn't remove", e instanceof ApiError ? e.message : "Please try again.");
          }
        },
      },
    ]);
  };

  // --- Edit basics ---
  const openBasics = () => {
    setBasics({
      title: event.name,
      description: event.description ?? "",
      venue: event.venue ?? "",
      capacity: "",
      dressCode: "",
      isPrivate: !!event.isPrivate,
    });
    basicsRef.current?.present();
  };
  const submitBasics = async () => {
    if (!basics.title.trim()) {
      Alert.alert("Title needed", "The event needs a title.");
      return;
    }
    setBusy("basics");
    try {
      await updateGadaring(event.id, {
        name: basics.title.trim(),
        description: basics.description.trim() || undefined,
        venue: basics.venue.trim() || undefined,
        maxAttendees: basics.capacity ? Number(basics.capacity) : undefined,
        dressCode: basics.dressCode.trim() || undefined,
        isPrivate: basics.isPrivate,
      });
      await invalidate(gadaringKeys.detail(event.id), manageKeys.all);
      basicsRef.current?.dismiss();
    } catch (e) {
      Alert.alert("Couldn't save", e instanceof ApiError ? e.message : "Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const pingList = pings.data ?? [];
  const assigneeList = assignees.data ?? [];

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-page">
      <View className="flex-row items-center gap-2 px-3 py-2">
        <Pressable onPress={() => router.back()} hitSlop={8} className="h-11 w-11 items-center justify-center">
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Text weight="semibold" className="text-lg">
          Manage
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={detail.isRefetching}
            onRefresh={() => {
              detail.refetch();
              tickets.refetch();
            }}
            tintColor={colors.brand}
          />
        }
      >
        {/* Header */}
        <View className="gap-2">
          <View className="flex-row items-center gap-2">
            <Pill tone={s.tone} label={s.label} />
            {admin ? <Pill tone={admin.tone} label={admin.label} /> : null}
          </View>
          <Text weight="semibold" className="text-2xl">
            {event.name}
          </Text>
          <Text tone="muted" className="text-sm">
            {formatEventRange(event.startDate, event.endDate)}
          </Text>
        </View>

        {/* Event banner */}
        <ImageUpload
          variant="banner"
          purpose="banner"
          label="Banner"
          value={event.bannerKey ?? null}
          onChange={handleBanner}
        />

        {isCancelled ? (
          <View className="rounded-md bg-coral-tint px-4 py-3">
            <Text tone="coral-ink" className="text-sm">
              This event is cancelled.
            </Text>
          </View>
        ) : null}

        {event.status === "PUBLISHED" || event.status === "ONGOING" ? (
          <Button
            label="Open check-in scanner"
            onPress={() => router.push({ pathname: "/manage/[id]/checkin", params: { id: event.id } })}
          />
        ) : null}

        <Button
          variant="secondary"
          label="Manage volunteers"
          onPress={() => router.push({ pathname: "/manage/[id]/volunteers", params: { id: event.id } })}
        />

        {/* Lifecycle actions */}
        <View className="flex-row flex-wrap gap-2">
          {isDraft ? (
            <View className="flex-1">
              <Button label="Publish" loading={busy === "publish"} onPress={() => publishRef.current?.present()} />
            </View>
          ) : null}
          {!isCancelled && event.status !== "COMPLETED" ? (
            <View className="flex-1">
              <Button variant="secondary" label="Cancel event" onPress={() => cancelRef.current?.present()} />
            </View>
          ) : null}
        </View>
        <View className="flex-row flex-wrap gap-2">
          <View className="flex-1">
            <Button variant="secondary" label="Repeat" onPress={() => repeatRef.current?.present()} />
          </View>
          {!isCancelled ? (
            <View className="flex-1">
              <Button variant="secondary" label="Edit details" onPress={openBasics} />
            </View>
          ) : null}
        </View>

        {isDraft ? (
          <Text tone="faint" className="text-xs">
            Publishing submits for admin review (adminStatus PENDING); it won't appear in public Discover until approved.
          </Text>
        ) : null}

        {/* Metrics */}
        <View className="gap-3">
          <View className="flex-row gap-3">
            <MetricCard label="Tickets sold" value={hasSoldData ? String(sold) : "—"} />
            <MetricCard label="Revenue" value={hasSoldData ? formatNaira(revenue) : "—"} />
          </View>
          <View className="flex-row gap-3">
            <MetricCard label="Checked in" value="—" hint="No stats endpoint yet" />
            <MetricCard label="Volunteer roles" value={String(volunteerRoles)} />
          </View>
        </View>

        {/* Ticket tiers */}
        <SectionHeader title="Ticket tiers" onAdd={openAddTier} />
        {tickets.isLoading ? (
          <ActivityIndicator color={colors.brand} />
        ) : tierList.length === 0 ? (
          <Text tone="muted" className="text-sm">
            No tiers yet. Add one so people can attend.
          </Text>
        ) : (
          tierList.map((t) => (
            <Card key={t.id} className="flex-row items-center justify-between">
              <View className="flex-1 pr-2">
                <Text weight="medium">{t.name}</Text>
                <Text tone="muted" className="text-sm">
                  {t.priceKobo <= 0 ? "Free" : formatNaira(t.priceKobo)}
                  {typeof t.quantity === "number" ? ` · ${t.quantity} total` : ""}
                </Text>
              </View>
              <Pressable onPress={() => openEditTier(t)} hitSlop={8} className="h-9 w-9 items-center justify-center">
                <Ionicons name="create-outline" size={18} color={colors.muted} />
              </Pressable>
              <Pressable onPress={() => confirmDeleteTier(t)} hitSlop={8} className="h-9 w-9 items-center justify-center">
                <Ionicons name="trash-outline" size={18} color={colors.muted} />
              </Pressable>
            </Card>
          ))
        )}

        {/* Ping points */}
        <SectionHeader title="Ping points" onAdd={openAddPing} />
        {pingList.length === 0 ? (
          <Text tone="muted" className="text-sm">
            No ping points yet.
          </Text>
        ) : (
          pingList.map((p) => (
            <Card key={p.id} className="flex-row items-center justify-between">
              <View className="flex-1 pr-2">
                <Text weight="medium">{p.label}</Text>
                <Text tone="faint" className="text-xs">
                  {p.latitude.toFixed(4)}, {p.longitude.toFixed(4)}
                </Text>
              </View>
              <Pressable onPress={() => confirmDeletePing(p.id, p.label)} hitSlop={8} className="h-9 w-9 items-center justify-center">
                <Ionicons name="trash-outline" size={18} color={colors.muted} />
              </Pressable>
            </Card>
          ))
        )}

        {/* Assignees */}
        <SectionHeader title="Assignees" onAdd={openAddAssignee} />
        {assignees.isLoading ? (
          <ActivityIndicator color={colors.brand} />
        ) : assigneeList.length === 0 ? (
          <Text tone="muted" className="text-sm">
            No assignees yet. Add gate staff or co-hosts.
          </Text>
        ) : (
          assigneeList.map((a) => {
            const label = a.displayName ?? a.name ?? a.email ?? a.userId ?? "Assignee";
            return (
              <Card key={a.id} className="flex-row items-center justify-between">
                <View className="flex-1 pr-2">
                  <Text weight="medium">{label}</Text>
                  {a.role ? (
                    <Text tone="muted" className="text-sm">
                      {a.role}
                    </Text>
                  ) : null}
                </View>
                <Pressable onPress={() => confirmRemoveAssignee(a.id, label)} hitSlop={8} className="h-9 w-9 items-center justify-center">
                  <Ionicons name="close" size={18} color={colors.muted} />
                </Pressable>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* Sheets */}
      <ConfirmSheet
        ref={publishRef}
        title="Publish this event?"
        message="It will be submitted for admin review. Once approved, it appears in public Discover."
        confirmLabel="Publish"
        loading={busy === "publish"}
        onConfirm={doPublish}
      />
      <ConfirmSheet
        ref={cancelRef}
        title="Cancel this event?"
        message="Attendees will be notified. This can't be undone."
        confirmLabel="Cancel event"
        destructive
        loading={busy === "cancel"}
        onConfirm={doCancel}
      />

      <FormSheet ref={repeatRef} title="Repeat event" submitLabel="Create copy" submitting={busy === "repeat"} onSubmit={doRepeat}>
        <Text tone="muted" className="text-sm">
          This clones the event as a new draft with new dates.
        </Text>
        <DateTimeField label="New start" value={repeatStart} onChange={setRepeatStart} minimumDate={new Date()} />
        <DateTimeField label="New end" value={repeatEnd} onChange={setRepeatEnd} minimumDate={repeatStart ?? new Date()} />
      </FormSheet>

      <FormSheet
        ref={tierRef}
        title={tierEditingId ? "Edit tier" : "Add tier"}
        submitLabel={tierEditingId ? "Save tier" : "Add tier"}
        submitting={busy === "tier"}
        onSubmit={submitTier}
      >
        <TierFields value={tierDraft} onChange={setTierDraft} />
        {tierError ? <Text className="text-sm text-interested">{tierError}</Text> : null}
      </FormSheet>

      <FormSheet ref={pingRef} title="Add ping point" submitLabel="Add ping point" submitting={busy === "ping"} onSubmit={submitPing}>
        <Field label="Name" placeholder="e.g. Main gate" value={pingDraft.name} onChangeText={(t) => setPingDraft((d) => ({ ...d, name: t }))} />
        <Field label="Description (optional)" placeholder="Notes" value={pingDraft.description} onChangeText={(t) => setPingDraft((d) => ({ ...d, description: t }))} multiline />
        <Text tone="faint" className="text-xs">
          Uses your current location: {location.coords.lat.toFixed(4)}, {location.coords.lng.toFixed(4)}
        </Text>
      </FormSheet>

      <FormSheet ref={assigneeRef} title="Add assignee" submitLabel="Add assignee" submitting={busy === "assignee"} onSubmit={submitAssignee}>
        <Field
          label="Email"
          placeholder="person@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          value={assigneeDraft.email}
          onChangeText={(t) => setAssigneeDraft((d) => ({ ...d, email: t }))}
        />
        <Field label="Role (optional)" placeholder="e.g. Gate staff" value={assigneeDraft.role} onChangeText={(t) => setAssigneeDraft((d) => ({ ...d, role: t }))} />
      </FormSheet>

      <FormSheet ref={basicsRef} title="Edit details" submitLabel="Save changes" submitting={busy === "basics"} onSubmit={submitBasics}>
        <Field label="Title" value={basics.title} onChangeText={(t) => setBasics((b) => ({ ...b, title: t }))} />
        <Field label="Description" value={basics.description} onChangeText={(t) => setBasics((b) => ({ ...b, description: t }))} multiline />
        <Field label="Venue" value={basics.venue} onChangeText={(t) => setBasics((b) => ({ ...b, venue: t }))} />
        <Field label="Capacity (optional)" keyboardType="number-pad" value={basics.capacity} onChangeText={(t) => setBasics((b) => ({ ...b, capacity: t.replace(/[^0-9]/g, "") }))} />
        <Field label="Dress code (optional)" value={basics.dressCode} onChangeText={(t) => setBasics((b) => ({ ...b, dressCode: t }))} />
        <View className="flex-row items-center justify-between">
          <Text weight="medium">Private event</Text>
          <Switch value={basics.isPrivate} onValueChange={(v) => setBasics((b) => ({ ...b, isPrivate: v }))} trackColor={{ true: colors.brand, false: colors.hairlineStrong }} />
        </View>
      </FormSheet>
    </SafeAreaView>
  );
}
