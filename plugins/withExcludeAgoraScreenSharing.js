const { withAppBuildGradle } = require('@expo/config-plugins');

const EXCLUDE_BLOCK = `
// react-native-agora hard-depends on io.agora.rtc:full-screen-sharing, whose
// merged manifest adds FOREGROUND_SERVICE_MEDIA_PROJECTION + the MediaProjection
// service. This app has no screen-sharing feature, so drop the artifact from
// the packaged app entirely.
configurations.all {
    exclude group: 'io.agora.rtc', module: 'full-screen-sharing'
}
`;

const withExcludeAgoraScreenSharing = (config) =>
  withAppBuildGradle(config, (mod) => {
    if (mod.modResults.language !== 'groovy') return mod;
    if (!mod.modResults.contents.includes("module: 'full-screen-sharing'")) {
      mod.modResults.contents += EXCLUDE_BLOCK;
    }
    return mod;
  });

module.exports = withExcludeAgoraScreenSharing;
