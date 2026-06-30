import { useRef, type ReactNode } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppBackButton } from "@/components/AppBackButton";
import { colors } from "@/design/tokens";

type AdminScreenShellProps = {
  children: ReactNode;
  compactHeader?: boolean;
  isLoading?: boolean;
  keyboardAvoiding?: boolean;
  onBack?: () => void;
  title: string;
};

function AdminScreenContent({
  children,
  compactHeader = true,
  isLoading = false,
  onBack,
  title,
}: Omit<AdminScreenShellProps, "keyboardAvoiding">) {
  const scrollY = useRef(new Animated.Value(0)).current;
  const hasTopControls = Boolean(onBack);
  const compactHeaderOpacity = scrollY.interpolate({
    inputRange: [28, 72],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const largeTitleOpacity = scrollY.interpolate({
    inputRange: [0, 72],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });
  const largeTitleTranslateY = scrollY.interpolate({
    inputRange: [0, 72],
    outputRange: [0, -10],
    extrapolate: "clamp",
  });
  const largeTitleScale = scrollY.interpolate({
    inputRange: [0, 72],
    outputRange: [1, 0.96],
    extrapolate: "clamp",
  });

  return (
    <View className="flex-1">
      <Animated.ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          {
            useNativeDriver: true,
          },
        )}
        scrollEventThrottle={16}
      >
        <View className="flex-1 px-ds-screen pt-5">
          {hasTopControls ? (
            <View className="min-h-9 flex-row items-center justify-between">
              <AppBackButton onPress={onBack} />
              <View className="h-9 w-9" />
            </View>
          ) : null}

          <Animated.View
            style={{
              opacity: largeTitleOpacity,
              transform: [
                { translateY: largeTitleTranslateY },
                { scale: largeTitleScale },
              ],
            }}
          >
            <Text
              className={`font-inter-bold text-vb-xl text-ds-text ${
                onBack ? "mt-8" : "mt-3"
              }`}
            >
              {title}
            </Text>
          </Animated.View>

          {children}
        </View>
      </Animated.ScrollView>

      {compactHeader ? (
        <Animated.View
          className="absolute left-0 right-0 top-0 border-b border-ds-hairline bg-ds-bg px-ds-screen"
          pointerEvents="box-none"
          style={{ opacity: compactHeaderOpacity }}
        >
          <View className="h-14 flex-row items-center justify-center">
            {onBack ? (
              <View className="absolute left-0">
                <AppBackButton onPress={onBack} />
              </View>
            ) : null}

            <Text className="font-inter-semibold text-vb-base text-ds-text">
              {title}
            </Text>

          </View>
        </Animated.View>
      ) : null}

      {isLoading ? (
        <View className="absolute right-ds-screen top-5" pointerEvents="none">
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : null}
    </View>
  );
}

export function AdminScreenShell({
  keyboardAvoiding = false,
  ...props
}: AdminScreenShellProps) {
  return (
    <SafeAreaView className="flex-1 bg-ds-bg">
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
          keyboardVerticalOffset={16}
        >
          <AdminScreenContent {...props} />
        </KeyboardAvoidingView>
      ) : (
        <AdminScreenContent {...props} />
      )}
    </SafeAreaView>
  );
}
