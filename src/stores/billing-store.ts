import { create } from 'zustand';

import type { OrderResponse, OrderStatus } from '@/types/billing';

type BillingStore = {
  orderIdempotencyKey: string | null;
  boostIdempotencyKey: string | null;
  activeOrderId: string | null;
  activeOrderStatus: OrderStatus | null;
  activeOrderOffer: string | null;

  setOrderIdempotencyKey: (key: string) => void;
  clearOrderIdempotencyKey: () => void;

  setBoostIdempotencyKey: (key: string) => void;
  clearBoostIdempotencyKey: () => void;

  setActiveOrder: (order: OrderResponse) => void;
  updateActiveOrderStatus: (status: OrderStatus) => void;
  clearActiveOrder: () => void;
};

export const useBillingStore = create<BillingStore>((set) => ({
  orderIdempotencyKey: null,
  boostIdempotencyKey: null,
  activeOrderId: null,
  activeOrderStatus: null,
  activeOrderOffer: null,

  setOrderIdempotencyKey: (key) => set({ orderIdempotencyKey: key }),
  clearOrderIdempotencyKey: () => set({ orderIdempotencyKey: null }),

  setBoostIdempotencyKey: (key) => set({ boostIdempotencyKey: key }),
  clearBoostIdempotencyKey: () => set({ boostIdempotencyKey: null }),

  setActiveOrder: (order) =>
    set({
      activeOrderId: order.id,
      activeOrderStatus: order.status,
      activeOrderOffer: order.payment_channel,
    }),

  updateActiveOrderStatus: (status) => set({ activeOrderStatus: status }),

  clearActiveOrder: () =>
    set({
      activeOrderId: null,
      activeOrderStatus: null,
      activeOrderOffer: null,
    }),
}));
