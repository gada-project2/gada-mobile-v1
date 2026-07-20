import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Modal, View } from "react-native";

import type { CheckoutState } from "../../lib/payments/usePaidCheckout";
import { colors } from "../../theme/tokens";
import { Button, Card, Text } from "../ui";

export interface CheckoutOverlayProps {
  state: CheckoutState;
  onClose: () => void;
  onRetry: () => void;
  onGoToTickets: () => void;
}

/** Full-screen overlay reflecting the paid-checkout phases. */
export function CheckoutOverlay({
  state,
  onClose,
  onRetry,
  onGoToTickets,
}: CheckoutOverlayProps) {
  const { phase, attempt, maxAttempts } = state;
  const visible = phase !== "idle";
  const busy =
    phase === "initiating" || phase === "awaiting-payment" || phase === "confirming";

  const copy: Record<string, { title: string; message: string }> = {
    initiating: { title: "Starting payment…", message: "Setting up your secure checkout." },
    "awaiting-payment": {
      title: "Waiting for payment…",
      message: "Complete the payment in the browser, then come back here.",
    },
    confirming: {
      title: "Confirming payment…",
      message: `Checking with the gateway (${attempt}/${maxAttempts}).`,
    },
    success: { title: "Payment confirmed", message: "Your ticket is ready." },
    failed: { title: "Payment failed", message: "We couldn't confirm this payment." },
    "pending-timeout": {
      title: "Still processing",
      message:
        "This is taking longer than usual. Your ticket will appear in My tickets once it's confirmed.",
    },
    error: { title: "Something went wrong", message: state.error ?? "Please try again." },
  };

  const { title, message } = copy[phase] ?? { title: "", message: "" };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/50 px-8">
        <Card className="w-full items-center gap-4 p-6">
          {busy ? (
            <ActivityIndicator size="large" color={colors.brand} />
          ) : phase === "success" ? (
            <Ionicons name="checkmark-circle" size={48} color={colors.brand} />
          ) : phase === "pending-timeout" ? (
            <Ionicons name="time-outline" size={48} color={colors.invited} />
          ) : (
            <Ionicons name="alert-circle" size={48} color={colors.coral} />
          )}

          <Text weight="semibold" className="text-center text-lg">
            {title}
          </Text>
          <Text tone="muted" className="text-center">
            {message}
          </Text>

          {phase === "success" || phase === "pending-timeout" ? (
            <View className="w-full gap-2">
              <Button label="Go to my tickets" onPress={onGoToTickets} />
              {phase === "pending-timeout" ? (
                <Button variant="ghost" label="Close" haptic={false} onPress={onClose} />
              ) : null}
            </View>
          ) : phase === "failed" || phase === "error" ? (
            <View className="w-full gap-2">
              <Button label="Try again" onPress={onRetry} />
              <Button variant="ghost" label="Close" haptic={false} onPress={onClose} />
            </View>
          ) : null}
        </Card>
      </View>
    </Modal>
  );
}
