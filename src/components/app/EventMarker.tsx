import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";

import { colors } from "../../theme/tokens";

type IoniconName = keyof typeof Ionicons.glyphMap;

/**
 * A flat brand/coral map pin. Coral signals a live event (CLAUDE.md brand rule:
 * coral = happening now), brand otherwise. Inline styles only — markers render
 * in a separate native layer where NativeWind classes aren't reliable.
 */
export function EventMarker({
  live,
  icon = "location",
  selected,
}: {
  live?: boolean;
  icon?: IoniconName;
  selected?: boolean;
}) {
  const color = live ? colors.coral : colors.brand;
  const size = selected ? 40 : 32;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 2,
        borderColor: "#FFFFFF",
        shadowColor: "#000",
        shadowOpacity: 0.25,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 1 },
        elevation: 4,
      }}
    >
      <Ionicons name={icon} size={selected ? 22 : 18} color="#FFFFFF" />
    </View>
  );
}
