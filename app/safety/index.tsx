import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ConfirmSheet } from "../../src/components/app/ConfirmSheet";
import { FormSheet } from "../../src/components/app/FormSheet";
import { ErrorState } from "../../src/components/app/states";
import { Field } from "../../src/components/auth";
import { Button, Card, Pill, Text } from "../../src/components/ui";
import { ApiError } from "../../src/lib/api/client";
import { createIceContact, deleteIceContact } from "../../src/lib/api/ice-contacts";
import { respondFindMe, sendFindMe } from "../../src/lib/api/map-safety";
import type { FindMeAction, FindMeRequest, IceContact } from "../../src/lib/api/types";
import { safetyKeys } from "../../src/lib/queries/keys";
import { useIceContacts, useIncomingFindMe } from "../../src/lib/queries/safety";
import { useSafety } from "../../src/lib/safety/SafetyContext";
import { colors } from "../../src/theme/tokens";

export default function Safety() {
  const queryClient = useQueryClient();
  const { isSharing, startSharing, stopSharing } = useSafety();
  const incoming = useIncomingFindMe();
  const contacts = useIceContacts();

  const findMeRef = useRef<BottomSheetModal>(null);
  const contactRef = useRef<BottomSheetModal>(null);
  const deleteRef = useRef<BottomSheetModal>(null);

  const [busy, setBusy] = useState<string | null>(null);
  const [findMe, setFindMe] = useState({ receiverId: "", gadaringId: "" });
  const [contactDraft, setContactDraft] = useState({ name: "", phoneNumber: "", email: "" });
  const pendingDelete = useRef<IceContact | null>(null);

  const toggleSharing = async () => {
    setBusy("share");
    try {
      if (isSharing) await stopSharing();
      else await startSharing();
    } finally {
      setBusy(null);
    }
  };

  const respond = async (req: FindMeRequest, action: FindMeAction) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      await respondFindMe(req.id, action);
      await queryClient.invalidateQueries({ queryKey: safetyKeys.findMeIncoming() });
    } catch (e) {
      Alert.alert("Couldn't respond", e instanceof ApiError ? e.message : "Please try again.");
    }
  };

  const submitFindMe = async () => {
    if (!findMe.receiverId.trim()) {
      Alert.alert("Recipient needed", "Enter the user ID of the ICE contact to find.");
      return;
    }
    setBusy("findme");
    try {
      await sendFindMe({
        receiverId: findMe.receiverId.trim(),
        gadaringId: findMe.gadaringId.trim() || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setFindMe({ receiverId: "", gadaringId: "" });
      findMeRef.current?.dismiss();
      Alert.alert("Find Me sent", "They'll get a notification to share their location back.");
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.status === 409
            ? "You already have a pending Find Me request."
            : e.message
          : "Please try again.";
      Alert.alert("Couldn't send", msg);
    } finally {
      setBusy(null);
    }
  };

  const submitContact = async () => {
    if (!contactDraft.name.trim() || !contactDraft.phoneNumber.trim()) {
      Alert.alert("Name and phone needed", "Add a name and phone number for the contact.");
      return;
    }
    setBusy("contact");
    try {
      await createIceContact({
        name: contactDraft.name.trim(),
        phoneNumber: contactDraft.phoneNumber.trim(),
        email: contactDraft.email.trim() || undefined,
      });
      setContactDraft({ name: "", phoneNumber: "", email: "" });
      await queryClient.invalidateQueries({ queryKey: safetyKeys.iceContacts() });
      contactRef.current?.dismiss();
    } catch (e) {
      Alert.alert("Couldn't add contact", e instanceof ApiError ? e.message : "Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const confirmDeleteContact = (c: IceContact) => {
    pendingDelete.current = c;
    deleteRef.current?.present();
  };
  const doDeleteContact = async () => {
    const c = pendingDelete.current;
    if (!c) return;
    setBusy("delete");
    try {
      await deleteIceContact(c.id);
      await queryClient.invalidateQueries({ queryKey: safetyKeys.iceContacts() });
      deleteRef.current?.dismiss();
    } catch (e) {
      Alert.alert("Couldn't remove", e instanceof ApiError ? e.message : "Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const requests = incoming.data ?? [];
  const contactList = contacts.data ?? [];

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-page">
      <View className="flex-row items-center gap-2 px-3 py-2">
        <Pressable onPress={() => router.back()} hitSlop={8} className="h-11 w-11 items-center justify-center">
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Text weight="semibold" className="text-lg">
          Safety
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 20 }}>
        {/* Live location sharing */}
        <Card className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text weight="semibold" className="text-lg">
              Live location
            </Text>
            {isSharing ? <Pill tone="coral" label="Sharing" /> : null}
          </View>
          <Text tone="muted" className="text-sm">
            Share your live location with your ICE contacts. Only people you&apos;ve added as ICE
            contacts can see it, and only while sharing is on. Nothing is shared until you turn it on.
          </Text>
          <Button
            label={isSharing ? "Stop sharing" : "Start sharing my location"}
            variant={isSharing ? "secondary" : "primary"}
            loading={busy === "share"}
            onPress={toggleSharing}
          />
        </Card>

        {/* Find Me */}
        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text weight="semibold" className="text-lg">
              Find Me
            </Text>
            <Pressable onPress={() => findMeRef.current?.present()} accessibilityRole="button" accessibilityLabel="Send a Find Me request" hitSlop={8} className="flex-row items-center gap-1">
              <Ionicons name="navigate-outline" size={16} color={colors.brandInk} />
              <Text tone="brand-ink" weight="medium" className="text-sm">
                Send
              </Text>
            </Pressable>
          </View>

          <Text tone="muted" className="text-sm">
            Incoming requests
          </Text>
          {incoming.isLoading ? (
            <ActivityIndicator color={colors.brand} />
          ) : incoming.isError ? (
            <ErrorState message="Couldn't load requests." onRetry={() => incoming.refetch()} />
          ) : requests.length === 0 ? (
            <Text tone="faint" className="text-sm">
              No pending Find Me requests.
            </Text>
          ) : (
            requests.map((req) => (
              <Card key={req.id} className="gap-2">
                <Text weight="medium">
                  {req.sender?.displayName ?? req.sender?.name ?? "Someone"} wants to find you
                </Text>
                {req.gadaring?.name ? (
                  <Text tone="muted" className="text-sm">
                    At {req.gadaring.name}
                  </Text>
                ) : null}
                <View className="flex-row gap-3 pt-1">
                  <View className="flex-1">
                    <Button label="Accept" onPress={() => respond(req, "accept")} />
                  </View>
                  <View className="flex-1">
                    <Button variant="secondary" label="Reject" onPress={() => respond(req, "reject")} />
                  </View>
                </View>
                {req.senderId ? (
                  <Pressable onPress={() => router.push({ pathname: "/safety/location/[userId]", params: { userId: req.senderId as string } })} accessibilityRole="button" className="pt-1">
                    <Text tone="brand-ink" weight="medium" className="text-sm">
                      View their location on map
                    </Text>
                  </Pressable>
                ) : null}
              </Card>
            ))
          )}
        </View>

        {/* ICE contacts */}
        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text weight="semibold" className="text-lg">
              ICE contacts
            </Text>
            <Pressable onPress={() => contactRef.current?.present()} accessibilityRole="button" accessibilityLabel="Add ICE contact" hitSlop={8} className="flex-row items-center gap-1">
              <Ionicons name="person-add-outline" size={16} color={colors.brandInk} />
              <Text tone="brand-ink" weight="medium" className="text-sm">
                Add
              </Text>
            </Pressable>
          </View>
          {contacts.isLoading ? (
            <ActivityIndicator color={colors.brand} />
          ) : contactList.length === 0 ? (
            <Text tone="faint" className="text-sm">
              No ICE contacts yet. Add the people who should see your location in an emergency.
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
                <Pressable onPress={() => confirmDeleteContact(c)} hitSlop={8} className="h-9 w-9 items-center justify-center">
                  <Ionicons name="trash-outline" size={18} color={colors.muted} />
                </Pressable>
              </Card>
            ))
          )}
        </View>
      </ScrollView>

      <FormSheet ref={findMeRef} title="Send a Find Me" submitLabel="Send request" submitting={busy === "findme"} onSubmit={submitFindMe}>
        <Text tone="muted" className="text-sm">
          The recipient must be one of your ICE contacts. They&apos;ll get a notification to share their
          location back with you.
        </Text>
        <Field label="Recipient user ID" placeholder="Their user ID" autoCapitalize="none" value={findMe.receiverId} onChangeText={(t) => setFindMe((d) => ({ ...d, receiverId: t }))} />
        <Field label="Event context (optional)" placeholder="Gadaring ID" autoCapitalize="none" value={findMe.gadaringId} onChangeText={(t) => setFindMe((d) => ({ ...d, gadaringId: t }))} />
      </FormSheet>

      <FormSheet ref={contactRef} title="Add ICE contact" submitLabel="Add contact" submitting={busy === "contact"} onSubmit={submitContact}>
        <Field label="Name" placeholder="e.g. Mama Chinedu" value={contactDraft.name} onChangeText={(t) => setContactDraft((d) => ({ ...d, name: t }))} />
        <Field label="Phone number" placeholder="+234…" keyboardType="phone-pad" value={contactDraft.phoneNumber} onChangeText={(t) => setContactDraft((d) => ({ ...d, phoneNumber: t }))} />
        <Field label="Email (optional)" placeholder="name@example.com" keyboardType="email-address" autoCapitalize="none" value={contactDraft.email} onChangeText={(t) => setContactDraft((d) => ({ ...d, email: t }))} />
      </FormSheet>

      <ConfirmSheet
        ref={deleteRef}
        title="Remove contact?"
        message="They'll no longer be able to see your shared location."
        confirmLabel="Remove"
        destructive
        loading={busy === "delete"}
        onConfirm={doDeleteContact}
      />
    </SafeAreaView>
  );
}
