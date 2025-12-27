// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Allow loading WASM assets used by expo-sqlite on web.
config.resolver.assetExts = [...config.resolver.assetExts, 'wasm'];

module.exports = config;
