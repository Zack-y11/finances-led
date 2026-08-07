module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      // Expo owns the worklets plugin (must run last). Do not also load
      // nativewind/babel — that preset re-injects react-native-worklets/plugin
      // and breaks Expo Go's bridgeless runtime (MessageQueue).
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
    ],
    plugins: [
      // NativeWind / css-interop transform only (no worklets plugin).
      require('react-native-css-interop/dist/babel-plugin').default,
    ],
  };
};
