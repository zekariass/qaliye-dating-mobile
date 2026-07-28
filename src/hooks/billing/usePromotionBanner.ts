import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchEligiblePromotions } from '@/api/billing/billingApi';
import {
    canShowCampaign,
    isPromoCurrentlyValid,
    isPromoStructurallyValid,
} from '@/hooks/billing/useEligiblePromotions';
import { usePromotionStore } from '@/stores/promotion-store';
import type { EligiblePromotionDto } from '@/types/billing';

const SINGLE_PROMO_MS = 10_000;
const MULTI_PROMO_MS = 10_000;

export type PromotionBannerState = {
  promotions: EligiblePromotionDto[];
  currentIndex: number;
  isVisible: boolean;
  dismiss: () => void;
  onSwipeToIndex: (index: number) => void;
  onInteractionStart: () => void;
  onInteractionEnd: () => void;
};

export function usePromotionBanner(
  userId: string | undefined,
  hasActivePremium: boolean,
): PromotionBannerState {
  const [promotions, setPromotions] = useState<EligiblePromotionDto[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const hasEvaluatedRef = useRef(false);
  const isMountedRef = useRef(true);
  const promotionsRef = useRef<EligiblePromotionDto[]>([]);
  const currentIndexRef = useRef(0);
  const store = usePromotionStore();

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current.clear();
  }, []);

  const addTimer = useCallback(
    (fn: () => void, delay: number): ReturnType<typeof setTimeout> => {
      const id = setTimeout(() => {
        timersRef.current.delete(id);
        if (isMountedRef.current) fn();
      }, delay);
      timersRef.current.add(id);
      return id;
    },
    [],
  );

  // Start (or restart) auto-advance + dismiss timers from a given index
  const startTimersFrom = useCallback(
    (fromIndex: number) => {
      clearAllTimers();
      const promos = promotionsRef.current;
      if (promos.length === 0) return;

      if (promos.length === 1) {
        addTimer(() => setIsVisible(false), SINGLE_PROMO_MS);
      } else {
        for (let i = fromIndex + 1; i < promos.length; i++) {
          addTimer(() => setCurrentIndex(i), (i - fromIndex) * MULTI_PROMO_MS);
        }
        addTimer(() => setIsVisible(false), (promos.length - fromIndex) * MULTI_PROMO_MS);
      }
    },
    [clearAllTimers, addTimer],
  );

  const dismiss = useCallback(() => {
    clearAllTimers();
    setIsVisible(false);
  }, [clearAllTimers]);

  // Called when user swipes to a new promo — resets timers from new position
  const onSwipeToIndex = useCallback(
    (index: number) => {
      currentIndexRef.current = index;
      setCurrentIndex(index);
      startTimersFrom(index);
    },
    [startTimersFrom],
  );

  // Called when user starts a pan gesture — pause all timers
  const onInteractionStart = useCallback(() => {
    clearAllTimers();
  }, [clearAllTimers]);

  // Called when user ends a pan gesture — resume timers from current position
  const onInteractionEnd = useCallback(() => {
    startTimersFrom(currentIndexRef.current);
  }, [startTimersFrom]);

  // Evaluate eligible promotions once per app startup
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      clearAllTimers();
    };
  }, [clearAllTimers]);

  useEffect(() => {
    if (hasEvaluatedRef.current) return;
    if (!userId) {
      console.log('[banner] skipping: no userId');
      return;
    }
    if (hasActivePremium) {
      console.log('[banner] skipping: has active premium');
      hasEvaluatedRef.current = true;
      return;
    }

    hasEvaluatedRef.current = true;
    console.log('[banner] evaluating promotions for user:', userId);

    (async () => {
      try {
        const fresh = await fetchEligiblePromotions();
        if (!isMountedRef.current) return;
        console.log('[banner] fetched promotions:', fresh?.length, JSON.stringify(fresh?.map(p => ({ key: p.campaign_key, status: p.status, trigger: p.trigger_type, eligibility: p.eligibility_type, benefit: p.benefit_type, starts_at: p.starts_at, ends_at: p.ends_at }))));

        const now = new Date();
        const eligible = fresh
          .filter((p) => {
            const structValid = isPromoStructurallyValid(p);
            if (!structValid) {
              console.log('[banner] structurally invalid:', p.campaign_key, 'status:', p.status, 'trigger:', p.trigger_type, 'eligibility:', p.eligibility_type, 'benefit:', p.benefit_type);
              return false;
            }
            const timeValid = isPromoCurrentlyValid(p, now);
            if (!timeValid) {
              console.log('[banner] not currently valid:', p.campaign_key, 'status:', p.status, 'starts_at:', p.starts_at, 'ends_at:', p.ends_at, 'now:', now.toISOString());
              return false;
            }
            const record = store.getRecord(userId!, p.campaign_key);
            const canShow = canShowCampaign(p, record, userId!, store, now);
            if (!canShow) {
              console.log('[banner] canShowCampaign false:', p.campaign_key, 'record:', JSON.stringify(record), 'sessionShown:', store.isShownThisSession(userId!, p.campaign_key));
              return false;
            }
            console.log('[banner] eligible:', p.campaign_key);
            return true;
          })
          .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

        console.log('[banner] eligible count:', eligible.length);
        if (eligible.length === 0) return;

        // Record shown in store
        eligible.forEach((p) => {
          store.recordShown(userId!, p.campaign_key);
          store.markShownThisSession(userId!, p.campaign_key);
        });

        promotionsRef.current = eligible;
        currentIndexRef.current = 0;
        setPromotions(eligible);
        setCurrentIndex(0);
        setIsVisible(true);

        startTimersFrom(0);
      } catch (err) {
        console.log('[banner] error fetching promotions:', err);
      }
    })();
  }, [userId, hasActivePremium, addTimer, store, startTimersFrom]);

  // Dismiss banner if user gains premium while banner is visible
  useEffect(() => {
    if (hasActivePremium && isVisible) {
      clearAllTimers();
      setIsVisible(false);
    }
  }, [hasActivePremium, isVisible, clearAllTimers]);

  // Clear timers and hide banner when screen loses focus
  useFocusEffect(
    useCallback(() => {
      return () => {
        clearAllTimers();
        setIsVisible(false);
      };
    }, [clearAllTimers]),
  );

  return {
    promotions,
    currentIndex,
    isVisible,
    dismiss,
    onSwipeToIndex,
    onInteractionStart,
    onInteractionEnd,
  };
}
