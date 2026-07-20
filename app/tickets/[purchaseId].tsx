import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, Share, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ErrorState } from "../../src/components/app/states";
import { Logo, Text } from "../../src/components/ui";
import { ApiError } from "../../src/lib/api/client";
import { useKeepAwakeSafe } from "../../src/lib/keep-awake";
import { formatEventDate } from "../../src/lib/dates";
import { useTicket } from "../../src/lib/queries/tickets";
import { isCheckedIn, purchaseEvent, purchaseKey, resolveQr, tierName } from "../../src/lib/ticket-display";
import { useTheme } from "../../src/theme/ThemeProvider";
import { colors, typography } from "../../src/theme/tokens";

function Header({ dark }: { dark: boolean }) {
  const theme = useTheme();
  return (
    <View className="flex-row items-center gap-2 px-3 py-2">
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={8}
        className="h-11 w-11 items-center justify-center"
      >
        <Ionicons name="chevron-back" size={24} color={dark ? theme.text.primary : colors.ink} />
      </Pressable>
      <Text weight="semibold" className="text-lg" style={dark ? { color: theme.text.primary } : undefined}>
        Ticket
      </Text>
    </View>
  );
}

/** A pill-style action. Disabled actions read visibly as unavailable (no dead taps). */
function TicketAction({
  icon,
  label,
  sublabel,
  onPress,
  disabled,
  dark,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sublabel?: string;
  onPress?: () => void;
  disabled?: boolean;
  dark: boolean;
}) {
  const theme = useTheme();
  const fg = dark ? theme.text.primary : colors.ink;
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={{ flex: 1, alignItems: "center", gap: 6, opacity: disabled ? 0.45 : 1, paddingVertical: 10 }}
    >
      <View
        style={{
          width: 46,
          height: 46,
          borderRadius: 9999,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: dark ? theme.background.surfaceElevated : colors.hairline,
        }}
      >
        <Ionicons name={icon} size={20} color={fg} />
      </View>
      <Text className="text-xs" style={{ color: fg }}>
        {label}
      </Text>
      {sublabel ? (
        <Text className="text-[10px]" style={{ color: dark ? theme.text.tertiary : colors.faint }}>
          {sublabel}
        </Text>
      ) : null}
    </Pressable>
  );
}

export default function TicketDetail() {
  const { purchaseId } = useLocalSearchParams<{ purchaseId: string }>();
  const theme = useTheme();
  const dark = theme.mode === "dark";
  // Keep the screen awake so the QR stays visible at the gate.
  useKeepAwakeSafe();

  const query = useTicket(purchaseId);
  const ticket = query.data;

  const rootClass = dark ? "flex-1" : "flex-1 bg-page";
  const rootStyle = dark ? { backgroundColor: theme.background.primary } : undefined;

  if (query.isLoading) {
    return (
      <SafeAreaView edges={["top"]} className={rootClass} style={rootStyle}>
        <Header dark={dark} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={dark ? theme.accent.primary : colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  if (query.isError || !ticket) {
    const status = query.error instanceof ApiError ? query.error.status : 0;
    const message =
      status === 404 ? "This ticket couldn't be found." : "Couldn't load this ticket. Please try again.";
    return (
      <SafeAreaView edges={["top"]} className={rootClass} style={rootStyle}>
        <Header dark={dark} />
        <View className="flex-1 justify-center">
          <ErrorState message={message} onRetry={() => query.refetch()} themed={dark} />
        </View>
      </SafeAreaView>
    );
  }

  const ev = purchaseEvent(ticket);
  const checked = isCheckedIn(ticket);
  const qr = resolveQr(ticket);
  // Real field when present; else the raw purchase key. No invented "GADA-" format.
  const ticketId = ticket.ticketId ?? purchaseKey(ticket);
  const holder = ticket.holderName ?? ticket.attendeeName ?? "Guest";
  const qtyLabel = `${ticket.quantity && ticket.quantity > 1 ? ticket.quantity : 1} Ticket${
    ticket.quantity && ticket.quantity > 1 ? "s" : ""
  } · ${tierName(ticket)}`;

  const share = () => {
    Share.share({
      message: `My ticket for ${ev.name}${ev.startDate ? ` on ${formatEventDate(ev.startDate)}` : ""}${
        ev.venue ? ` at ${ev.venue}` : ""
      }. Ticket ID: ${ticketId}`,
    }).catch(() => {});
  };

  return (
    <SafeAreaView edges={["top"]} className={rootClass} style={rootStyle}>
      <Header dark={dark} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 16 }}>
        {/* Purple ticket card. Wordmark sits in a light chip (brand rule: the
            gada wordmark is always ink on a light surface, never recoloured). */}
        <View style={{ borderRadius: 24, overflow: "hidden" }}>
          <LinearGradient
            colors={[theme.accent.primary, theme.accent.primaryPressed]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ padding: 20, gap: 14 }}
          >
            <View className="flex-row items-center justify-between">
              <View style={{ backgroundColor: "#FFFFFF", borderRadius: 9999, paddingHorizontal: 12, paddingVertical: 6 }}>
                <Logo height={18} />
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text className="text-[10px]" style={{ color: "rgba(255,255,255,0.75)" }}>
                  Ticket ID
                </Text>
                <Text weight="semibold" style={{ color: "#FFFFFF", fontFamily: typography.family.semibold }} selectable>
                  {ticketId}
                </Text>
              </View>
            </View>

            <View style={{ gap: 2 }}>
              <Text weight="semibold" numberOfLines={2} style={{ color: "#FFFFFF", fontFamily: typography.family.semibold, fontSize: typography.size.xl }}>
                {ev.name}
              </Text>
              {ev.startDate ? (
                <Text style={{ color: "rgba(255,255,255,0.85)" }}>{formatEventDate(ev.startDate)}</Text>
              ) : null}
              {ev.venue ? <Text className="text-sm" style={{ color: "rgba(255,255,255,0.85)" }}>{ev.venue}</Text> : null}
            </View>

            {/* White QR card — QR content is exactly what the API returns; we
                render it, never generate it. White bg for reliable scanning. */}
            <View style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 20, alignItems: "center", gap: 12 }}>
              {qr.kind === "image" ? (
                <Image source={qr.value} style={{ width: 220, height: 220 }} contentFit="contain" accessibilityLabel="Ticket QR code" />
              ) : qr.kind === "token" ? (
                <View style={{ width: "100%", gap: 8 }}>
                  <View style={{ borderRadius: 12, borderWidth: 1, borderColor: colors.hairlineStrong, backgroundColor: colors.page, padding: 16 }}>
                    <Text className="text-center text-xs" style={{ color: colors.ink }} selectable>
                      {qr.value}
                    </Text>
                  </View>
                  <Text className="text-center text-xs" style={{ color: colors.faint }}>
                    Present this code at the gate to be scanned.
                  </Text>
                </View>
              ) : (
                <View className="items-center gap-2 py-6">
                  <Ionicons name="qr-code-outline" size={40} color={colors.faint} />
                  <Text className="text-center" style={{ color: colors.muted }}>
                    Your QR isn't ready yet. Pull to refresh shortly.
                  </Text>
                </View>
              )}

              <View style={{ alignItems: "center" }}>
                <Text weight="semibold" style={{ color: colors.ink }}>
                  {holder}
                </Text>
                <Text className="text-xs" style={{ color: colors.muted }}>
                  {qtyLabel}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Action row. Share is real; Add to Wallet (PassKit/Google Wallet) is
            not built yet, so it's shown disabled as "Coming soon" — not a dead tap. */}
        <View className="flex-row items-center justify-center gap-8">
          <TicketAction icon="share-outline" label="Share" onPress={share} dark={dark} />
          <TicketAction icon="wallet-outline" label="Add to Wallet" sublabel="Coming soon" disabled dark={dark} />
        </View>

        {checked ? (
          <View
            className="rounded-md px-4 py-3"
            style={{ backgroundColor: dark ? theme.background.surfaceElevated : colors.hairline }}
          >
            <Text className="text-center text-sm" style={{ color: dark ? theme.text.secondary : colors.muted }}>
              This ticket has already been checked in.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
