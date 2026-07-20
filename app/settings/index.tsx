import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Switch, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FormSheet } from "../../src/components/app/FormSheet";
import { Field } from "../../src/components/auth";
import { Button, Card, Pill, Text } from "../../src/components/ui";
import { deleteAccount, updatePrivacy, upsertVolunteerProfile } from "../../src/lib/api/account";
import { ApiError } from "../../src/lib/api/client";
import { createIceContact, deleteIceContact } from "../../src/lib/api/ice-contacts";
import type { IceContact, PrivacySettings } from "../../src/lib/api/types";
import { useAuth } from "../../src/lib/auth/AuthContext";
import { accountKeys, safetyKeys } from "../../src/lib/queries/keys";
import { usePrivacy, useVolunteerProfile } from "../../src/lib/queries/account";
import { useIceContacts } from "../../src/lib/queries/safety";
import { colors } from "../../src/theme/tokens";

const MAX_ICE = 3;

export default function Settings() {
  const queryClient = useQueryClient();
  const { signOut } = useAuth();

  const contacts = useIceContacts();
  const volunteer = useVolunteerProfile();
  const privacy = usePrivacy();

  const contactRef = useRef<BottomSheetModal>(null);
  const deleteRef = useRef<BottomSheetModal>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [contactDraft, setContactDraft] = useState({ name: "", phoneNumber: "", email: "" });

  // Volunteer profile draft (seeded once loaded).
  const [vol, setVol] = useState({ skills: "", availability: "", bio: "" });
  const [volSeeded, setVolSeeded] = useState(false);
  useEffect(() => {
    if (!volSeeded && volunteer.data !== undefined) {
      const v = volunteer.data;
      setVol({
        skills: (v?.skills ?? []).join(", "),
        availability: v?.availability ?? "",
        bio: v?.bio ?? "",
      });
      setVolSeeded(true);
    }
  }, [volunteer.data, volSeeded]);

  // Privacy toggles — optimistic.
  const privacyMut = useMutation({
    mutationFn: (patch: PrivacySettings) => updatePrivacy(patch),
    onMutate: async (patch) => {
      Haptics.selectionAsync().catch(() => {});
      await queryClient.cancelQueries({ queryKey: accountKeys.privacy() });
      const prev = queryClient.getQueryData<PrivacySettings>(accountKeys.privacy());
      queryClient.setQueryData<PrivacySettings>(accountKeys.privacy(), { ...prev, ...patch });
      return { prev };
    },
    onError: (err, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(accountKeys.privacy(), ctx.prev);
      Alert.alert("Couldn't update", err instanceof ApiError ? err.message : "Please try again.");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: accountKeys.privacy() }),
  });

  const contactList = contacts.data ?? [];
  const atMax = contactList.length >= MAX_ICE;

  const submitContact = async () => {
    if (!contactDraft.name.trim() || !contactDraft.phoneNumber.trim()) {
      Alert.alert("Name and phone needed", "Add a name and phone number.");
      return;
    }
    setBusy("contact");
    try {
      await createIceContact({
        name: contactDraft.name.trim(),
        phoneNumber: contactDraft.phoneNumber.trim(),
        email: contactDraft.email.trim() || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setContactDraft({ name: "", phoneNumber: "", email: "" });
      await queryClient.invalidateQueries({ queryKey: safetyKeys.iceContacts() });
      contactRef.current?.dismiss();
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.status === 409
            ? "You can have at most 3 ICE contacts."
            : e.message
          : "Please try again.";
      Alert.alert("Couldn't add contact", msg);
    } finally {
      setBusy(null);
    }
  };

  const removeContact = (c: IceContact) => {
    Alert.alert("Remove contact", `Remove ${c.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteIceContact(c.id);
            await queryClient.invalidateQueries({ queryKey: safetyKeys.iceContacts() });
          } catch (e) {
            Alert.alert("Couldn't remove", e instanceof ApiError ? e.message : "Please try again.");
          }
        },
      },
    ]);
  };

  const saveVolunteer = async () => {
    setBusy("vol");
    try {
      await upsertVolunteerProfile({
        skills: vol.skills ? vol.skills.split(",").map((s) => s.trim()).filter(Boolean) : [],
        availability: vol.availability.trim() || undefined,
        bio: vol.bio.trim() || undefined,
        marketingConsent: volunteer.data?.marketingConsent,
        functionalConsent: volunteer.data?.functionalConsent,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await queryClient.invalidateQueries({ queryKey: accountKeys.volunteerProfile() });
      Alert.alert("Saved", "Your volunteer profile was updated.");
    } catch (e) {
      Alert.alert("Couldn't save", e instanceof ApiError ? e.message : "Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const doDelete = async () => {
    setBusy("delete");
    try {
      await deleteAccount();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      deleteRef.current?.dismiss();
      // signOut clears secure-store (revoke is best-effort) and flips to guest;
      // the root navigator then redirects to (auth).
      await signOut();
    } catch (e) {
      Alert.alert("Couldn't delete account", e instanceof ApiError ? e.message : "Please try again.");
      setBusy(null);
    }
  };

  const priv = privacy.data ?? {};

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-page">
      <View className="flex-row items-center gap-2 px-3 py-2">
        <Pressable onPress={() => router.back()} hitSlop={8} className="h-11 w-11 items-center justify-center">
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Text weight="semibold" className="text-lg">
          Settings
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48, gap: 24 }}>
        {/* ICE contacts */}
        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text weight="semibold" className="text-lg">
              ICE contacts
            </Text>
            <Pill tone="neutral" label={`${contactList.length}/${MAX_ICE}`} />
          </View>
          <Text tone="muted" className="text-sm">
            In Case of Emergency contacts can see your shared live location. Up to 3.
          </Text>
          {contacts.isLoading ? (
            <ActivityIndicator color={colors.brand} />
          ) : contactList.length === 0 ? (
            <Text tone="faint" className="text-sm">
              No ICE contacts yet.
            </Text>
          ) : (
            contactList.map((c) => (
              <Card key={c.id} className="flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-pill bg-page">
                  <Ionicons name="person" size={18} color={colors.muted} />
                </View>
                <View className="flex-1">
                  <Text weight="medium" numberOfLines={1}>
                    {c.name}
                  </Text>
                  {c.phoneNumber ? (
                    <Text tone="muted" className="text-sm">
                      {c.phoneNumber}
                    </Text>
                  ) : null}
                </View>
                <Pressable onPress={() => removeContact(c)} hitSlop={8} className="h-9 w-9 items-center justify-center">
                  <Ionicons name="trash-outline" size={18} color={colors.muted} />
                </Pressable>
              </Card>
            ))
          )}
          <Button
            variant="secondary"
            label={atMax ? "Maximum of 3 contacts" : "Add ICE contact"}
            disabled={atMax}
            onPress={() => contactRef.current?.present()}
          />
        </View>

        {/* Volunteer profile */}
        <View className="gap-3">
          <Text weight="semibold" className="text-lg">
            Volunteer profile
          </Text>
          {volunteer.isLoading ? (
            <ActivityIndicator color={colors.brand} />
          ) : (
            <>
              <Field label="Skills" placeholder="Comma separated" value={vol.skills} onChangeText={(t) => setVol((d) => ({ ...d, skills: t }))} />
              <Field label="Availability" placeholder="e.g. Weekends, evenings" value={vol.availability} onChangeText={(t) => setVol((d) => ({ ...d, availability: t }))} />
              <Field label="Bio" placeholder="A short intro for conveners" multiline value={vol.bio} onChangeText={(t) => setVol((d) => ({ ...d, bio: t }))} />
              <Button label="Save volunteer profile" loading={busy === "vol"} onPress={saveVolunteer} />
            </>
          )}
        </View>

        {/* Privacy */}
        <View className="gap-3">
          <Text weight="semibold" className="text-lg">
            Privacy
          </Text>
          <Text tone="muted" className="text-sm">
            Transactional messages (tickets, security, account) always send. These control marketing and
            analytics only.
          </Text>
          {privacy.isLoading ? (
            <ActivityIndicator color={colors.brand} />
          ) : (
            <>
              <ToggleRow
                label="Marketing messages"
                value={!!priv.marketingConsent}
                onChange={(v) => privacyMut.mutate({ marketingConsent: v })}
              />
              <ToggleRow
                label="Functional analytics"
                value={!!priv.functionalConsent}
                onChange={(v) => privacyMut.mutate({ functionalConsent: v })}
              />
            </>
          )}
        </View>

        {/* Danger zone */}
        <View className="gap-3">
          <Text weight="semibold" className="text-lg" style={{ color: colors.interested }}>
            Danger zone
          </Text>
          <Card className="gap-3">
            <Text tone="muted" className="text-sm">
              Deleting your account is permanent. It removes your personal data and can&apos;t be undone.
            </Text>
            <Button variant="secondary" label="Delete account" onPress={() => deleteRef.current?.present()} />
          </Card>
        </View>
      </ScrollView>

      {/* Add ICE contact */}
      <FormSheet ref={contactRef} title="Add ICE contact" submitLabel="Add contact" submitting={busy === "contact"} onSubmit={submitContact}>
        <Field label="Name" placeholder="e.g. Mama Chinedu" value={contactDraft.name} onChangeText={(t) => setContactDraft((d) => ({ ...d, name: t }))} />
        <Field label="Phone number" placeholder="+234…" keyboardType="phone-pad" value={contactDraft.phoneNumber} onChangeText={(t) => setContactDraft((d) => ({ ...d, phoneNumber: t }))} />
        <Field label="Email (optional)" placeholder="name@example.com" keyboardType="email-address" autoCapitalize="none" value={contactDraft.email} onChangeText={(t) => setContactDraft((d) => ({ ...d, email: t }))} />
      </FormSheet>

      {/* Delete account — typed confirmation */}
      <DeleteAccountSheet sheetRef={deleteRef} loading={busy === "delete"} onConfirm={doDelete} />
    </SafeAreaView>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="flex-1 pr-3">{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.brand, false: colors.hairlineStrong }} />
    </View>
  );
}

function DeleteAccountSheet({
  sheetRef,
  loading,
  onConfirm,
}: {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  loading: boolean;
  onConfirm: () => void;
}) {
  const [text, setText] = useState("");
  const confirmed = text.trim().toUpperCase() === "DELETE";
  return (
    <FormSheet
      ref={sheetRef}
      title="Delete account"
      submitLabel={confirmed ? "Permanently delete" : "Type DELETE to confirm"}
      submitting={loading}
      onSubmit={() => {
        if (confirmed) onConfirm();
      }}
    >
      <Text tone="muted" className="text-sm">
        This permanently deletes your account and wipes your personal data. This cannot be undone. Type
        DELETE below to confirm.
      </Text>
      <Field label="Confirmation" placeholder="DELETE" autoCapitalize="characters" autoCorrect={false} value={text} onChangeText={setText} />
    </FormSheet>
  );
}
