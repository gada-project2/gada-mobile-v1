import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, Alert, View } from "react-native";

import { ApiError } from "../../lib/api/client";
import { purchaseFree } from "../../lib/api/tickets";
import type { Ticket } from "../../lib/api/types";
import { formatNaira } from "../../lib/money";
import { usePaidCheckout } from "../../lib/payments/usePaidCheckout";
import { ticketKeys } from "../../lib/queries/keys";
import { purchaseKey } from "../../lib/ticket-display";
import { colors } from "../../theme/tokens";
import { Button, Card, Pill, Text } from "../ui";
import { CheckoutOverlay } from "./CheckoutOverlay";
import { ErrorState } from "./states";

export interface TicketsTabProps {
  gadaringId: string;
  loading: boolean;
  error: boolean;
  data?: Ticket[];
  onRetry: () => void;
}

export function TicketsTab({ gadaringId, loading, error, data, onRetry }: TicketsTabProps) {
  const queryClient = useQueryClient();
  const checkout = usePaidCheckout();
  const [freeBusyId, setFreeBusyId] = useState<string | null>(null);
  const lastPaidTicket = useRef<string | null>(null);

  const buyFree = async (ticket: Ticket) => {
    setFreeBusyId(ticket.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      const purchase = await purchaseFree(gadaringId, ticket.id, 1);
      await queryClient.invalidateQueries({ queryKey: ticketKeys.all });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.push({
        pathname: "/tickets/[purchaseId]",
        params: { purchaseId: purchaseKey(purchase) },
      });
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Please check your connection and try again.";
      Alert.alert("Couldn't get ticket", message);
    } finally {
      setFreeBusyId(null);
    }
  };

  const buyPaid = (ticket: Ticket) => {
    lastPaidTicket.current = ticket.id;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    void checkout.start(gadaringId, ticket.id, 1);
  };

  if (loading) {
    return (
      <View className="py-10">
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }
  if (error) return <ErrorState message="Couldn't load tickets." onRetry={onRetry} />;

  const tickets = data ?? [];
  if (tickets.length === 0) {
    return <Text tone="muted">No ticket tiers have been published yet.</Text>;
  }

  return (
    <View className="gap-3">
      {tickets.map((t) => {
        const free = t.priceKobo <= 0;
        // null quantity = unlimited; otherwise remaining = quantity - sold.
        const remaining =
          typeof t.quantity === "number" ? Math.max(0, t.quantity - (t.sold ?? 0)) : null;
        const soldOut = remaining === 0;
        return (
          <Card key={t.id} className="gap-2">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <Text weight="semibold" className="text-base">
                  {t.name}
                </Text>
                {t.type ? (
                  <Text tone="muted" className="text-xs uppercase">
                    {t.type}
                  </Text>
                ) : null}
              </View>
              <Text weight="semibold" tone="brand-ink">
                {free ? "Free" : formatNaira(t.priceKobo)}
              </Text>
            </View>

            {t.description ? (
              <Text tone="muted" className="text-sm">
                {t.description}
              </Text>
            ) : null}

            {t.perks && t.perks.length > 0 ? (
              <View className="flex-row flex-wrap gap-2">
                {t.perks.map((perk, i) => (
                  <Pill key={i} tone="neutral" label={perk} />
                ))}
              </View>
            ) : null}

            {remaining !== null ? (
              <Text tone="faint" className="text-xs">
                {remaining > 0 ? `${remaining} left` : "Sold out"}
              </Text>
            ) : null}

            <Button
              label={soldOut ? "Sold out" : free ? "Get ticket" : "Buy ticket"}
              disabled={soldOut}
              loading={free && freeBusyId === t.id}
              onPress={() => (free ? buyFree(t) : buyPaid(t))}
            />
          </Card>
        );
      })}

      <CheckoutOverlay
        state={checkout.state}
        onClose={checkout.reset}
        onRetry={() => {
          if (lastPaidTicket.current) {
            void checkout.start(gadaringId, lastPaidTicket.current, 1);
          }
        }}
        onGoToTickets={() => {
          checkout.reset();
          router.replace("/(tabs)/tickets");
        }}
      />
    </View>
  );
}
