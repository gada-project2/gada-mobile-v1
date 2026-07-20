import { Redirect } from "expo-router";

/**
 * Placeholder route so the tab bar's centre "+" screen exists. In practice the
 * FAB's custom tabBarButton intercepts the press and pushes /create directly
 * (see _layout.tsx), so this is never mounted — the Redirect is just a safety
 * net if something ever navigates here.
 */
export default function CreateTabRedirect() {
  return <Redirect href="/create" />;
}
