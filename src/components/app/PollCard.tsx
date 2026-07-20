import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useState } from "react";
import { Alert, Pressable, View } from "react-native";

import { ApiError } from "../../lib/api/client";
import { respondToPoll } from "../../lib/api/chat";
import type { Poll } from "../../lib/api/types";
import { optionLabel, optionVotes } from "../../lib/chat-display";
import { chatKeys } from "../../lib/queries/keys";
import { usePollResults } from "../../lib/queries/chat";
import { useTheme } from "../../theme/ThemeProvider";
import { colors } from "../../theme/tokens";
import { Button, Card, Text } from "../ui";

export function PollCard({ poll, themed = false }: { poll: Poll; themed?: boolean }) {
  const queryClient = useQueryClient();
  const theme = useTheme();
  const dark = themed && theme.mode === "dark";
  const [voted, setVoted] = useState((poll.myResponse?.length ?? 0) > 0);
  const [selected, setSelected] = useState<string[]>(poll.myResponse ?? []);
  const [busy, setBusy] = useState(false);

  const results = usePollResults(poll.id, voted);

  const toggle = (optionId: string) => {
    Haptics.selectionAsync().catch(() => {});
    setSelected((cur) => {
      if (poll.allowMultiple) {
        return cur.includes(optionId) ? cur.filter((x) => x !== optionId) : [...cur, optionId];
      }
      return [optionId];
    });
  };

  const submit = async () => {
    if (selected.length === 0) return;
    setBusy(true);
    try {
      await respondToPoll(poll.id, { selectedOptions: selected });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setVoted(true);
      await queryClient.invalidateQueries({ queryKey: chatKeys.pollResults(poll.id) });
    } catch (e) {
      Alert.alert("Couldn't submit vote", e instanceof ApiError ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const resultOptions = results.data?.options ?? poll.options;
  const total =
    results.data?.totalVotes ?? resultOptions.reduce((n, o) => n + optionVotes(o), 0);

  // Dark-mode surface/text overrides (visual only — selection accent stays the
  // poll's volunteering blue in both themes).
  const rowBg = dark ? theme.background.surfaceElevated : "#FFFFFF";
  const rowBorderOff = dark ? theme.border : colors.hairlineStrong;
  const trackBg = dark ? theme.background.surfaceElevated : "#FFFFFF";
  const primaryText = dark ? { color: theme.text.primary } : undefined;
  const mutedText = dark ? { color: theme.text.secondary } : undefined;
  const faintText = dark ? { color: theme.text.tertiary } : undefined;

  return (
    <Card themed={dark} className={dark ? undefined : "gap-3 bg-volunteering-tint"} style={dark ? { gap: 12 } : undefined}>
      <View className="flex-row items-center gap-2">
        <Text className="text-base">📊</Text>
        <Text weight="semibold" className="flex-1 text-base" style={primaryText}>
          {poll.question}
        </Text>
      </View>

      {!voted ? (
        <>
          {poll.options.map((o) => {
            const on = selected.includes(o.id);
            return (
              <Pressable
                key={o.id}
                onPress={() => toggle(o.id)}
                accessibilityRole={poll.allowMultiple ? "checkbox" : "radio"}
                accessibilityState={{ checked: on }}
                className="flex-row items-center gap-2 rounded-md border px-3 py-2.5"
                style={{ borderColor: on ? colors.volunteering : rowBorderOff, backgroundColor: rowBg }}
              >
                <View
                  className="h-5 w-5 items-center justify-center rounded-pill border"
                  style={{ borderColor: on ? colors.volunteering : rowBorderOff, backgroundColor: on ? colors.volunteering : "transparent" }}
                >
                  {on ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#FFFFFF" }} /> : null}
                </View>
                <Text className="flex-1" style={primaryText}>{optionLabel(o)}</Text>
              </Pressable>
            );
          })}
          <Button label="Vote" loading={busy} disabled={selected.length === 0} onPress={submit} themed={dark} />
          {poll.allowMultiple ? (
            <Text tone="faint" className="text-xs" style={faintText}>
              You can pick more than one.
            </Text>
          ) : null}
        </>
      ) : (
        <>
          {resultOptions.map((o) => {
            const votes = optionVotes(o);
            const pct = total > 0 ? Math.round((votes / total) * 100) : 0;
            return (
              <View key={o.id} className="gap-1">
                <View className="flex-row justify-between">
                  <Text className="flex-1 text-sm" style={primaryText}>{optionLabel(o)}</Text>
                  <Text tone="muted" className="text-sm" style={mutedText}>
                    {pct}% · {votes}
                  </Text>
                </View>
                <View className="h-2 overflow-hidden rounded-pill" style={{ backgroundColor: trackBg }}>
                  <View style={{ width: `${pct}%`, height: "100%", backgroundColor: colors.volunteering }} />
                </View>
              </View>
            );
          })}
          <Text tone="faint" className="text-xs" style={faintText}>
            {total} {total === 1 ? "vote" : "votes"} · you voted
          </Text>
        </>
      )}
    </Card>
  );
}
