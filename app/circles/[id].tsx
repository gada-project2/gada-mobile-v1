import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { FlashList } from "@shopify/flash-list";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FormSheet } from "../../src/components/app/FormSheet";
import { ErrorState } from "../../src/components/app/states";
import { Field } from "../../src/components/auth";
import { Button, Card, Pill, Text } from "../../src/components/ui";
import { ApiError } from "../../src/lib/api/client";
import {
  addCircleMember,
  leaveCircle,
  removeCircleMember,
} from "../../src/lib/api/circles";
import type { Circle, CircleMedia, CircleMember } from "../../src/lib/api/types";
import { useAuth } from "../../src/lib/auth/AuthContext";
import { circleKeys } from "../../src/lib/queries/keys";
import { useCircle, useCircleMedia } from "../../src/lib/queries/circles";
import { colors } from "../../src/theme/tokens";

function memberName(m: CircleMember): string {
  return m.displayName ?? m.name ?? m.email ?? m.userId;
}

export default function CircleDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const detail = useCircle(id);
  const media = useCircleMedia(id);

  const addRef = useRef<BottomSheetModal>(null);
  const [newUserId, setNewUserId] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  if (detail.isLoading) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-page">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  // Guard the circle itself, not just the wrapper — the detail response shape
  // can vary, so never assume `circle` is present before this point.
  const circle: Circle | undefined = detail.data?.circle;

  if (detail.isError || !detail.data || !circle?.id) {
    const status = detail.error instanceof ApiError ? detail.error.status : 0;
    const message =
      status === 403
        ? "You don't have access to this circle."
        : status === 404
          ? "This circle couldn't be found."
          : "Couldn't load this circle.";
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-page">
        <Header title="Circle" />
        <View className="flex-1 justify-center">
          <ErrorState message={message} onRetry={() => detail.refetch()} />
        </View>
      </SafeAreaView>
    );
  }

  const members: CircleMember[] = detail.data.members ?? [];
  const myId = user?.id;
  const isOwner = !!myId && (circle.ownerId === myId || circle.convenerId === myId);
  const canManage = isOwner;
  const canInvite = isOwner || !!circle.membersCanInvite;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: circleKeys.detail(id) });

  const submitAdd = async () => {
    const uid = newUserId.trim();
    if (!uid) {
      Alert.alert("User ID needed", "Enter the user ID to add.");
      return;
    }
    setBusy("add");
    try {
      await addCircleMember(id, uid);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setNewUserId("");
      await invalidate();
      addRef.current?.dismiss();
    } catch (e) {
      Alert.alert("Couldn't add member", errMsg(e));
    } finally {
      setBusy(null);
    }
  };

  const confirmRemove = (m: CircleMember) => {
    Alert.alert("Remove member", `Remove ${memberName(m)} from the circle?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await removeCircleMember(id, m.userId);
            await invalidate();
          } catch (e) {
            Alert.alert("Couldn't remove", errMsg(e));
          }
        },
      },
    ]);
  };

  const confirmLeave = () => {
    Alert.alert("Leave circle", `Leave "${circle.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          setBusy("leave");
          try {
            await leaveCircle(id);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            await queryClient.invalidateQueries({ queryKey: circleKeys.list() });
            router.back();
          } catch (e) {
            Alert.alert("Couldn't leave", errMsg(e));
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  };

  const header = (
    <View className="gap-4 pb-2">
      <View className="flex-row items-center gap-3">
        <View className="h-14 w-14 items-center justify-center rounded-pill bg-brand-tint">
          <Ionicons name="people" size={26} color={colors.brandInk} />
        </View>
        <View className="flex-1">
          <Text weight="semibold" className="text-2xl">
            {circle.name}
          </Text>
          <Text tone="muted" className="text-sm">
            {members.length} {members.length === 1 ? "member" : "members"}
          </Text>
        </View>
        {isOwner ? <Pill tone="brand" label="Owner" /> : null}
      </View>

      <Button
        variant="secondary"
        label="Open chat"
        onPress={() =>
          router.push({ pathname: "/chat/[kind]/[id]", params: { kind: "circle", id, title: circle.name } })
        }
      />

      <View className="flex-row items-center justify-between">
        <Text weight="semibold" className="text-lg">
          Members
        </Text>
        {canInvite ? (
          <Pressable onPress={() => addRef.current?.present()} accessibilityRole="button" accessibilityLabel="Add member" hitSlop={8} className="flex-row items-center gap-1">
            <Ionicons name="person-add-outline" size={16} color={colors.brandInk} />
            <Text tone="brand-ink" weight="medium" className="text-sm">
              Add
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  const footer = (
    <View className="gap-3 pt-4">
      <Text weight="semibold" className="text-lg">
        Shared media
      </Text>
      <MediaGrid loading={media.isLoading} error={media.isError} items={media.data ?? []} onRetry={() => media.refetch()} />
      <View className="pt-4">
        <Button variant="secondary" label="Leave circle" loading={busy === "leave"} onPress={confirmLeave} />
      </View>
    </View>
  );

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-page">
      <Header title="Circle" />
      <FlashList
        data={members}
        keyExtractor={(m, i) => m.id ?? m.userId ?? String(i)}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        ItemSeparatorComponent={() => <View className="h-2" />}
        renderItem={({ item }) => (
          <Card className="flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-pill bg-page">
              <Ionicons name="person" size={18} color={colors.muted} />
            </View>
            <View className="flex-1">
              <Text weight="medium" numberOfLines={1}>
                {memberName(item)}
              </Text>
              {item.role ? (
                <Text tone="muted" className="text-sm">
                  {item.role}
                </Text>
              ) : null}
            </View>
            {canManage && item.userId !== circle.ownerId && item.userId !== myId ? (
              <Pressable onPress={() => confirmRemove(item)} hitSlop={8} className="h-9 w-9 items-center justify-center">
                <Ionicons name="close" size={18} color={colors.muted} />
              </Pressable>
            ) : null}
          </Card>
        )}
      />

      <FormSheet ref={addRef} title="Add member" submitLabel="Add member" submitting={busy === "add"} onSubmit={submitAdd}>
        <Field
          label="User ID"
          placeholder="The person's user ID"
          autoCapitalize="none"
          autoCorrect={false}
          value={newUserId}
          onChangeText={setNewUserId}
        />
      </FormSheet>
    </SafeAreaView>
  );
}

function Header({ title }: { title: string }) {
  return (
    <View className="flex-row items-center gap-2 px-3 py-2">
      <Pressable onPress={() => router.back()} hitSlop={8} className="h-11 w-11 items-center justify-center">
        <Ionicons name="chevron-back" size={24} color={colors.ink} />
      </Pressable>
      <Text weight="semibold" className="text-lg">
        {title}
      </Text>
    </View>
  );
}

function MediaGrid({
  loading,
  error,
  items,
  onRetry,
}: {
  loading: boolean;
  error: boolean;
  items: CircleMedia[];
  onRetry: () => void;
}) {
  const { width } = useWindowDimensions();
  const gap = 8;
  const tile = (width - 40 - gap * 2) / 3; // 20px page padding each side

  if (loading) {
    return (
      <View className="py-6">
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }
  if (error) {
    return <ErrorState message="Couldn't load media." onRetry={onRetry} />;
  }
  if (items.length === 0) {
    return (
      <Text tone="faint" className="text-sm">
        No shared media yet.
      </Text>
    );
  }
  return (
    <View className="flex-row flex-wrap" style={{ gap }}>
      {items.map((m, i) => {
        const isUrl = /^https?:\/\//.test(m.mediaKey);
        const isImage = (m.type ?? "").toLowerCase().includes("image");
        return (
          <View key={m.id ?? `${m.mediaKey}-${i}`} style={{ width: tile, height: tile }} className="overflow-hidden rounded-md bg-hairline">
            {isUrl && isImage ? (
              <Image source={m.mediaKey} style={{ width: "100%", height: "100%" }} contentFit="cover" />
            ) : (
              <View className="flex-1 items-center justify-center gap-1 p-1">
                <Ionicons
                  name={isImage ? "image-outline" : (m.type ?? "").includes("video") ? "videocam-outline" : "document-outline"}
                  size={22}
                  color={colors.faint}
                />
                {m.senderName ? (
                  <Text tone="faint" className="text-center text-[10px]" numberOfLines={1}>
                    {m.senderName}
                  </Text>
                ) : null}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

function errMsg(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 403) return "You don't have permission to do that.";
    return e.message;
  }
  return "Please try again.";
}
