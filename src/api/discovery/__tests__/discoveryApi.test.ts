import { apiClient } from '@/api/apiClient';
import { revisitPassedProfiles } from '../discoveryApi';

jest.mock('@/api/apiClient', () => ({
  apiClient: {
    post: jest.fn(),
  },
}));

const mockPost = apiClient.post as jest.Mock;

describe('revisitPassedProfiles', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls POST /api/v1/discovery/passes/revisit with count=10', async () => {
    mockPost.mockResolvedValue({ data: { success: true, reopenedCount: 3 } });

    const result = await revisitPassedProfiles(10);

    expect(mockPost).toHaveBeenCalledWith(
      '/api/v1/discovery/passes/revisit',
      undefined,
      { params: { count: 10 } },
    );
    expect(result).toEqual({ success: true, reopenedCount: 3 });
  });

  it('calls POST /api/v1/discovery/passes/revisit with count=20', async () => {
    mockPost.mockResolvedValue({ data: { success: true, reopenedCount: 0 } });

    await revisitPassedProfiles(20);

    expect(mockPost).toHaveBeenCalledWith(
      '/api/v1/discovery/passes/revisit',
      undefined,
      { params: { count: 20 } },
    );
  });

  it('calls POST /api/v1/discovery/passes/revisit with count=30', async () => {
    mockPost.mockResolvedValue({ data: { success: true, reopenedCount: 7 } });

    await revisitPassedProfiles(30);

    expect(mockPost).toHaveBeenCalledWith(
      '/api/v1/discovery/passes/revisit',
      undefined,
      { params: { count: 30 } },
    );
  });

  it('defaults to count=10 when omitted', async () => {
    mockPost.mockResolvedValue({ data: { success: true, reopenedCount: 1 } });

    await revisitPassedProfiles();

    expect(mockPost).toHaveBeenCalledWith(
      '/api/v1/discovery/passes/revisit',
      undefined,
      { params: { count: 10 } },
    );
  });
});
