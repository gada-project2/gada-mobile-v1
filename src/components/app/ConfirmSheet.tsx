import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { forwardRef, useCallback } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../../theme/tokens";
import { Button, Text } from "../ui";

export interface ConfirmSheetProps {
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
}

/** Generic confirm bottom sheet. Parent presents/dismisses via the ref. */
export const ConfirmSheet = forwardRef<BottomSheetModal, ConfirmSheetProps>(
  function ConfirmSheet({ title, message, confirmLabel, destructive, loading, onConfirm }, ref) {
    const insets = useSafeAreaInsets();
    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
      ),
      [],
    );

    return (
      <BottomSheetModal
        ref={ref}
        enableDynamicSizing
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.hairlineStrong }}
      >
        <BottomSheetView style={{ paddingBottom: insets.bottom + 16 }}>
          <View className="gap-4 px-5 pt-2">
            <Text weight="semibold" className="text-xl">
              {title}
            </Text>
            <Text tone="muted">{message}</Text>
            <Button
              label={confirmLabel}
              loading={loading}
              onPress={onConfirm}
              className={destructive ? "bg-coral active:bg-coral-ink" : undefined}
            />
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);
