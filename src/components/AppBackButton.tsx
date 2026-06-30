import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, type PressableProps } from "react-native";

import { colors } from "@/design/tokens";

type AppBackButtonProps = PressableProps & {
  className?: string;
};

export function AppBackButton({ className = "", ...props }: AppBackButtonProps) {
  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      className={`h-9 w-9 items-center justify-center rounded-ds-pill bg-ds-surface active:bg-ds-elevated ${className}`}
    >
      <MaterialCommunityIcons color={colors.accent} name="chevron-left" size={24} />
    </Pressable>
  );
}
