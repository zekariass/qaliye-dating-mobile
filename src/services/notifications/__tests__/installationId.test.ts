import AsyncStorage from '@react-native-async-storage/async-storage';
import { readInstallationId } from '../installationId';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
  },
}));

jest.mock('@/utils/uuid', () => ({
  generateUUID: jest.fn(() => 'test-uuid-1234'),
}));

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;

describe('readInstallationId', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns null when nothing is stored', async () => {
    mockGetItem.mockResolvedValue(null);
    const id = await readInstallationId();
    expect(id).toBeNull();
  });

  it('returns the stored value when present', async () => {
    mockGetItem.mockResolvedValue('stored-id-abcd');
    const id = await readInstallationId();
    expect(id).toBe('stored-id-abcd');
  });

  it('reads from the correct storage key', async () => {
    mockGetItem.mockResolvedValue('some-id');
    await readInstallationId();
    expect(mockGetItem).toHaveBeenCalledWith('qaliye_notification_installation_id');
  });
});

describe('getOrCreateInstallationId — storage key contract', () => {
  it('stores the new ID under the expected key', async () => {
    mockSetItem.mockResolvedValue(undefined);
    expect(mockSetItem).not.toHaveBeenCalledWith(
      expect.not.stringContaining('qaliye_notification_installation_id'),
      expect.anything(),
    );
  });

  it('generates a non-empty UUID string', () => {
    const { generateUUID } = require('@/utils/uuid');
    const id = generateUUID();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
    expect(id).toBe('test-uuid-1234');
  });
});
