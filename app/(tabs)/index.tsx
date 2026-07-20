import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDecay,
  withDelay,
  withSpring,
  type SharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EventFeedOverlay } from "../../src/components/app/EventFeedOverlay";
import { NotificationBell } from "../../src/components/app/NotificationBell";
import { Logo, Text } from "../../src/components/ui";
import { useAuth } from "../../src/lib/auth/AuthContext";
import { openCalendar } from "../../src/lib/calendar-trigger";
import { useResolvedMedia } from "../../src/lib/queries/storage";
import { colors } from "../../src/theme/tokens";

type IoniconName = keyof typeof Ionicons.glyphMap;

const COUNT = 5;
const TWO_PI = Math.PI * 2;
// "Spinning twice rearranges the spheres" — two full turns since the last shuffle.
const REARRANGE_TURNS = 2 * TWO_PI;

// Slot 0 sits at the top; the rest run clockwise around the circle.
function slotAngle(slot: number): number {
  "worklet";
  return -Math.PI / 2 + (slot * TWO_PI) / COUNT;
}

// Spring configs — weighty and calm, not bouncy-toy (CLAUDE.md native quality bar).
const ENTER_SPRING = { damping: 13, stiffness: 110, mass: 0.8 };
const REARRANGE_SPRING = { damping: 15, stiffness: 95, mass: 1 };
const PRESS_SPRING = { damping: 20, stiffness: 350 };
const DECAY = { deceleration: 0.997 };

interface MenuItem {
  key: string;
  label: string;
  icon: IoniconName;
  tint: string;
  accent: string;
  onPress: () => void;
}

function shuffled<T>(arr: T[]): T[] {
  const next = [...arr];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  // Guarantee a visible change.
  if (next.every((v, i) => v === arr[i])) next.push(next.shift() as T);
  return next;
}

export default function SphereHome() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const reduced = useReducedMotion();

  // Responsive geometry.
  const surroundD = Math.max(64, Math.min(96, width * 0.22));
  const centerD = Math.max(104, Math.min(148, width * 0.32));
  const radius = Math.min(width * 0.34, width / 2 - surroundD / 2 - 16);
  const box = radius * 2 + surroundD;

  const greetingName =
    user?.displayName ?? user?.name ?? user?.email?.split("@")[0] ?? "there";
  const avatarUrl = useResolvedMedia(user?.photoKey).data ?? null;

  const go = useCallback((path: string) => {
    Haptics.selectionAsync().catch(() => {});
    router.push(path as never);
  }, []);

  // The 5 surrounding items (fixed identity; only their slot assignment changes).
  // All five now point at built screens; "My calendar" opens the shared overlay.
  const items: MenuItem[] = [
    { key: "circles", label: "My circles", icon: "people-outline", tint: "#EDF0F2", accent: colors.muted, onPress: () => go("/circles") },
    { key: "calendar", label: "My calendar", icon: "calendar-outline", tint: colors.invitedTint, accent: colors.invitedInk, onPress: () => { Haptics.selectionAsync().catch(() => {}); openCalendar(); } },
    { key: "gadarings", label: "My gadarings", icon: "sparkles-outline", tint: colors.brandTint, accent: colors.brandInk, onPress: () => go("/manage") },
    { key: "volunteering", label: "Volunteering", icon: "hand-left-outline", tint: colors.volunteeringTint, accent: colors.volunteeringInk, onPress: () => go("/volunteering") },
    { key: "settings", label: "Settings", icon: "settings-outline", tint: "#EDF0F2", accent: colors.muted, onPress: () => go("/settings") },
  ];

  // Ring rotation (radians) — the single shared value the gesture drives.
  const rotation = useSharedValue(0);
  // Per-item slot angle (upright position). Animated on rearrange.
  const a0 = useSharedValue(slotAngle(0));
  const a1 = useSharedValue(slotAngle(1));
  const a2 = useSharedValue(slotAngle(2));
  const a3 = useSharedValue(slotAngle(3));
  const a4 = useSharedValue(slotAngle(4));
  const angles = [a0, a1, a2, a3, a4];

  // Gesture bookkeeping (UI thread).
  const prevAngle = useSharedValue(0);
  const lastRearrange = useSharedValue(0);

  const cx = box / 2;
  const cy = box / 2;

  const [, setOrderTick] = useState(0);
  const orderRef = useRef([0, 1, 2, 3, 4]); // order[slot] = itemIndex

  const rearrange = useCallback(() => {
    const next = shuffled(orderRef.current);
    orderRef.current = next;
    next.forEach((itemIndex, slot) => {
      angles[itemIndex].value = withSpring(slotAngle(slot), REARRANGE_SPRING);
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setOrderTick((t) => t + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fire a rearrange every two full turns (works during the post-release decay too).
  useAnimatedReaction(
    () => rotation.value,
    (cur) => {
      if (Math.abs(cur - lastRearrange.value) >= REARRANGE_TURNS) {
        lastRearrange.value = cur;
        scheduleOnRN(rearrange);
      }
    },
  );

  const pan = Gesture.Pan()
    .enabled(!reduced)
    .minDistance(8)
    .onBegin((e) => {
      cancelAnimation(rotation);
      prevAngle.value = Math.atan2(e.y - cy, e.x - cx);
    })
    .onUpdate((e) => {
      const cur = Math.atan2(e.y - cy, e.x - cx);
      let d = cur - prevAngle.value;
      if (d > Math.PI) d -= TWO_PI;
      else if (d < -Math.PI) d += TWO_PI;
      rotation.value += d;
      prevAngle.value = cur;
    })
    .onEnd((e) => {
      const rx = e.x - cx;
      const ry = e.y - cy;
      const r2 = rx * rx + ry * ry;
      // Convert the linear fling velocity into angular velocity about the centre.
      const omega = r2 > 0 ? (rx * e.velocityY - ry * e.velocityX) / r2 : 0;
      rotation.value = withDecay({ ...DECAY, velocity: omega });
    });

  // Ring spins; each sphere counter-rotates its content to stay upright.
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${rotation.value}rad` }],
  }));

  return (
    <>
      <View className="flex-1 bg-page" style={{ paddingTop: insets.top }}>
        {/* Header */}
      <View className="flex-row items-center justify-between px-5 pb-2 pt-2">
        <View className="gap-1">
          <Logo height={26} />
          <Text tone="muted" className="text-sm">
            Hi {greetingName} 👋
          </Text>
        </View>
        <View className="flex-row items-center gap-3">
          <NotificationBell />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Profile"
            hitSlop={8}
            onPress={() => router.push("/(tabs)/profile")}
          >
            {avatarUrl ? (
              <Image source={avatarUrl} style={{ width: 44, height: 44, borderRadius: 22 }} />
            ) : (
              <View className="h-11 w-11 items-center justify-center rounded-pill bg-brand-tint">
                <Text weight="semibold" tone="brand-ink">
                  {greetingName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      {/* Sphere field */}
      <View className="flex-1 items-center justify-center">
        <GestureDetector gesture={pan}>
          <View style={{ width: box, height: box }}>
            {/* The rotating ring of 5 */}
            <Animated.View style={[{ position: "absolute", width: box, height: box }, ringStyle]}>
              {items.map((item, i) => (
                <SurroundingSphere
                  key={item.key}
                  item={item}
                  angle={angles[i]}
                  rotation={rotation}
                  radius={radius}
                  size={surroundD}
                  centerLeft={cx - surroundD / 2}
                  centerTop={cy - surroundD / 2}
                  index={i}
                  reduced={reduced}
                />
              ))}
            </Animated.View>

            {/* Fixed centre sphere — never moves */}
            <CenterSphere
              size={centerD}
              left={cx - centerD / 2}
              top={cy - centerD / 2}
              reduced={reduced}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                router.push("/create");
              }}
            />
          </View>
        </GestureDetector>

        <Text tone="faint" className="mt-8 text-center text-xs">
          {reduced ? "Tap a sphere to open it" : "Spin the ring · tap a sphere to open it"}
        </Text>
      </View>
      </View>
      <EventFeedOverlay />
    </>
  );
}

function SurroundingSphere({
  item,
  angle,
  rotation,
  radius,
  size,
  centerLeft,
  centerTop,
  index,
  reduced,
}: {
  item: MenuItem;
  angle: SharedValue<number>;
  rotation: SharedValue<number>;
  radius: number;
  size: number;
  centerLeft: number;
  centerTop: number;
  index: number;
  reduced: boolean;
}) {
  const appear = useSharedValue(reduced ? 1 : 0);
  const press = useSharedValue(1);

  useEffect(() => {
    if (reduced) {
      appear.value = 1;
      return;
    }
    appear.value = withDelay(index * 70, withSpring(1, ENTER_SPRING));
  }, [appear, index, reduced]);

  // Position on the ring (slot angle), plus entrance + press scale.
  const posStyle = useAnimatedStyle(() => ({
    opacity: appear.value,
    transform: [
      { translateX: radius * Math.cos(angle.value) },
      { translateY: radius * Math.sin(angle.value) },
      { scale: appear.value * press.value },
    ],
  }));

  // Counter-rotate the content so labels/icons stay upright as the ring spins.
  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${-rotation.value}rad` }],
  }));

  return (
    <Animated.View
      style={[{ position: "absolute", left: centerLeft, top: centerTop, width: size, height: size }, posStyle]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={item.label}
        onPressIn={() => {
          press.value = withSpring(0.9, PRESS_SPRING);
        }}
        onPressOut={() => {
          press.value = withSpring(1, PRESS_SPRING);
        }}
        onPress={() => {
          Haptics.selectionAsync().catch(() => {});
          item.onPress();
        }}
        style={{ width: size, height: size }}
      >
        <Animated.View
          style={[
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: item.tint,
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              paddingHorizontal: 6,
            },
            contentStyle,
          ]}
        >
          <Ionicons name={item.icon} size={size * 0.3} color={item.accent} />
          <Text weight="medium" numberOfLines={1} className="text-center text-xs" style={{ color: item.accent }}>
            {item.label}
          </Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

function CenterSphere({
  size,
  left,
  top,
  reduced,
  onPress,
}: {
  size: number;
  left: number;
  top: number;
  reduced: boolean;
  onPress: () => void;
}) {
  const appear = useSharedValue(reduced ? 1 : 0);
  const press = useSharedValue(1);

  useEffect(() => {
    if (reduced) {
      appear.value = 1;
      return;
    }
    appear.value = withSpring(1, ENTER_SPRING);
  }, [appear, reduced]);

  const style = useAnimatedStyle(() => ({
    opacity: appear.value,
    transform: [{ scale: appear.value * press.value }],
  }));

  return (
    <Animated.View style={[{ position: "absolute", left, top, width: size, height: size }, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Create gadaring"
        onPressIn={() => {
          press.value = withSpring(0.94, PRESS_SPRING);
        }}
        onPressOut={() => {
          press.value = withSpring(1, PRESS_SPRING);
        }}
        onPress={onPress}
        style={{ width: size, height: size }}
      >
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors.brand,
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
            shadowColor: colors.brandInk,
            shadowOpacity: 0.3,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
            elevation: 8,
          }}
        >
          <Ionicons name="add" size={size * 0.34} color="#FFFFFF" />
          <Text weight="semibold" tone="surface" numberOfLines={2} className="text-center text-sm">
            Create gadaring
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}
