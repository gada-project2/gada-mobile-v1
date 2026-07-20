import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, View } from "react-native";

import type { Purchase } from "../../lib/api/types";
import { formatEventDate } from "../../lib/dates";
import { isCheckedIn, purchaseEvent, purchaseKey, tierName } from "../../lib/ticket-display";
import { useResolvedMedia } from "../../lib/queries/storage";
import { useTheme } from "../../theme/ThemeProvider";
import { colors, spacing, typography } from "../../theme/tokens";
import { Card, Chip, Pill, Text } from "../ui";

export function TicketCard({ ticket, themed = false }: { ticket: Purchase; themed?: boolean }) {
  const theme = useTheme();
  const ev = purchaseEvent(ticket);
  const checked = isCheckedIn(ticket);
  const qty = ticket.quantity && ticket.quantity > 1 ? ` · ×${ticket.quantity}` : "";
  const thumb = useResolvedMedia(ticket.gadaring?.bannerKey ?? ticket.gadaring?.photoKey).data ?? null;

  const open = () => {
    Haptics.selectionAsync().catch(() => {});
    router.push({ pathname: "/tickets/[purchaseId]", params: { purchaseId: purchaseKey(ticket) } });
  };

  // ── Legacy path (light / non-migrated screens) — unchanged. ────────────────
  if (!themed) {
    return (
      <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={`${ev.name} ticket`}>
        <Card className="gap-2">
          <View className="flex-row items-start justify-between gap-3">
            <Text weight="semibold" className="flex-1 text-base" numberOfLines={2}>
              {ev.name}
            </Text>
            {checked ? <Pill tone="neutral" label="Checked in" /> : <Pill tone="brand" label="Valid" />}
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

  // ── Themed path (mockup row): thumbnail-left · text-middle · status-right. ──
  const metaRow = (icon: keyof typeof Ionicons.glyphMap, text: string) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
      <Ionicons name={icon} size={13} color={theme.text.tertiary} />
      <Text numberOfLines={1} className="text-xs flex-1" style={{ color: theme.text.secondary }}>
        {text}
      </Text>
    </View>
  );

  return (
    <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={`${ev.name} ticket`}>
      <Card themed padded={false} style={{ overflow: "hidden" }}>
        <View style={{ flexDirection: "row", alignItems: "center", padding: spacing.sm + 2, gap: spacing.md }}>
          <View style={{ width: 56, height: 56, borderRadius: 12, overflow: "hidden", backgroundColor: theme.background.surfaceElevated, alignItems: "center", justifyContent: "center" }}>
            {thumb ? (
              <Image source={thumb} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={150} />
            ) : (
              <Ionicons name="ticket-outline" size={24} color={theme.text.tertiary} />
            )}
          </View>

          <View style={{ flex: 1, gap: 3 }}>
            <Text weight="semibold" numberOfLines={1} style={{ color: theme.text.primary, fontFamily: typography.family.semibold, fontSize: typography.size.base }}>
              {ev.name}
            </Text>
            {ev.venue ? metaRow("location-outline", ev.venue) : null}
            {ev.startDate ? metaRow("calendar-outline", `${formatEventDate(ev.startDate)}${qty}`) : null}
          </View>

          {checked ? <Chip variant="default" label="Checked in" /> : <Chip variant="going" label="Going" />}
        </View>
      </Card>
    </Pressable>
  );
}
