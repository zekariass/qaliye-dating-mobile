export const Routes = {
  SPLASH: '/' as const,
  AUTH: '/auth' as const,
  DISCOVER: '/discover' as const,
} as const;

export type AppRoute = (typeof Routes)[keyof typeof Routes];
