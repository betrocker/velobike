import { Pressable, Text, type PressableProps } from "react-native";

type AppButtonVariant = "primary" | "secondary";
type AppButtonSize = "base" | "sm";

type AppButtonProps = PressableProps & {
  className?: string;
  disabled?: boolean;
  size?: AppButtonSize;
  title: string;
  variant?: AppButtonVariant;
};

function getButtonClassName(variant: AppButtonVariant, disabled: boolean) {
  if (disabled) {
    return "bg-ds-disabled";
  }

  if (variant === "secondary") {
    return "border border-ds-border bg-ds-surface active:bg-ds-elevated";
  }

  return "bg-ds-accent active:bg-ds-accent-pressed";
}

function getTextClassName(variant: AppButtonVariant, size: AppButtonSize) {
  const fontClass = variant === "secondary" ? "font-inter-semibold" : "font-inter-bold";
  const sizeClass = size === "sm" ? "text-vb-sm" : "text-vb-base";

  return `${fontClass} ${sizeClass} text-ds-text`;
}

export function AppButton({
  className = "",
  disabled = false,
  size = "base",
  title,
  variant = "primary",
  ...props
}: AppButtonProps) {
  return (
    <Pressable
      {...props}
      className={`h-12 items-center justify-center rounded-ds-input px-4 ${getButtonClassName(
        variant,
        disabled,
      )} ${className}`}
      disabled={disabled}
    >
      <Text className={getTextClassName(variant, size)}>{title}</Text>
    </Pressable>
  );
}
