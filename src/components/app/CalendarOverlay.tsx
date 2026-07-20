import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { registerCalendarOpener } from "../../lib/calendar-trigger";
import { colors } from "../../theme/tokens";
import { CalendarPanel } from "./CalendarPanel";

// Calm panel spring — quick to settle, no toy bounce.
const SPRING = { damping: 24, stiffness: 240, mass: 1 };
const RUBBER = 0.2; // resistance past the open/closed bounds
const VELOCITY_THRESHOLD = 450;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Right-edge swipe-in calendar overlay. Mounted at the app shell (above the
 * tabs). A thin edge handle opens it; the panel tracks the finger and settles
 * with a spring. `tx` is the panel's translateX: 0 = open, PANEL_W = closed.
 *
 * NOTE: personal reminders / birthdays from the product docs have no API
 * endpoints — this is the events calendar only. TODO: add reminders when the
 * backend exposes them.
 */
export function CalendarOverlay() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();

  const PANEL_W = Math.min(width * 0.88, 420);

  const tx = useSharedValue(PANEL_W); // start closed
  const start = useSharedValue(PANEL_W);
  const [visible, setVisible] = useState(false);

  // Visible (mounted/interactive) as soon as the panel leaves the closed edge.
  useAnimatedReaction(
    () => tx.value < PANEL_W - 0.5,
    (now, prev) => {
      if (now !== prev) scheduleOnRN(setVisible, now);
    },
  );

  const afterSettle = (open: boolean) => {
    Haptics.impactAsync(
      open ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
    ).catch(() => {});
  };

  const openCal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    tx.value = reduced ? withTiming(0, { duration: 200 }) : withSpring(0, SPRING);
  };
  const closeCal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    tx.value = reduced ? withTiming(PANEL_W, { duration: 200 }) : withSpring(PANEL_W, SPRING);
  };

  // Expose a programmatic open() so the sphere "My calendar" tile opens this same
  // overlay. A ref keeps the registered fn pointing at the latest openCal.
  const openRef = useRef(openCal);
  openRef.current = openCal;
  useEffect(() => {
    registerCalendarOpener(() => openRef.current());
    return () => registerCalendarOpener(null);
  }, []);

  // Shared drag handlers (worklets). clampRubber resists past the bounds.
  const onDragStart = () => {
    "worklet";
    cancelAnimation(tx);
    start.value = tx.value;
  };
  const onDragUpdate = (translationX: number) => {
    "worklet";
    let v = start.value + translationX;
    if (v < 0) v = v * RUBBER;
    else if (v > PANEL_W) v = PANEL_W + (v - PANEL_W) * RUBBER;
    tx.value = v;
  };
  const onDragEnd = (velocityX: number) => {
    "worklet";
    const open =
      velocityX < -VELOCITY_THRESHOLD
        ? true
        : velocityX > VELOCITY_THRESHOLD
          ? false
          : tx.value < PANEL_W / 2;
    tx.value = withSpring(open ? 0 : PANEL_W, { ...SPRING, velocity: velocityX });
    scheduleOnRN(afterSettle, open);
  };

  // Open: drag left from the right edge.
  const edgePan = Gesture.Pan()
    .enabled(!reduced)
    .activeOffsetX([-12, 12])
    .onBegin(onDragStart)
    .onUpdate((e) => onDragUpdate(e.translationX))
    .onEnd((e) => onDragEnd(e.velocityX));

  // Close: drag right on the panel; vertical scroll inside wins via failOffsetY.
  const panelPan = Gesture.Pan()
    .enabled(!reduced)
    .activeOffsetX(14)
    .failOffsetY([-12, 12])
    .onBegin(onDragStart)
    .onUpdate((e) => onDragUpdate(e.translationX))
    .onEnd((e) => onDragEnd(e.velocityX));

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [0, PANEL_W], [0.45, 0], "clamp"),
  }));
  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }],
  }));
  // Edge handle fades out as the panel opens (kept mounted so a drag that opens
  // it isn't interrupted by an unmount mid-gesture).
  const handleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [PANEL_W * 0.6, PANEL_W], [0, 1], "clamp"),
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Scrim */}
      {visible ? (
        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss calendar"
          onPress={closeCal}
          style={[StyleSheet.absoluteFill, { backgroundColor: "#000" }, scrimStyle]}
        />
      ) : null}

      {/* Panel */}
      <GestureDetector gesture={panelPan}>
        <Animated.View
          style={[
            {
              position: "absolute",
              top: 0,
              bottom: 0,
              right: 0,
              width: PANEL_W,
              backgroundColor: colors.surface,
              shadowColor: "#000",
              shadowOpacity: 0.18,
              shadowRadius: 16,
              shadowOffset: { width: -4, height: 0 },
              elevation: 16,
            },
            panelStyle,
          ]}
        >
          {/* Drag handle on the panel's inner edge */}
          <View pointerEvents="none" style={{ position: "absolute", left: 4, top: height / 2 - 24, zIndex: 2 }}>
            <View style={{ width: 4, height: 48, borderRadius: 2, backgroundColor: colors.hairlineStrong }} />
          </View>
          {visible ? (
            <CalendarPanel
              visible={visible}
              paddingTop={insets.top + 8}
              paddingBottom={insets.bottom + 16}
              onClose={closeCal}
            />
          ) : null}
        </Animated.View>
      </GestureDetector>

      {/* Right-edge handle: open affordance + reduced-motion entry. Always
          mounted so an opening drag isn't interrupted; hit-testing is disabled
          once the panel is open so it never blocks the panel/scrim. */}
      <GestureDetector gesture={edgePan}>
        <Animated.View
          pointerEvents={visible ? "none" : "auto"}
          style={[{ position: "absolute", right: 0, top: height / 2 - 48, width: 28, height: 96 }, handleStyle]}
        >
          <Pressable
            onPress={openCal}
            accessibilityRole="button"
            accessibilityLabel="Open calendar"
            hitSlop={8}
            style={{ flex: 1, alignItems: "flex-end", justifyContent: "center" }}
          >
            <View
              style={{
                width: 26,
                height: 64,
                borderTopLeftRadius: 14,
                borderBottomLeftRadius: 14,
                backgroundColor: colors.surface,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#000",
                shadowOpacity: 0.12,
                shadowRadius: 6,
                shadowOffset: { width: -2, height: 0 },
                elevation: 6,
              }}
            >
              <Ionicons name="calendar-outline" size={18} color={colors.brandInk} />
            </View>
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
