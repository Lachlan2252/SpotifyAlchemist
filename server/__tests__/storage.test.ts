import { InsertUser } from '@shared/schema';
import { jest } from '@jest/globals';

const mockDb: any = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

jest.mock('../db', () => ({ db: mockDb }));

import { DatabaseStorage } from '../storage';

describe('DatabaseStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a new user when none exists', async () => {
    mockDb.select.mockReturnValue({
      from: () => ({ where: async () => [] }),
    });
    const inserted = { id: 1, spotifyId: 'sp1', displayName: 't', accessToken: '', refreshToken: '', tokenExpiresAt: new Date() };
    mockDb.insert.mockReturnValue({
      values: () => ({ returning: async () => [inserted] }),
    });

    const storage = new DatabaseStorage();
    const input: InsertUser = {
      spotifyId: 'sp1',
      displayName: 't',
      accessToken: '',
      refreshToken: '',
      tokenExpiresAt: new Date(),
    };
    const user = await storage.createOrUpdateUser(input);
    expect(user).toEqual(inserted);
  });

  it('updates an existing user', async () => {
    const existing = { id: 2, spotifyId: 'sp2', displayName: 'old', accessToken: '', refreshToken: '', tokenExpiresAt: new Date() };
    mockDb.select.mockReturnValueOnce({
      from: () => ({ where: async () => [existing] }),
    });
    const updated = { ...existing, displayName: 'new' };
    mockDb.update.mockReturnValue({
      set: () => ({ where: () => ({ returning: async () => [updated] }) }),
    });

    const storage = new DatabaseStorage();
    const input: InsertUser = {
      spotifyId: 'sp2',
      displayName: 'new',
      accessToken: '',
      refreshToken: '',
      tokenExpiresAt: new Date(),
    };
    const user = await storage.createOrUpdateUser(input);
    expect(user).toEqual(updated);
  });
});
