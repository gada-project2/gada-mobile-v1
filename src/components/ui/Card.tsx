import type { ReactNode } from "react";
import { View, type ViewProps } from "react-native";

import { cn } from "../../lib/cn";

export interface CardProps extends ViewProps {
  children: ReactNode;
  className?: string;
}

/** Surface container: white, soft radius, hairline border. */
export function Card({ children, className, ...props }: CardProps) {
  return (
    <View
      className={cn(
        "rounded-lg border border-hairline bg-surface p-4",
        className,
      )}
      {...props}
    >
      {children}
    </View>
  );
}
