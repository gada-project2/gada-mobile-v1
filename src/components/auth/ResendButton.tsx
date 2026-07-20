import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable } from "react-native";

import { Text } from "../ui/Text";

export interface ResendButtonProps {
  /** Called when the user taps resend. May be async; the cooldown restarts after it resolves. */
  onResend: () => Promise<void> | void;
  /** Cooldown length in seconds (default 30). */
  seconds?: number;
  /** Start a cooldown immediately on mount (default true — a code was just sent). */
  startOnMount?: boolean;
}

/** "Resend code" with a cooldown timer to prevent OTP spamming / rate limits. */
export function ResendButton({
  onResend,
  seconds = 30,
  startOnMount = true,
}: ResendButtonProps) {
  const [remaining, setRemaining] = useState(startOnMount ? seconds : 0);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (remaining <= 0) return;
    timer.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1 && timer.current) clearInterval(timer.current);
        return r - 1;
      });
    }, 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [remaining > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const onPress = async () => {
    if (remaining > 0 || busy) return;
    try {
      setBusy(true);
      await onResend();
      setRemaining(seconds);
    } finally {
      setBusy(false);
    }
  };

  const disabled = remaining > 0 || busy;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled, busy }}
      className="min-h-[44px] flex-row items-center justify-center gap-2"
    >
      {busy ? (
        <ActivityIndicator size="small" color="#5B636B" />
      ) : (
        <Text tone={disabled ? "faint" : "brand-ink"} weight="medium">
          {remaining > 0 ? `Resend code in ${remaining}s` : "Resend code"}
        </Text>
      )}
    </Pressable>
  );
}
