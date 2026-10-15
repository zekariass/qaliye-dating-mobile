/**
 * Last auth deep link received by the root layout's Linking listener.
 *
 * On warm starts the 'url' event fires before the /callback screen mounts,
 * and Supabase error redirects put params in the URL fragment — which Expo
 * Router doesn't expose via search params. Storing the raw URL here lets
 * callback.tsx consume it on mount regardless of timing.
 */
let lastAuthDeepLink: string | null = null;

export function stashAuthDeepLink(url: string) {
  lastAuthDeepLink = url;
}

export function consumeAuthDeepLink(): string | null {
  const url = lastAuthDeepLink;
  lastAuthDeepLink = null;
  return url;
}
