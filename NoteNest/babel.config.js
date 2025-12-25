module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Local plugin to replace import.meta with an object stub for Metro/web.
      './scripts/babel-plugin-transform-import-meta.js',
    ],
  };
};
