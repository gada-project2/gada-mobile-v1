import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";

import type { StoragePurpose } from "../../lib/api/storage";
import { useResolvedMedia } from "../../lib/queries/storage";
import { uploadImageToR2, validateImage, type PickedImage } from "../../lib/storage/upload";
import { colors } from "../../theme/tokens";
import { Text } from "./Text";

export interface ImageUploadProps {
  /** Current stored key or URL. */
  value?: string | null;
  variant: "avatar" | "banner";
  purpose: StoragePurpose;
  /** Fires with the new key after a successful upload, or null when removed. */
  onChange: (key: string | null) => void;
  disabled?: boolean;
  label?: string;
}

/**
 * Pick (library/camera) -> validate -> upload device→R2 via presigned PUT ->
 * onChange(key). The parent persists the key and best-effort deletes the old one.
 */
export function ImageUpload({ value, variant, purpose, onChange, disabled, label }: ImageUploadProps) {
  const reduced = useReducedMotion();
  const resolved = useResolvedMedia(value);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const busy = disabled || uploading;
  const isAvatar = variant === "avatar";

  const launch = async (source: "camera" | "library") => {
    try {
      const perm =
        source === "camera"
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          source === "camera" ? "Camera permission needed" : "Photo access needed",
          "Allow access in Settings to add a photo.",
        );
        return;
      }
      const opts: ImagePicker.ImagePickerOptions = {
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
        aspect: isAvatar ? [1, 1] : [16, 9],
      };
      const res =
        source === "camera"
          ? await ImagePicker.launchCameraAsync(opts)
          : await ImagePicker.launchImageLibraryAsync(opts);
      if (res.canceled || !res.assets?.[0]) return;

      const a = res.assets[0];
      const img: PickedImage = {
        uri: a.uri,
        mimeType: a.mimeType ?? "image/jpeg",
        fileName: a.fileName ?? `${purpose}-${Date.now()}.jpg`,
        fileSize: a.fileSize,
      };
      const verr = validateImage(img);
      if (verr) {
        setError(verr);
        return;
      }
      setError(null);
      setUploading(true);
      const key = await uploadImageToR2(img, purpose);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onChange(key);
    } catch {
      setError("Couldn't upload that image. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setUploading(false);
    }
  };

  const choose = () => {
    if (busy) return;
    Haptics.selectionAsync().catch(() => {});
    Alert.alert(label ?? "Add photo", undefined, [
      { text: "Take photo", onPress: () => void launch("camera") },
      { text: "Choose from library", onPress: () => void launch("library") },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const remove = () => {
    if (busy) return;
    Haptics.selectionAsync().catch(() => {});
    onChange(null);
  };

  const uri = resolved.data ?? undefined;
  const transition = reduced ? 0 : 200;

  const dims = isAvatar
    ? { width: 104, height: 104, borderRadius: 52 }
    : { width: "100%" as const, aspectRatio: 16 / 9, borderRadius: 12 };

  return (
    <View className={isAvatar ? "items-center gap-2" : "gap-2"}>
      {label && !isAvatar ? (
        <Text weight="medium" className="text-sm">
          {label}
        </Text>
      ) : null}

      <View style={isAvatar ? undefined : { width: "100%" }}>
        <Pressable
          onPress={choose}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={value ? `Change ${label ?? "photo"}` : `Add ${label ?? "photo"}`}
          style={[
            dims,
            {
              overflow: "hidden",
              backgroundColor: colors.hairline,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: uri ? 0 : 1,
              borderColor: colors.hairlineStrong,
              borderStyle: "dashed",
              opacity: busy ? 0.7 : 1,
            },
          ]}
        >
          {uri ? (
            <Image source={uri} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={transition} />
          ) : (
            <View className="items-center gap-1">
              <Ionicons name={isAvatar ? "person-outline" : "image-outline"} size={isAvatar ? 30 : 28} color={colors.faint} />
              <Text tone="faint" className="text-xs">
                {isAvatar ? "Add photo" : "Add a banner"}
              </Text>
            </View>
          )}

          {uploading ? (
            <View className="absolute inset-0 items-center justify-center bg-black/35">
              <ActivityIndicator color="#FFFFFF" />
              <Text tone="surface" className="mt-1 text-xs">
                Uploading…
              </Text>
            </View>
          ) : null}
        </Pressable>

        {/* Edit + remove controls */}
        {!uploading ? (
          <View
            className={isAvatar ? "absolute -bottom-1 -right-1 flex-row gap-1" : "absolute right-2 top-2 flex-row gap-2"}
          >
            <Pressable
              onPress={choose}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={value ? "Change photo" : "Add photo"}
              hitSlop={10}
              className="h-9 w-9 items-center justify-center rounded-pill bg-brand"
              style={{ borderWidth: 2, borderColor: "#FFFFFF" }}
            >
              <Ionicons name={value ? "pencil" : "add"} size={16} color="#FFFFFF" />
            </Pressable>
            {value ? (
              <Pressable
                onPress={remove}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${label ?? "photo"}`}
                hitSlop={10}
                className="h-9 w-9 items-center justify-center rounded-pill bg-ink"
                style={{ borderWidth: 2, borderColor: "#FFFFFF" }}
              >
                <Ionicons name="trash-outline" size={15} color="#FFFFFF" />
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>

      {error ? <Text className="text-sm text-interested">{error}</Text> : null}
    </View>
  );
}
