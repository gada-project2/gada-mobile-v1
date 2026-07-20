import { View } from "react-native";

// Landing route for "/". The root navigator redirects to (auth) or (tabs)
// once fonts + session bootstrap resolve; this just fills the frame meanwhile.
export default function Index() {
  return <View className="flex-1 bg-page" />;
}
