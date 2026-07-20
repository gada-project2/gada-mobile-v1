import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { router } from "expo-router";
import { Pressable, RefreshControl, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EmptyState, ErrorState } from "../../src/components/app/states";
import { Card, Pill, Text } from "../../src/components/ui";
import type { PaymentRecord } from "../../src/lib/api/types";
import { formatEventDate } from "../../src/lib/dates";
import { formatNaira } from "../../src/lib/money";
import { usePaymentHistory } from "../../src/lib/queries/tickets";
import { paymentStatusLabel, paymentStatusTone } from "../../src/lib/ticket-display";
import { colors } from "../../src/theme/tokens";

function PaymentRow({ payment }: { payment: PaymentRecord }) {
  const title = payment.gadaringTitle ?? payment.title ?? "Payment";
  const when = payment.paidAt ?? payment.createdAt;
  return (
    <Card className="gap-2">
      <View className="flex-row items-start justify-between gap-3">
        <Text weight="semibold" className="flex-1" numberOfLines={1}>
          {title}
        </Text>
        <Text weight="semibold">{formatNaira(payment.amountKobo)}</Text>
      </View>
      <View className="flex-row items-center justify-between gap-2">
        <Text tone="faint" className="flex-1 text-xs" numberOfLines={1}>
          {payment.reference}
        </Text>
        <Pill tone={paymentStatusTone(payment.status)} label={paymentStatusLabel(payment.status)} />
      </View>
      {when ? (
        <Text tone="muted" className="text-xs">
          {formatEventDate(when)}
        </Text>
      ) : null}
    </Card>
  );
}

export default function PaymentHistory() {
  const query = usePaymentHistory();
  const items = query.data ?? [];

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-page">
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
          Payment history
        </Text>
      </View>

      <View className="flex-1 px-5 pt-2">
        <FlashList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PaymentRow payment={item} />}
          ItemSeparatorComponent={() => <View className="h-3" />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching}
              onRefresh={() => query.refetch()}
              tintColor={colors.brand}
            />
          }
          ListEmptyComponent={
            query.isLoading ? (
              <View className="gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="gap-2">
                    <View className="h-4 w-2/3 rounded bg-hairline" />
                    <View className="h-3 w-1/3 rounded bg-hairline" />
                  </Card>
                ))}
              </View>
            ) : query.isError ? (
              <ErrorState message="Couldn't load payment history." onRetry={() => query.refetch()} />
            ) : (
              <EmptyState
                title="No payments yet"
                message="Your paid ticket purchases will show up here."
              />
            )
          }
        />
      </View>
    </SafeAreaView>
  );
}
