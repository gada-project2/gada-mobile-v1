import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { forwardRef, useCallback, type ReactNode } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../../theme/tokens";
import { Button, Text } from "../ui";

export interface FormSheetProps {
  title: string;
  submitLabel: string;
  submitting?: boolean;
  onSubmit: () => void;
  children: ReactNode;
}

/** Bottom-sheet chrome for a short form (title + scroll body + submit). */
export const FormSheet = forwardRef<BottomSheetModal, FormSheetProps>(
  function FormSheet({ title, submitLabel, submitting, onSubmit, children }, ref) {
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
        snapPoints={["90%"]}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.hairlineStrong }}
      >
        <BottomSheetScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24, gap: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text weight="semibold" className="text-xl">
            {title}
          </Text>
          {children}
          <Button label={submitLabel} loading={submitting} onPress={onSubmit} />
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);
