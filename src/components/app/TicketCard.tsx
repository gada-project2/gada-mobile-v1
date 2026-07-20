import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { Pressable, View } from "react-native";

import type { Purchase } from "../../lib/api/types";
import { formatEventDate } from "../../lib/dates";
import {
  isCheckedIn,
  purchaseEvent,
  purchaseKey,
  tierName,
} from "../../lib/ticket-display";
import { colors } from "../../theme/tokens";
import { Card, Pill, Text } from "../ui";

export function TicketCard({ ticket }: { ticket: Purchase }) {
  const ev = purchaseEvent(ticket);
  const checked = isCheckedIn(ticket);
  const qty = ticket.quantity && ticket.quantity > 1 ? ` · ×${ticket.quantity}` : "";

  const open = () => {
    Haptics.selectionAsync().catch(() => {});
    router.push({
      pathname: "/tickets/[purchaseId]",
      params: { purchaseId: purchaseKey(ticket) },
    });
  };

  return (
    <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={`${ev.name} ticket`}>
      <Card className="gap-2">
        <View className="flex-row items-start justify-between gap-3">
          <Text weight="semibold" className="flex-1 text-base" numberOfLines={2}>
            {ev.name}
          </Text>
          {checked ? (
            <Pill tone="neutral" label="Checked in" />
          ) : (
            <Pill tone="brand" label="Valid" />
          )}
        </View>

        <View className="flex-row items-center gap-1.5">
          <Ionicons name="pricetag-outline" size={14} color={colors.muted} />
          <Text tone="muted" className="text-sm">
            {tierName(ticket)}
            {qty}
          </Text>
        </View>

        {ev.startDate ? (
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="calendar-outline" size={14} color={colors.muted} />
            <Text tone="muted" className="text-sm" numberOfLines={1}>
              {formatEventDate(ev.startDate)}
            </Text>
          </View>
        ) : null}

        {ev.venue ? (
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="location-outline" size={14} color={colors.muted} />
            <Text tone="muted" className="text-sm" numberOfLines={1}>
              {ev.venue}
            </Text>
          </View>
        ) : null}

        <View className="flex-row items-center gap-1 pt-1">
          <Ionicons name="qr-code-outline" size={14} color={colors.brand} />
          <Text tone="brand-ink" weight="medium" className="text-sm">
            View ticket & QR
          </Text>
        </View>
      </Card>
    </Pressable>
  );
}
