import type { ReactNode } from "react";
import { View, type ViewProps } from "react-native";
import {
  SafeAreaView,
  type Edge,
} from "react-native-safe-area-context";

import { cn } from "../../lib/cn";

export interface ScreenProps extends ViewProps {
  children: ReactNode;
  /** Apply horizontal page padding (default true). */
  padded?: boolean;
  /** Safe-area edges to inset (default top + bottom; tabs supply their own bottom). */
  edges?: readonly Edge[];
  className?: string;
}

/** Page wrapper: safe-area inset + page background. */
export function Screen({
  children,
  padded = true,
  edges = ["top", "bottom", "left", "right"],
  className,
  ...props
}: ScreenProps) {
  return (
    <SafeAreaView edges={edges} className="flex-1 bg-page">
      <View className={cn("flex-1", padded && "px-5", className)} {...props}>
        {children}
      </View>
    </SafeAreaView>
  );
}
