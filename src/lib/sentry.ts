import * as Sentry from '@sentry/react-native';
import * as Updates from 'expo-updates';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
const appEnv = process.env.EXPO_PUBLIC_APP_ENV;

Sentry.init({
  dsn,
  // Enable only when a DSN is configured and we're not in local development
  enabled: !!dsn && appEnv !== 'development',
  // Crash reporting only — increase tracesSampleRate (0–1) to also enable performance tracing
  tracesSampleRate: 0,
  // Strip Authorization headers from HTTP breadcrumbs before sending to Sentry
  beforeSend(event) {
    if (event.breadcrumbs) {
      for (const crumb of event.breadcrumbs) {
        const d = crumb.data;
        if (!d) continue;
        if ('Authorization' in d) d['Authorization'] = '[Filtered]';
        if ('authorization' in d) d['authorization'] = '[Filtered]';
      }
    }
    return event;
  },
});

// Tag every event with the active OTA update so crashes are searchable
// by update group in the EAS dashboard.
try {
  const manifest = Updates.manifest;
  const metadata =
    'metadata' in manifest ? (manifest.metadata as Record<string, unknown>) : undefined;
  const extra =
    'extra' in manifest ? (manifest.extra as Record<string, unknown>) : undefined;
  const updateGroup = metadata?.updateGroup;

  Sentry.setTag('expo-update-id', Updates.updateId ?? 'embedded');
  Sentry.setTag('expo-is-embedded-update', String(Updates.isEmbeddedLaunch));

  if (typeof updateGroup === 'string') {
    Sentry.setTag('expo-update-group-id', updateGroup);
    const expoClient = extra?.expoClient as Record<string, unknown> | undefined;
    const owner = (expoClient?.owner as string) ?? '[account]';
    const slug = (expoClient?.slug as string) ?? '[project]';
    Sentry.setTag(
      'expo-update-debug-url',
      `https://expo.dev/accounts/${owner}/projects/${slug}/updates/${updateGroup}`,
    );
  } else if (Updates.isEmbeddedLaunch) {
    Sentry.setTag('expo-update-debug-url', 'not applicable for embedded updates');
  }
} catch {
  // Updates context is non-fatal — crash reporting still functions without it
}
