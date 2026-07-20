import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { FlashList } from "@shopify/flash-list";
import { useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Switch, TextInput, View } from "react-native";

import { ApiError } from "../../lib/api/client";
import {
  createCirclePoll,
  createEventPoll,
  sendCircleMessage,
  sendDirectMessage,
  sendEventMessage,
} from "../../lib/api/chat";
import type { ChatMessage } from "../../lib/api/types";
import { useAuth } from "../../lib/auth/AuthContext";
import { cn } from "../../lib/cn";
import { messageSenderId, messageText, messageTime } from "../../lib/chat-display";
import { chatKeys } from "../../lib/queries/keys";
import { useChatMessages, type ChatKind } from "../../lib/queries/chat";
import { useResolvedMedia } from "../../lib/queries/storage";
import { useTheme } from "../../theme/ThemeProvider";
import { colors, radius, spacing, typography } from "../../theme/tokens";
import { Field } from "../auth";
import { Avatar, Card, Text } from "../ui";
import { FormSheet } from "./FormSheet";
import { PollCard } from "./PollCard";
import { EmptyState, ErrorState } from "./states";

function clockTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

export function ChatThread({ kind, id }: { kind: ChatKind; id: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const theme = useTheme();
  const dark = theme.mode === "dark";
  const isGroup = kind === "circle" || kind === "event";
  const canCreatePoll = kind === "circle" || kind === "event";

  const messages = useChatMessages(kind, id);
  const items = useMemo<ChatMessage[]>(
    () => messages.data?.pages.flatMap((p) => p.items) ?? [],
    [messages.data],
  );

  const pollRef = useRef<BottomSheetModal>(null);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState("");
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [busy, setBusy] = useState(false);

  // Composer
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const submitPoll = async () => {
    const options = pollOptions.split("\n").map((s) => s.trim()).filter(Boolean);
    if (!pollQuestion.trim() || options.length < 2) {
      Alert.alert("Poll needs more", "Add a question and at least two options.");
      return;
    }
    setBusy(true);
    try {
      const dto = { question: pollQuestion.trim(), options, allowMultiple };
      if (kind === "circle") await createCirclePoll(id, dto);
      else await createEventPoll(id, dto);
      await queryClient.invalidateQueries({ queryKey: chatKeys.messages(kind, id) });
      setPollQuestion("");
      setPollOptions("");
      setAllowMultiple(false);
      pollRef.current?.dismiss();
    } catch (e) {
      Alert.alert("Couldn't create poll", e instanceof ApiError ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    setSendError(null);
    try {
      const dto = { content, type: "TEXT" as const };
      if (kind === "event") await sendEventMessage(id, dto);
      else if (kind === "circle") await sendCircleMessage(id, dto);
      else await sendDirectMessage(id, dto);
      setDraft("");
      // Show the new message immediately, not on the next poll cycle.
      await queryClient.invalidateQueries({ queryKey: chatKeys.messages(kind, id) });
    } catch (e) {
      setSendError(
        e instanceof ApiError
          ? e.status === 403
            ? "You're not a participant in this conversation."
            : e.message
          : "Couldn't send. Check your connection and try again.",
      );
    } finally {
      setSending(false);
    }
  };

  const canSend = !!draft.trim() && !sending;

  return (
    <View className="flex-1">
      {messages.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={dark ? theme.accent.primary : colors.brand} />
        </View>
      ) : messages.isError ? (
        <View className="flex-1 justify-center">
          <ErrorState message="Couldn't load chat." onRetry={() => messages.refetch()} themed={dark} />
        </View>
      ) : (
        <FlashList
          data={items}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 16 }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (messages.hasNextPage && !messages.isFetchingNextPage) void messages.fetchNextPage();
          }}
          renderItem={({ item }) =>
            item.poll ? (
              <PollCard poll={item.poll} themed={dark} />
            ) : (
              <MessageBubble message={item} mine={messageSenderId(item) === user?.id} dark={dark} isGroup={isGroup} />
            )
          }
          ListEmptyComponent={
            <EmptyState title="No messages yet" message="Chat history will appear here." themed={dark} />
          }
          ListFooterComponent={
            messages.isFetchingNextPage ? (
              <View className="py-4">
                <ActivityIndicator color={dark ? theme.accent.primary : colors.brand} />
              </View>
            ) : null
          }
        />
      )}

      {/* Create poll (circles / events only) */}
      {canCreatePoll ? (
        <View
          className={dark ? "px-4 pt-2" : "border-t border-hairline px-4 pt-2"}
          style={dark ? { borderTopWidth: 1, borderTopColor: theme.border } : undefined}
        >
          <Text
            onPress={() => pollRef.current?.present()}
            tone="brand-ink"
            weight="medium"
            className="py-1 text-sm"
            accessibilityRole="button"
            style={dark ? { color: theme.accent.primary } : undefined}
          >
            + Create a poll
          </Text>
        </View>
      ) : null}

      {/* Composer — same send logic in both themes; only presentation differs. */}
      {dark ? (
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: theme.border,
            backgroundColor: theme.background.surface,
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 24,
          }}
        >
          {sendError ? (
            <Text className="pb-2 text-xs" style={{ color: theme.status.error }}>
              {sendError}
            </Text>
          ) : null}
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
            <View
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                minHeight: 44,
                borderRadius: radius.full,
                backgroundColor: theme.background.surfaceElevated,
                paddingHorizontal: 14,
              }}
            >
              {/* Image attach — real future work (SendMessageDto supports IMAGE +
                  mediaKey; no upload-and-send is wired yet). Disabled for now. */}
              <Pressable disabled accessibilityLabel="Attach image (coming soon)" style={{ opacity: 0.4 }}>
                <Ionicons name="image-outline" size={22} color={theme.text.tertiary} />
              </Pressable>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Type a message..."
                placeholderTextColor={theme.text.tertiary}
                multiline
                editable={!sending}
                accessibilityLabel="Message"
                style={{
                  flex: 1,
                  maxHeight: 112,
                  paddingVertical: 10,
                  color: theme.text.primary,
                  fontFamily: typography.family.regular,
                  fontSize: typography.size.base,
                }}
              />
            </View>
            <Pressable
              onPress={send}
              disabled={!canSend}
              accessibilityRole="button"
              accessibilityLabel="Send message"
              style={{
                height: 44,
                width: 44,
                borderRadius: 9999,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: canSend ? theme.accent.primary : theme.background.surfaceElevated,
              }}
            >
              {sending ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Ionicons name="send" size={18} color={canSend ? "#FFFFFF" : theme.text.tertiary} />
              )}
            </Pressable>
          </View>
        </View>
      ) : (
        <View className="border-t border-hairline bg-surface px-4 pb-6 pt-3">
          {sendError ? (
            <Text tone="coral-ink" className="pb-2 text-xs">
              {sendError}
            </Text>
          ) : null}
          <View className="flex-row items-end gap-2">
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Message"
              placeholderTextColor={colors.faint}
              multiline
              editable={!sending}
              accessibilityLabel="Message"
              className="max-h-28 min-h-[44px] flex-1 rounded-md border border-hairline-strong bg-page px-3 py-2.5 font-sans text-base text-ink"
            />
            <Pressable
              onPress={send}
              disabled={!canSend}
              accessibilityRole="button"
              accessibilityLabel="Send message"
              className={cn(
                "h-11 w-11 items-center justify-center rounded-pill",
                canSend ? "bg-brand" : "bg-hairline-strong",
              )}
            >
              {sending ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Ionicons name="send" size={18} color="#FFFFFF" />
              )}
            </Pressable>
          </View>
        </View>
      )}

      <FormSheet ref={pollRef} title="Create poll" submitLabel="Create poll" submitting={busy} onSubmit={submitPoll}>
        <Field label="Question" placeholder="What should we decide?" value={pollQuestion} onChangeText={setPollQuestion} />
        <Field
          label="Options"
          placeholder={"One option per line\ne.g. Saturday\nSunday"}
          hint="Add at least two options, one per line."
          multiline
          value={pollOptions}
          onChangeText={setPollOptions}
        />
        <View className="flex-row items-center justify-between">
          <Text className="flex-1 pr-3">Allow multiple choices</Text>
          <Switch value={allowMultiple} onValueChange={setAllowMultiple} trackColor={{ true: colors.brand, false: colors.hairlineStrong }} />
        </View>
      </FormSheet>
    </View>
  );
}

function MessageBubble({
  message,
  mine,
  dark,
  isGroup,
}: {
  message: ChatMessage;
  mine: boolean;
  dark: boolean;
  isGroup: boolean;
}) {
  const theme = useTheme();
  const text = messageText(message);
  const time = clockTime(messageTime(message));
  // Sender avatar only for others' messages in a group/event context.
  const showAvatar = dark && isGroup && !mine;
  const senderAvatar = useResolvedMedia(showAvatar ? message.senderAvatarUrl : undefined).data ?? null;

  // ── Legacy (light) bubble — unchanged. ─────────────────────────────────────
  if (!dark) {
    return (
      <View className={mine ? "items-end" : "items-start"}>
        <Card className={`max-w-[82%] gap-0.5 ${mine ? "bg-brand-tint" : ""}`}>
          {!mine && message.senderName ? (
            <Text weight="medium" tone="brand-ink" className="text-xs">
              {message.senderName}
            </Text>
          ) : null}
          <Text>{text || "(no content)"}</Text>
          <Text tone="faint" className="self-end text-[10px]">
            {time}
          </Text>
        </Card>
      </View>
    );
  }

  // ── Themed (dark) bubble. ──────────────────────────────────────────────────
  const bubbleBase = {
    maxWidth: "82%" as const,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.lg,
  };

  if (mine) {
    return (
      <View style={{ alignItems: "flex-end" }}>
        <View style={{ ...bubbleBase, backgroundColor: theme.accent.primary, borderBottomRightRadius: 4 }}>
          <Text style={{ color: "#FFFFFF", fontFamily: typography.family.regular, fontSize: typography.size.base }}>
            {text || "(no content)"}
          </Text>
          <Text style={{ alignSelf: "flex-end", color: "rgba(255,255,255,0.75)", fontSize: 10, marginTop: 2 }}>{time}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
      {isGroup ? (
        senderAvatar ? (
          <Avatar uri={senderAvatar} name={message.senderName} size="xs" />
        ) : (
          <Avatar name={message.senderName} size="xs" />
        )
      ) : null}
      <View style={{ alignItems: "flex-start", flex: 1 }}>
        {isGroup && message.senderName ? (
          <Text style={{ color: theme.accent.secondary, fontFamily: typography.family.medium, fontSize: typography.size.xs, marginBottom: 2 }}>
            {message.senderName}
          </Text>
        ) : null}
        <View style={{ ...bubbleBase, backgroundColor: theme.background.surfaceElevated, borderBottomLeftRadius: 4 }}>
          <Text style={{ color: theme.text.primary, fontFamily: typography.family.regular, fontSize: typography.size.base }}>
            {text || "(no content)"}
          </Text>
          <Text style={{ alignSelf: "flex-end", color: theme.text.tertiary, fontSize: 10, marginTop: 2 }}>{time}</Text>
        </View>
      </View>
    </View>
  );
}
