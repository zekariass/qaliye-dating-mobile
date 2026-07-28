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

const USER = 'user-1';
const CAM = 'promo_a';

describe('promotion-store', () => {
  beforeEach(() => {
    usePromotionStore.setState({ records: {} });
    usePromotionStore.getState().clearSessionForUser(USER);
  });

  // ─── getRecord ────────────────────────────────────────────────────────────
  describe('getRecord', () => {
    it('returns default record for unknown user+campaign', () => {
      const r = usePromotionStore.getState().getRecord(USER, CAM);
      expect(r.dismissalCount).toBe(0);
      expect(r.permanentlyHidden).toBe(false);
      expect(r.claimedOrRedeemed).toBe(false);
      expect(r.lastShownAt).toBeNull();
      expect(r.lastDismissedAt).toBeNull();
    });
  });

  // ─── recordShown ──────────────────────────────────────────────────────────
  describe('recordShown', () => {
    it('sets lastShownAt to a recent ISO string', () => {
      const before = new Date().toISOString();
      usePromotionStore.getState().recordShown(USER, CAM);
      const after = new Date().toISOString();
      const r = usePromotionStore.getState().getRecord(USER, CAM);
      expect(r.lastShownAt).not.toBeNull();
      expect(r.lastShownAt! >= before).toBe(true);
      expect(r.lastShownAt! <= after).toBe(true);
    });

    it('does not change dismissalCount', () => {
      usePromotionStore.getState().recordShown(USER, CAM);
      expect(usePromotionStore.getState().getRecord(USER, CAM).dismissalCount).toBe(0);
    });

    it('is isolated per user', () => {
      usePromotionStore.getState().recordShown('user-A', CAM);
      expect(usePromotionStore.getState().getRecord('user-B', CAM).lastShownAt).toBeNull();
    });
  });

  // ─── recordExplicitDismissal ───────────────────────────────────────────────
  describe('recordExplicitDismissal', () => {
    it('increments dismissalCount on each call', () => {
      usePromotionStore.getState().recordExplicitDismissal(USER, CAM);
      expect(usePromotionStore.getState().getRecord(USER, CAM).dismissalCount).toBe(1);
      usePromotionStore.getState().recordExplicitDismissal(USER, CAM);
      expect(usePromotionStore.getState().getRecord(USER, CAM).dismissalCount).toBe(2);
    });

    it('sets lastDismissedAt to a recent ISO string', () => {
      const before = new Date().toISOString();
      usePromotionStore.getState().recordExplicitDismissal(USER, CAM);
      const after = new Date().toISOString();
      const r = usePromotionStore.getState().getRecord(USER, CAM);
      expect(r.lastDismissedAt).not.toBeNull();
      expect(r.lastDismissedAt! >= before).toBe(true);
      expect(r.lastDismissedAt! <= after).toBe(true);
    });

    it('does not set permanentlyHidden', () => {
      usePromotionStore.getState().recordExplicitDismissal(USER, CAM);
      expect(usePromotionStore.getState().getRecord(USER, CAM).permanentlyHidden).toBe(false);
    });
  });

  // ─── markClaimedOrRedeemed ─────────────────────────────────────────────────
  describe('markClaimedOrRedeemed', () => {
    it('sets claimedOrRedeemed to true', () => {
      usePromotionStore.getState().markClaimedOrRedeemed(USER, CAM);
      expect(usePromotionStore.getState().getRecord(USER, CAM).claimedOrRedeemed).toBe(true);
    });
  });

  // ─── markPermanentlyHidden ─────────────────────────────────────────────────
  describe('markPermanentlyHidden', () => {
    it('sets permanentlyHidden to true', () => {
      usePromotionStore.getState().markPermanentlyHidden(USER, CAM);
      expect(usePromotionStore.getState().getRecord(USER, CAM).permanentlyHidden).toBe(true);
    });
  });

  // ─── session tracking ─────────────────────────────────────────────────────
  describe('session tracking', () => {
    it('starts with no session-shown campaigns', () => {
      expect(usePromotionStore.getState().isShownThisSession(USER, CAM)).toBe(false);
    });

    it('marks and detects session-shown campaigns', () => {
      usePromotionStore.getState().markShownThisSession(USER, CAM);
      expect(usePromotionStore.getState().isShownThisSession(USER, CAM)).toBe(true);
    });

    it('is isolated per user', () => {
      usePromotionStore.getState().markShownThisSession('user-A', CAM);
      expect(usePromotionStore.getState().isShownThisSession('user-B', CAM)).toBe(false);
    });

    it('clears session for a user on clearSessionForUser', () => {
      usePromotionStore.getState().markShownThisSession(USER, CAM);
      usePromotionStore.getState().clearSessionForUser(USER);
      expect(usePromotionStore.getState().isShownThisSession(USER, CAM)).toBe(false);
    });

    it('does not clear session of other users on clearSessionForUser', () => {
      usePromotionStore.getState().markShownThisSession('user-A', CAM);
      usePromotionStore.getState().clearSessionForUser('user-B');
      expect(usePromotionStore.getState().isShownThisSession('user-A', CAM)).toBe(true);
    });
  });

  // ─── display lock ─────────────────────────────────────────────────────────
  describe('display lock', () => {
    it('is not held initially', () => {
      expect(usePromotionStore.getState().isDisplayLockHeld()).toBe(false);
    });

    it('acquires the lock and returns true', () => {
      expect(usePromotionStore.getState().acquireDisplayLock()).toBe(true);
      expect(usePromotionStore.getState().isDisplayLockHeld()).toBe(true);
    });

    it('returns false when already held', () => {
      usePromotionStore.getState().acquireDisplayLock();
      expect(usePromotionStore.getState().acquireDisplayLock()).toBe(false);
    });

    it('releases the lock', () => {
      usePromotionStore.getState().acquireDisplayLock();
      usePromotionStore.getState().releaseDisplayLock();
      expect(usePromotionStore.getState().isDisplayLockHeld()).toBe(false);
    });

    it('clearSessionForUser also releases the lock', () => {
      usePromotionStore.getState().acquireDisplayLock();
      usePromotionStore.getState().clearSessionForUser(USER);
      expect(usePromotionStore.getState().isDisplayLockHeld()).toBe(false);
    });

    it('can be re-acquired after release', () => {
      usePromotionStore.getState().acquireDisplayLock();
      usePromotionStore.getState().releaseDisplayLock();
      expect(usePromotionStore.getState().acquireDisplayLock()).toBe(true);
    });
  });

  // ─── record isolation ─────────────────────────────────────────────────────
  describe('record isolation', () => {
    it('different campaigns do not share records', () => {
      usePromotionStore.getState().recordExplicitDismissal(USER, 'camp_a');
      expect(usePromotionStore.getState().getRecord(USER, 'camp_b').dismissalCount).toBe(0);
    });

    it('same campaign but different users have separate records', () => {
      usePromotionStore.getState().markClaimedOrRedeemed('user-X', CAM);
      expect(usePromotionStore.getState().getRecord('user-Y', CAM).claimedOrRedeemed).toBe(false);
    });
  });
});
