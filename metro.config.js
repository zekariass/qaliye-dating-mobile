const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const { withNativeWind } = require('nativewind/metro');

// getSentryExpoConfig is a drop-in for getDefaultConfig that assigns unique Debug IDs
// to bundles and source maps so Sentry can symbolicate stack traces.
const config = getSentryExpoConfig(__dirname);

config.resolver.unstable_enablePackageExports = true;

// react-native-agora extracts native binaries to a temp path under
// node_modules/.react-native-agora-* that may be missing subdirectories.
// Block those paths so the metro watcher doesn't crash with ENOENT.
config.resolver.blockList = /node_modules[/\\]\.react-native-agora-.*/;

module.exports = withNativeWind(config, { input: './src/global.css' });
