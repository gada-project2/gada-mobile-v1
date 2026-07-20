import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useKeepAwakeSafe } from "../../src/lib/keep-awake";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ErrorState } from "../../src/components/app/states";
import { Card, Pill, Text } from "../../src/components/ui";
import { ApiError } from "../../src/lib/api/client";
import { formatEventDate } from "../../src/lib/dates";
import { useTicket } from "../../src/lib/queries/tickets";
import {
  isCheckedIn,
  purchaseEvent,
  resolveQr,
  tierName,
} from "../../src/lib/ticket-display";
import { colors } from "../../src/theme/tokens";

function Header() {
  return (
    <View className="flex-row items-center gap-2 px-3 py-2">
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={8}
        className="h-11 w-11 items-center justify-center"
      >
        <Ionicons name="chevron-back" size={24} color={colors.ink} />
      </Pressable>
      <Text weight="semibold" className="text-lg">
        Ticket
      </Text>
    </View>
  );
}

export default function TicketDetail() {
  const { purchaseId } = useLocalSearchParams<{ purchaseId: string }>();
  // Keep the screen awake so the QR stays visible at the gate.
  useKeepAwakeSafe();

  const query = useTicket(purchaseId);
  const ticket = query.data;

  if (query.isLoading) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-page">
        <Header />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  if (query.isError || !ticket) {
    const status = query.error instanceof ApiError ? query.error.status : 0;
    const message =
      status === 404
        ? "This ticket couldn't be found."
        : "Couldn't load this ticket. Please try again.";
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-page">
        <Header />
        <View className="flex-1 justify-center">
          <ErrorState message={message} onRetry={() => query.refetch()} />
        </View>
      </SafeAreaView>
    );
  }

  const ev = purchaseEvent(ticket);
  const checked = isCheckedIn(ticket);
  const qr = resolveQr(ticket);

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-page">
      <Header />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 16 }}>
        {/* Event summary */}
        <View className="gap-1">
          <Text weight="semibold" className="text-2xl">
            {ev.name}
          </Text>
          {ev.startDate ? (
            <Text tone="muted">{formatEventDate(ev.startDate)}</Text>
          ) : null}
          {ev.venue ? (
            <Text tone="muted" className="text-sm">
              {ev.venue}
            </Text>
          ) : null}
        </View>

        <View className="flex-row items-center gap-2">
          <Pill tone="neutral" label={tierName(ticket)} />
          {ticket.quantity && ticket.quantity > 1 ? (
            <Pill tone="neutral" label={`×${ticket.quantity}`} />
          ) : null}
          {checked ? <Pill tone="neutral" label="Checked in" /> : <Pill tone="brand" label="Valid" />}
        </View>

        {/* QR — render exactly what the API returns; we never generate our own. */}
        <Card className="items-center gap-4 bg-surface py-8">
          {qr.kind === "image" ? (
            <Image
              source={qr.value}
              style={{ width: 240, height: 240 }}
              contentFit="contain"
              accessibilityLabel="Ticket QR code"
            />
          ) : qr.kind === "token" ? (
            <View className="w-full gap-2">
              <View className="rounded-md border border-hairline-strong bg-page p-4">
                <Text className="text-center text-xs" selectable>
                  {qr.value}
                </Text>
              </View>
              <Text tone="faint" className="text-center text-xs">
                Present this code at the gate to be scanned.
              </Text>
            </View>
          ) : (
            <View className="items-center gap-2 py-6">
              <Ionicons name="qr-code-outline" size={40} color={colors.faint} />
              <Text tone="muted" className="text-center">
                Your QR isn't ready yet. Pull to refresh shortly.
              </Text>
            </View>
          )}

          {qr.kind !== "none" ? (
            <Text weight="medium" tone="muted" className="text-center">
              Show this at the gate
            </Text>
          ) : null}
        </Card>

        {checked ? (
          <View className="rounded-md bg-hairline px-4 py-3">
            <Text tone="muted" className="text-center text-sm">
              This ticket has already been checked in.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
