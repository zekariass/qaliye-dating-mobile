import { apiClient } from '@/api/apiClient';

import { fetchOrders } from '../billingApi';

jest.mock('@/api/apiClient', () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

const mockedGet = apiClient.get as jest.Mock;

describe('billingApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetchOrders passes statuses and pagination params in snake_case', async () => {
    mockedGet.mockResolvedValue({
      data: {
        orders: [],
        page: 1,
        page_size: 20,
        total: 0,
        total_pages: 1,
      },
    });

    await fetchOrders({
      statuses: 'AWAITING_PAYMENT,VERIFICATION_PENDING',
      page: 1,
      page_size: 20,
    });

    expect(mockedGet).toHaveBeenCalledWith('/api/v1/billing/orders', {
      params: {
        statuses: 'AWAITING_PAYMENT,VERIFICATION_PENDING',
        page: 1,
        page_size: 20,
      },
    });
  });
});
