module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      // Reanimated 4 ships its worklet transform via react-native-worklets.
      // This plugin MUST be listed last.
      "react-native-worklets/plugin",
    ],
  };
};
