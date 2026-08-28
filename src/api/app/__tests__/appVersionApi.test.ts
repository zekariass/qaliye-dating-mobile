// Mock axios so the dedicated versionClient doesn't make real HTTP calls.
import axios from 'axios';
import { fetchAppVersion } from '../appVersionApi';

jest.mock('axios', () => {
  const instance = {
    get: jest.fn(),
  };
  return {
    create: jest.fn(() => instance),
    __mockInstance: instance,
  };
});

const mockInstance = (axios as unknown as { __mockInstance: { get: jest.Mock } }).__mockInstance;
const mockedGet = mockInstance.get;

describe('fetchAppVersion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends GET /api/v1/app/version with platform=android', async () => {
    mockedGet.mockResolvedValue({
      data: {
        platform: 'android',
        latest_version: '1.4.0',
        minimum_version: '1.2.0',
        force_update: false,
        store_url: 'https://play.google.com/store/apps/details?id=com.qaliye.app',
      },
    });

    const result = await fetchAppVersion('android');

    expect(mockedGet).toHaveBeenCalledWith('/api/v1/app/version', {
      params: { platform: 'android' },
    });
    expect(result.platform).toBe('android');
    expect(result.latest_version).toBe('1.4.0');
    expect(result.force_update).toBe(false);
  });

  it('sends GET /api/v1/app/version with platform=ios', async () => {
    mockedGet.mockResolvedValue({
      data: {
        platform: 'ios',
        latest_version: '1.4.0',
        minimum_version: '1.2.0',
        force_update: false,
        store_url: 'https://apps.apple.com/app/id6794608729',
      },
    });

    const result = await fetchAppVersion('ios');

    expect(mockedGet).toHaveBeenCalledWith('/api/v1/app/version', {
      params: { platform: 'ios' },
    });
    expect(result.platform).toBe('ios');
    expect(result.store_url).toBe('https://apps.apple.com/app/id6794608729');
  });

  it('throws on malformed response (missing required field)', async () => {
    mockedGet.mockResolvedValue({
      data: {
        platform: 'android',
        latest_version: '1.4.0',
        // minimum_version missing
        force_update: false,
        store_url: 'https://play.google.com/...',
      },
    });

    await expect(fetchAppVersion('android')).rejects.toThrow(/Invalid/);
  });

  it('throws on non-object response', async () => {
    mockedGet.mockResolvedValue({ data: 'not-an-object' });
    await expect(fetchAppVersion('android')).rejects.toThrow(/Invalid/);
  });

  it('throws when force_update is not a boolean', async () => {
    mockedGet.mockResolvedValue({
      data: {
        platform: 'android',
        latest_version: '1.4.0',
        minimum_version: '1.2.0',
        force_update: 'true', // string instead of boolean
        store_url: 'https://play.google.com/...',
      },
    });
    await expect(fetchAppVersion('android')).rejects.toThrow(/Invalid/);
  });

  it('throws when store_url is missing', async () => {
    mockedGet.mockResolvedValue({
      data: {
        platform: 'android',
        latest_version: '1.4.0',
        minimum_version: '1.2.0',
        force_update: false,
        // store_url missing
      },
    });
    await expect(fetchAppVersion('android')).rejects.toThrow(/Invalid/);
  });

  it('propagates network errors (caller must fail-open)', async () => {
    mockedGet.mockRejectedValue(new Error('Network Error'));
    await expect(fetchAppVersion('android')).rejects.toThrow('Network Error');
  });

  it('propagates 500 errors (caller must fail-open)', async () => {
    const err = new Error('Request failed with status code 500') as Error & {
      response?: { status: number };
    };
    err.response = { status: 500 };
    mockedGet.mockRejectedValue(err);
    await expect(fetchAppVersion('android')).rejects.toThrow();
  });
});
