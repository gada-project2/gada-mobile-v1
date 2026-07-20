import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { router } from "expo-router";
import { useMemo } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EmptyState, ErrorState } from "../src/components/app/states";
import { Card, Pill, Text } from "../src/components/ui";
import { applicationGadaringId } from "../src/lib/api/volunteers";
import type { VolunteerApplication, VolunteerApplicationStatus } from "../src/lib/api/types";
import { useMyApplications } from "../src/lib/queries/volunteers";
import { applicationRoleName, statusPill } from "../src/lib/volunteer-display";
import { colors } from "../src/theme/tokens";

const GROUP_ORDER: VolunteerApplicationStatus[] = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
  "WITHDRAWN",
];
const GROUP_LABEL: Record<string, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  SUSPENDED: "Suspended",
  WITHDRAWN: "Withdrawn",
};

type Row = { type: "header"; key: string; label: string } | { type: "item"; key: string; app: VolunteerApplication };

export default function Volunteering() {
  const mine = useMyApplications();

  const rows = useMemo<Row[]>(() => {
    const apps = mine.data ?? [];
    const out: Row[] = [];
    for (const status of GROUP_ORDER) {
      const group = apps.filter((a) => (a.status ?? "PENDING") === status);
      if (group.length === 0) continue;
      out.push({ type: "header", key: `h-${status}`, label: `${GROUP_LABEL[status]} (${group.length})` });
      for (const app of group) out.push({ type: "item", key: app.id, app });
    }
    return out;
  }, [mine.data]);

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-page">
      <View className="flex-row items-center gap-2 px-3 py-2">
        <Pressable onPress={() => router.back()} hitSlop={8} className="h-11 w-11 items-center justify-center">
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Text weight="semibold" className="text-lg">
          Volunteering
        </Text>
      </View>

      {mine.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : mine.isError ? (
        <View className="flex-1 justify-center">
          <ErrorState message="Couldn't load your applications." onRetry={() => mine.refetch()} />
        </View>
      ) : (
        <FlashList
          data={rows}
          keyExtractor={(r) => r.key}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          renderItem={({ item }) =>
            item.type === "header" ? (
              <Text weight="semibold" className="pb-2 pt-3 text-sm" tone="muted">
                {item.label}
              </Text>
            ) : (
              <ApplicationRow app={item.app} />
            )
          }
          ListEmptyComponent={
            <EmptyState
              title="No applications yet"
              message="Apply to volunteer from an event's Volunteers tab and track your status here."
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

function ApplicationRow({ app }: { app: VolunteerApplication }) {
  const gid = applicationGadaringId(app);
  const title = app.gadaring?.name ?? "Event";
  return (
    <Pressable
      disabled={!gid}
      onPress={() => gid && router.push({ pathname: "/events/[id]", params: { id: gid } })}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${applicationRoleName(app)}`}
      className="mb-3"
    >
      <Card className="gap-1.5">
        <View className="flex-row items-center justify-between">
          <Text weight="medium" className="flex-1 pr-2" numberOfLines={1}>
            {title}
          </Text>
          <Pill {...statusPill(app.status)} />
        </View>
        <Text tone="muted" className="text-sm">
          {applicationRoleName(app)}
        </Text>
      </Card>
    </Pressable>
  );
}
