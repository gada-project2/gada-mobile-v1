import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { FlashList } from "@shopify/flash-list";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Switch, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FormSheet } from "../../src/components/app/FormSheet";
import { EmptyState, ErrorState } from "../../src/components/app/states";
import { Field } from "../../src/components/auth";
import { Card, Pill, Text } from "../../src/components/ui";
import { ApiError } from "../../src/lib/api/client";
import { createCircle } from "../../src/lib/api/circles";
import type { Circle } from "../../src/lib/api/types";
import { circleKeys } from "../../src/lib/queries/keys";
import { useCircles } from "../../src/lib/queries/circles";
import { colors } from "../../src/theme/tokens";

interface Draft {
  name: string;
  memberIds: string;
  membersCanSend: boolean;
  membersCanViewDetails: boolean;
  membersCanInvite: boolean;
  convenerApproveMembers: boolean;
}
const EMPTY: Draft = {
  name: "",
  memberIds: "",
  membersCanSend: true,
  membersCanViewDetails: true,
  membersCanInvite: false,
  convenerApproveMembers: false,
};

export default function CirclesScreen() {
  const circles = useCircles();
  const queryClient = useQueryClient();
  const sheetRef = useRef<BottomSheetModal>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState(false);

  const openCreate = () => {
    setDraft(EMPTY);
    sheetRef.current?.present();
  };

  const submit = async () => {
    if (!draft.name.trim()) {
      Alert.alert("Name needed", "Give your circle a name.");
      return;
    }
    setBusy(true);
    try {
      const created = await createCircle({
        name: draft.name.trim(),
        memberIds: draft.memberIds
          ? draft.memberIds.split(",").map((s) => s.trim()).filter(Boolean)
          : undefined,
        membersCanSend: draft.membersCanSend,
        membersCanViewDetails: draft.membersCanViewDetails,
        membersCanInvite: draft.membersCanInvite,
        convenerApproveMembers: draft.convenerApproveMembers,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await queryClient.invalidateQueries({ queryKey: circleKeys.list() });
      sheetRef.current?.dismiss();
      if (created?.id) router.push({ pathname: "/circles/[id]", params: { id: created.id } });
    } catch (e) {
      Alert.alert("Couldn't create circle", e instanceof ApiError ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-page">
      <View className="flex-row items-center gap-2 px-3 py-2">
        <Pressable onPress={() => router.back()} hitSlop={8} className="h-11 w-11 items-center justify-center">
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Text weight="semibold" className="flex-1 text-lg">
          My circles
        </Text>
        <Pressable onPress={openCreate} accessibilityRole="button" accessibilityLabel="New circle" hitSlop={8} className="flex-row items-center gap-1 pr-2">
          <Ionicons name="add" size={20} color={colors.brandInk} />
          <Text tone="brand-ink" weight="medium" className="text-sm">
            New
          </Text>
        </Pressable>
      </View>

      {circles.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : circles.isError ? (
        <View className="flex-1 justify-center">
          <ErrorState message="Couldn't load your circles." onRetry={() => circles.refetch()} />
        </View>
      ) : (
        <FlashList
          data={circles.data ?? []}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          renderItem={({ item }) => <CircleRow circle={item} />}
          ListEmptyComponent={
            <EmptyState
              title="No circles yet"
              message="Create a circle to coordinate with friends, co-hosts or a crew."
            />
          }
        />
      )}

      <FormSheet ref={sheetRef} title="New circle" submitLabel="Create circle" submitting={busy} onSubmit={submit}>
        <Field
          label="Name"
          placeholder="e.g. Lagos crew"
          value={draft.name}
          onChangeText={(t) => setDraft((d) => ({ ...d, name: t }))}
        />
        <Field
          label="Initial members (optional)"
          placeholder="User IDs, comma separated"
          hint="You can add members later too."
          autoCapitalize="none"
          value={draft.memberIds}
          onChangeText={(t) => setDraft((d) => ({ ...d, memberIds: t }))}
        />
        <Text weight="medium" className="pt-1 text-sm">
          Permissions
        </Text>
        <ToggleRow label="Members can send" value={draft.membersCanSend} onChange={(v) => setDraft((d) => ({ ...d, membersCanSend: v }))} />
        <ToggleRow label="Members can view details" value={draft.membersCanViewDetails} onChange={(v) => setDraft((d) => ({ ...d, membersCanViewDetails: v }))} />
        <ToggleRow label="Members can invite" value={draft.membersCanInvite} onChange={(v) => setDraft((d) => ({ ...d, membersCanInvite: v }))} />
        <ToggleRow label="Approve new members" value={draft.convenerApproveMembers} onChange={(v) => setDraft((d) => ({ ...d, convenerApproveMembers: v }))} />
      </FormSheet>
    </SafeAreaView>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="flex-1 pr-3">{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.brand, false: colors.hairlineStrong }} />
    </View>
  );
}

function CircleRow({ circle }: { circle: Circle }) {
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/circles/[id]", params: { id: circle.id } })}
      accessibilityRole="button"
      accessibilityLabel={circle.name}
    >
      <Card className="flex-row items-center gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-pill bg-brand-tint">
          <Ionicons name="people" size={20} color={colors.brandInk} />
        </View>
        <View className="flex-1">
          <Text weight="medium" numberOfLines={1}>
            {circle.name}
          </Text>
          {typeof circle.memberCount === "number" ? (
            <Text tone="muted" className="text-sm">
              {circle.memberCount} {circle.memberCount === 1 ? "member" : "members"}
            </Text>
          ) : null}
        </View>
        {circle.myRole ? <Pill tone="neutral" label={circle.myRole} /> : null}
        <Ionicons name="chevron-forward" size={18} color={colors.faint} />
      </Card>
    </Pressable>
  );
}
