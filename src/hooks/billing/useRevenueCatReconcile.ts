import { useQuery } from '@tanstack/react-query';
import { Platform } from 'react-native';

import {
    findPackageInOfferings,
    getRevenueCatOfferings,
    type PurchasesPackage,
} from '@/services/billing/revenueCatService';
import type { OfferDto, PaymentMethodDto } from '@/types/billing';
import { useBillingPlatform } from './useBillingPlatform';

export type ReconciledOffer = {
  backendOffer: OfferDto;
  rcPackage: PurchasesPackage;
};

const RC_OFFERINGS_KEY = ['billing', 'rc-offerings'] as const;

export function useRevenueCatReconcile(
  backendOffers: OfferDto[],
  paymentMethods: PaymentMethodDto[],
) {
  const platform = useBillingPlatform();

  const expectedRcChannel = platform === 'IOS' ? 'REVENUECAT_APPLE' : 'REVENUECAT_GOOGLE';
  const hasRcPaymentMethod = paymentMethods.some(
    (m) => m.payment_channel === expectedRcChannel,
  );

  const hasRcOfferIds = backendOffers.some(
    (o) => !!(o.revenuecat_offering_id && o.revenuecat_package_id),
  );

  const shouldLoadRc = (hasRcPaymentMethod || hasRcOfferIds) && Platform.OS !== 'web';

  if (__DEV__) {
    console.log(
      '[RC Reconcile] platform:', platform,
      '| expectedChannel:', expectedRcChannel,
      '| hasRcPaymentMethod:', hasRcPaymentMethod,
      '| hasRcOfferIds:', hasRcOfferIds,
      '| shouldLoadRc:', shouldLoadRc,
    );
  }

  const rcQuery = useQuery({
    queryKey: RC_OFFERINGS_KEY,
    queryFn: getRevenueCatOfferings,
    staleTime: 5 * 60_000,
    enabled: shouldLoadRc,
  });

  const offerings = rcQuery.data;

  const reconciledOffers: ReconciledOffer[] = [];
  const localOffers: OfferDto[] = [];

  for (const offer of backendOffers) {
    if (
      shouldLoadRc &&
      offerings &&
      offer.revenuecat_offering_id &&
      offer.revenuecat_package_id
    ) {
      const pkg = findPackageInOfferings(
        offerings,
        offer.revenuecat_offering_id,
        offer.revenuecat_package_id,
      );
      if (__DEV__) {
        console.log(
          '[RC Reconcile] offer:', offer.product_code,
          '| offeringId:', offer.revenuecat_offering_id,
          '| packageId:', offer.revenuecat_package_id,
          '| pkg found:', !!pkg,
        );
      }
      if (pkg) {
        reconciledOffers.push({ backendOffer: offer, rcPackage: pkg });
        continue;
      }
    } else if (__DEV__) {
      console.log(
        '[RC Reconcile] offer:', offer.product_code,
        '→ local (shouldLoadRc:', shouldLoadRc,
        '| offeringId:', offer.revenuecat_offering_id ?? 'null',
        '| packageId:', offer.revenuecat_package_id ?? 'null',
        '| offeringsLoaded:', !!offerings, ')',
      );
    }
    localOffers.push(offer);
  }

  return {
    reconciledOffers,
    localOffers,
    hasRcPaymentMethod,
    isLoadingRc: rcQuery.isLoading,
    rcError: rcQuery.error,
  };
}
