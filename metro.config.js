const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const { withNativeWind } = require('nativewind/metro');

// getSentryExpoConfig is a drop-in for getDefaultConfig that assigns unique Debug IDs
// to bundles and source maps so Sentry can symbolicate stack traces.
const config = getSentryExpoConfig(__dirname);

config.resolver.unstable_enablePackageExports = true;

module.exports = withNativeWind(config, { input: './src/global.css' });
