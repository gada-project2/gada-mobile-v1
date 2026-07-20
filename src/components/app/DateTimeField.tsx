import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Modal, Platform, Pressable, View } from "react-native";

import { formatEventDate, formatEventDay } from "../../lib/dates";
import { colors } from "../../theme/tokens";
import { Button, Text } from "../ui";

export interface DateTimeFieldProps {
  label: string;
  value: Date | null;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  /** "datetime" (default) picks date + time; "date" picks a date only (e.g. DOB). */
  mode?: "date" | "datetime";
}

/** Native date/time picker. Android uses the imperative dialogs; iOS shows an inline spinner in a sheet. */
export function DateTimeField({
  label,
  value,
  onChange,
  minimumDate,
  maximumDate,
  mode = "datetime",
}: DateTimeFieldProps) {
  const [iosOpen, setIosOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(value ?? new Date());
  const dateOnly = mode === "date";

  const openAndroid = () => {
    const base = value ?? new Date();
    DateTimePickerAndroid.open({
      value: base,
      mode: "date",
      minimumDate,
      maximumDate,
      onChange: (e, date) => {
        if (e.type !== "set" || !date) return;
        if (dateOnly) {
          onChange(date);
          return;
        }
        DateTimePickerAndroid.open({
          value: date,
          mode: "time",
          is24Hour: false,
          onChange: (e2, time) => {
            if (e2.type !== "set" || !time) return;
            const combined = new Date(date);
            combined.setHours(time.getHours(), time.getMinutes(), 0, 0);
            onChange(combined);
          },
        });
      },
    });
  };

  const open = () => {
    if (Platform.OS === "android") {
      openAndroid();
    } else {
      setDraft(value ?? new Date());
      setIosOpen(true);
    }
  };

  return (
    <View className="gap-1.5">
      <Text weight="medium" className="text-sm">
        {label}
      </Text>
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={label}
        className="min-h-[48px] flex-row items-center justify-between rounded-md border border-hairline-strong bg-surface px-4"
      >
        <Text tone={value ? "ink" : "faint"}>
          {value
            ? (dateOnly ? formatEventDay : formatEventDate)(value.toISOString())
            : dateOnly
              ? "Select date"
              : "Select date & time"}
        </Text>
        <Ionicons name="calendar-outline" size={18} color={colors.muted} />
      </Pressable>

      {Platform.OS === "ios" && iosOpen ? (
        <Modal transparent animationType="slide" visible onRequestClose={() => setIosOpen(false)}>
          <View className="flex-1 justify-end bg-black/40">
            <View className="gap-3 rounded-t-lg bg-surface p-4">
              <DateTimePicker
                value={draft}
                mode={dateOnly ? "date" : "datetime"}
                display="spinner"
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                onChange={(_, d) => d && setDraft(d)}
              />
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Button variant="secondary" label="Cancel" haptic={false} onPress={() => setIosOpen(false)} />
                </View>
                <View className="flex-1">
                  <Button
                    label="Done"
                    onPress={() => {
                      onChange(draft);
                      setIosOpen(false);
                    }}
                  />
                </View>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}
