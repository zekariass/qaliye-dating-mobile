jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('zustand/middleware', () => {
  const actual = jest.requireActual('zustand/middleware');
  return {
    ...actual,
    persist: (config: any) => config,
    createJSONStorage: () => undefined,
  };
});

import { usePromotionStore } from '../promotion-store';

describe('promotion-store', () => {
  beforeEach(() => {
    usePromotionStore.setState({ presentations: {} });
  });

  describe('canShow', () => {
    it('returns true for a campaign with no record', () => {
      expect(usePromotionStore.getState().canShow('promo_a')).toBe(true);
    });

    it('returns false within the show cooldown window', () => {
      const now = Date.now();
      usePromotionStore.setState({
        presentations: {
          promo_a: { lastShownAt: now - 5_000, dismissedUntil: null },
        },
      });
      expect(usePromotionStore.getState().canShow('promo_a')).toBe(false);
    });

    it('returns true after cooldown window has passed', () => {
      const thirtyOneMinutesAgo = Date.now() - 31 * 60 * 1000;
      usePromotionStore.setState({
        presentations: {
          promo_a: { lastShownAt: thirtyOneMinutesAgo, dismissedUntil: null },
        },
      });
      expect(usePromotionStore.getState().canShow('promo_a')).toBe(true);
    });

    it('returns false when dismissedUntil is in the future', () => {
      usePromotionStore.setState({
        presentations: {
          promo_a: {
            lastShownAt: Date.now() - 60 * 60 * 1000,
            dismissedUntil: Date.now() + 60 * 60 * 1000,
          },
        },
      });
      expect(usePromotionStore.getState().canShow('promo_a')).toBe(false);
    });

    it('returns true when dismissedUntil has expired and cooldown has passed', () => {
      const longAgo = Date.now() - 3 * 60 * 60 * 1000;
      usePromotionStore.setState({
        presentations: {
          promo_a: {
            lastShownAt: longAgo,
            dismissedUntil: longAgo + 60 * 1000,
          },
        },
      });
      expect(usePromotionStore.getState().canShow('promo_a')).toBe(true);
    });
  });

  describe('recordShown', () => {
    it('creates a record with correct structure', () => {
      const before = Date.now();
      usePromotionStore.getState().recordShown('promo_a');
      const after = Date.now();
      const p = usePromotionStore.getState().presentations['promo_a'];
      expect(p).toBeDefined();
      expect(p.lastShownAt).toBeGreaterThanOrEqual(before);
      expect(p.lastShownAt).toBeLessThanOrEqual(after);
      expect(p.dismissedUntil).toBeNull();
    });

    it('preserves existing dismissedUntil when recording shown', () => {
      const dismissedUntil = Date.now() + 5_000;
      usePromotionStore.setState({
        presentations: { promo_a: { lastShownAt: 0, dismissedUntil } },
      });
      usePromotionStore.getState().recordShown('promo_a');
      expect(usePromotionStore.getState().presentations['promo_a'].dismissedUntil).toBe(dismissedUntil);
    });
  });

  describe('recordDismissed', () => {
    it('sets dismissedUntil approximately 2 hours in the future', () => {
      usePromotionStore.getState().recordShown('promo_a');
      const before = Date.now();
      usePromotionStore.getState().recordDismissed('promo_a');
      const after = Date.now();
      const p = usePromotionStore.getState().presentations['promo_a'];
      const expectedMin = before + 2 * 60 * 60 * 1000;
      const expectedMax = after + 2 * 60 * 60 * 1000;
      expect(p.dismissedUntil).toBeGreaterThanOrEqual(expectedMin);
      expect(p.dismissedUntil).toBeLessThanOrEqual(expectedMax);
    });

    it('makes canShow return false immediately after dismiss', () => {
      usePromotionStore.getState().recordShown('promo_a');
      usePromotionStore.getState().recordDismissed('promo_a');
      expect(usePromotionStore.getState().canShow('promo_a')).toBe(false);
    });
  });
});
