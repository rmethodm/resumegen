module.exports = function (api) {
  api.cache(true);
  return {
    // babel-preset-expo (bundled with Expo SDK 57) auto-detects react-native-worklets /
    // react-native-reanimated and injects the worklets babel plugin itself — no manual
    // `react-native-reanimated/plugin` entry needed (and adding one would double-apply
    // the transform). See https://docs.expo.dev/versions/v57.0.0/sdk/reanimated/.
    presets: ['babel-preset-expo'],
  };
};
