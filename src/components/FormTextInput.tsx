import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, Text, TextInput, View, type TextInputProps } from "react-native";

import { colors, fonts } from "@/design/tokens";

type LabelVariant = "default" | "meta";
type InputVariant = "card" | "panel" | "flow";

type FormTextInputProps = TextInputProps & {
  focused: boolean;
  inputVariant?: InputVariant;
  isPassword?: boolean;
  label: string;
  labelVariant?: LabelVariant;
  wrapperClassName?: string;
};

function getLabelClassName(labelVariant: LabelVariant) {
  if (labelVariant === "meta") {
    return "font-inter-semibold mb-2 text-vb-xs uppercase text-ds-subtle";
  }

  return "font-inter-semibold mb-2 text-vb-sm text-ds-muted";
}

function getInputClassName(inputVariant: InputVariant) {
  if (inputVariant === "panel") {
    return "font-inter h-12 rounded-ds-input border px-3 py-0 text-vb-base text-ds-text";
  }

  if (inputVariant === "flow") {
    return "font-inter rounded-ds-input border px-3 py-3 text-vb-base text-ds-text";
  }

  return "font-inter h-12 rounded-ds-input border px-3 py-0 text-vb-base text-ds-text";
}

export function FormTextInput({
  focused,
  inputVariant = "card",
  isPassword = false,
  label,
  labelVariant = "default",
  multiline,
  secureTextEntry,
  style,
  textAlignVertical,
  wrapperClassName = "",
  ...props
}: FormTextInputProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const focusClass = focused ? "border-ds-accent bg-ds-field" : "border-ds-border bg-ds-surface";
  const shouldShowPasswordToggle = isPassword && !multiline;

  return (
    <View className={wrapperClassName}>
      <Text className={getLabelClassName(labelVariant)}>{label}</Text>
      <View>
        <TextInput
          {...props}
          className={`${getInputClassName(inputVariant)} ${
            shouldShowPasswordToggle ? "pr-11" : ""
          } ${focusClass}`}
          multiline={multiline}
          placeholderTextColor={colors.subtle}
          secureTextEntry={shouldShowPasswordToggle ? !isPasswordVisible : secureTextEntry}
          selectionColor={colors.accent}
          style={[{ includeFontPadding: false }, style]}
          textAlignVertical={textAlignVertical ?? (multiline ? "top" : "center")}
        />

        {shouldShowPasswordToggle ? (
          <Pressable
            accessibilityRole="button"
            className="absolute right-3 top-0 h-12 items-center justify-center"
            onPress={() => setIsPasswordVisible((currentValue) => !currentValue)}
          >
            <MaterialCommunityIcons
              color={colors.subtle}
              name={isPasswordVisible ? "eye-off-outline" : "eye-outline"}
              size={22}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

type CodeTextInputProps = TextInputProps & {
  focused: boolean;
  label: string;
};

export function CodeTextInput({ focused, label, style, ...props }: CodeTextInputProps) {
  const focusClass = focused ? "border-ds-text bg-ds-field" : "border-ds-border bg-ds-surface";

  return (
    <View>
      <Text className="font-inter-semibold mb-2 text-vb-sm text-ds-muted">{label}</Text>
      <TextInput
        {...props}
        autoCapitalize="characters"
        autoCorrect={false}
        className={`h-14 rounded-ds-input border-2 px-3 py-0 text-center text-vb-xl text-ds-text ${focusClass}`}
        placeholderTextColor={colors.subtle}
        selectionColor={colors.accent}
        style={[{ fontFamily: fonts.mono, includeFontPadding: false }, style]}
        textAlignVertical="center"
      />
    </View>
  );
}
