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
import { colors } from "../../theme/tokens";
import { Field } from "../auth";
import { Card, Text } from "../ui";
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

  return (
    <View className="flex-1">
      {messages.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : messages.isError ? (
        <View className="flex-1 justify-center">
          <ErrorState message="Couldn't load chat." onRetry={() => messages.refetch()} />
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
              <PollCard poll={item.poll} />
            ) : (
              <MessageBubble message={item} mine={messageSenderId(item) === user?.id} />
            )
          }
          ListEmptyComponent={
            <EmptyState title="No messages yet" message="Chat history will appear here." />
          }
          ListFooterComponent={
            messages.isFetchingNextPage ? (
              <View className="py-4">
                <ActivityIndicator color={colors.brand} />
              </View>
            ) : null
          }
        />
      )}

      {/* Create poll (circles / events only) */}
      {canCreatePoll ? (
        <View className="border-t border-hairline px-4 pt-2">
          <Text
            onPress={() => pollRef.current?.present()}
            tone="brand-ink"
            weight="medium"
            className="py-1 text-sm"
            accessibilityRole="button"
          >
            + Create a poll
          </Text>
        </View>
      ) : null}

      {/* Composer */}
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
            disabled={!draft.trim() || sending}
            accessibilityRole="button"
            accessibilityLabel="Send message"
            className={cn(
              "h-11 w-11 items-center justify-center rounded-pill",
              draft.trim() && !sending ? "bg-brand" : "bg-hairline-strong",
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

function MessageBubble({ message, mine }: { message: ChatMessage; mine: boolean }) {
  const text = messageText(message);
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
          {clockTime(messageTime(message))}
        </Text>
      </Card>
    </View>
  );
}
