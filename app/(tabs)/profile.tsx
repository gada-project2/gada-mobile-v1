import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FormSheet } from "../../src/components/app/FormSheet";
import { Field } from "../../src/components/auth";
import { Button, Card, ImageUpload, Pill, Text } from "../../src/components/ui";
import { updateProfile } from "../../src/lib/api/account";
import { ApiError } from "../../src/lib/api/client";
import { deleteFile } from "../../src/lib/api/storage";
import { useAuth } from "../../src/lib/auth/AuthContext";
import { canConvene } from "../../src/lib/capabilities";
import { CATEGORY_LIST } from "../../src/lib/categories";
import { cn } from "../../src/lib/cn";
import { colors } from "../../src/theme/tokens";

const THEMES = ["light", "dark", "system"] as const;
const LANGUAGES = [{ code: "en", label: "English" }];

function Row({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="min-h-[52px] flex-row items-center gap-3 px-1"
    >
      <Ionicons name={icon} size={20} color={colors.ink} />
      <Text className="flex-1">{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.faint} />
    </Pressable>
  );
}

export default function Profile() {
  const { user, signOut, refreshUser } = useAuth();
  const convener = canConvene(user);

  const editRef = useRef<BottomSheetModal>(null);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({
    displayName: "",
    interests: [] as string[],
    language: "en",
    theme: "system" as string,
  });

  const openEdit = () => {
    setDraft({
      displayName: user?.displayName ?? user?.name ?? "",
      interests: user?.interests ?? [],
      language: user?.language ?? "en",
      theme: user?.theme ?? "system",
    });
    editRef.current?.present();
  };

  // Avatar is managed inline (its own control), persisting immediately and
  // best-effort deleting the replaced/removed R2 object.
  const handleAvatar = async (key: string | null) => {
    const prev = user?.photoKey ?? undefined;
    try {
      await updateProfile({ photoKey: key });
      await refreshUser();
      if (prev && prev !== key && !/^https?:\/\//i.test(prev)) {
        deleteFile(prev).catch((err) =>
          console.warn("Failed to delete old avatar", err instanceof ApiError ? err.status : err),
        );
      }
    } catch (e) {
      Alert.alert("Couldn't update photo", e instanceof ApiError ? e.message : "Please try again.");
    }
  };

  const toggleInterest = (key: string) => {
    Haptics.selectionAsync().catch(() => {});
    setDraft((d) => ({
      ...d,
      interests: d.interests.includes(key)
        ? d.interests.filter((k) => k !== key)
        : [...d.interests, key],
    }));
  };

  const save = async () => {
    if (!draft.displayName.trim()) {
      Alert.alert("Name needed", "Enter a display name.");
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        displayName: draft.displayName.trim(),
        interests: draft.interests,
        language: draft.language,
        theme: draft.theme,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await refreshUser();
      editRef.current?.dismiss();
    } catch (e) {
      Alert.alert("Couldn't save", e instanceof ApiError ? e.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const greeting = user?.displayName ?? user?.name ?? "Profile";

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-page">
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 24 }}>
        {/* Identity */}
        <View className="items-center gap-3 pt-2">
          <ImageUpload
            variant="avatar"
            purpose="avatar"
            label="profile photo"
            value={user?.photoKey ?? null}
            onChange={handleAvatar}
          />
          <View className="items-center gap-0.5">
            <Text weight="semibold" className="text-2xl">
              {greeting}
            </Text>
            <Text tone="muted">{user?.email ?? "Not signed in"}</Text>
          </View>
          {user?.interests && user.interests.length > 0 ? (
            <View className="flex-row flex-wrap justify-center gap-2 pt-1">
              {user.interests.map((i) => (
                <Pill key={i} tone="neutral" label={CATEGORY_LIST.find((c) => c.key === i)?.label ?? i} />
              ))}
            </View>
          ) : null}
          <Button variant="secondary" label="Edit profile" onPress={openEdit} />
        </View>

        {convener ? (
          <Card className="p-2">
            <Row icon="add-circle-outline" label="Host a gadaring" onPress={() => router.push("/create")} />
            <View className="h-px bg-hairline" />
            <Row icon="albums-outline" label="My events" onPress={() => router.push("/manage")} />
          </Card>
        ) : null}

        <Card className="p-2">
          <Row icon="notifications-outline" label="Notifications" onPress={() => router.push("/notifications")} />
          <View className="h-px bg-hairline" />
          <Row icon="people-outline" label="My circles" onPress={() => router.push("/circles")} />
          <View className="h-px bg-hairline" />
          <Row icon="hand-left-outline" label="Volunteering" onPress={() => router.push("/volunteering")} />
          <View className="h-px bg-hairline" />
          <Row icon="shield-checkmark-outline" label="Safety" onPress={() => router.push("/safety")} />
          <View className="h-px bg-hairline" />
          <Row icon="settings-outline" label="Settings" onPress={() => router.push("/settings")} />
        </Card>

        <Button variant="secondary" label="Sign out" onPress={() => signOut()} />
      </ScrollView>

      <FormSheet ref={editRef} title="Edit profile" submitLabel="Save changes" submitting={saving} onSubmit={save}>
        <Field
          label="Display name"
          placeholder="Your name"
          value={draft.displayName}
          onChangeText={(t) => setDraft((d) => ({ ...d, displayName: t }))}
        />
        <View className="gap-2">
          <Text weight="medium" className="text-sm">
            Interests
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {CATEGORY_LIST.map((c) => {
              const on = draft.interests.includes(c.key);
              return (
                <Pressable
                  key={c.key}
                  onPress={() => toggleInterest(c.key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  className={cn(
                    "min-h-[40px] justify-center rounded-pill border px-4",
                    on ? "border-brand bg-brand" : "border-hairline-strong bg-surface",
                  )}
                >
                  <Text weight="medium" tone={on ? "surface" : "ink"} className="text-sm">
                    {c.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="gap-2">
          <Text weight="medium" className="text-sm">
            Theme
          </Text>
          <View className="flex-row gap-2">
            {THEMES.map((t) => {
              const on = draft.theme === t;
              return (
                <Pressable
                  key={t}
                  onPress={() => setDraft((d) => ({ ...d, theme: t }))}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  className={cn(
                    "min-h-[40px] flex-1 items-center justify-center rounded-md border",
                    on ? "border-brand bg-brand-tint" : "border-hairline-strong bg-surface",
                  )}
                >
                  <Text weight="medium" tone={on ? "brand-ink" : "ink"} className="text-sm capitalize">
                    {t}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text tone="faint" className="text-xs">
            Saved to your profile; in-app theming follows in a later pass.
          </Text>
        </View>

        <View className="gap-2">
          <Text weight="medium" className="text-sm">
            Language
          </Text>
          <View className="flex-row gap-2">
            {LANGUAGES.map((l) => {
              const on = draft.language === l.code;
              return (
                <Pressable
                  key={l.code}
                  onPress={() => setDraft((d) => ({ ...d, language: l.code }))}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  className={cn(
                    "min-h-[40px] justify-center rounded-pill border px-4",
                    on ? "border-brand bg-brand" : "border-hairline-strong bg-surface",
                  )}
                >
                  <Text weight="medium" tone={on ? "surface" : "ink"} className="text-sm">
                    {l.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </FormSheet>
    </SafeAreaView>
  );
}
