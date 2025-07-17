import express from 'express';
import session from 'express-session';
import request from 'supertest';
import { jest } from '@jest/globals';

const mockStorage: any = {
  getUser: jest.fn(),
  getUserPlaylists: jest.fn(),
  getPlaylistWithTracks: jest.fn(),
  getRecentPrompts: jest.fn(),
};
jest.mock('../storage', () => ({ storage: mockStorage }));
jest.mock('../services/openai', () => ({
  generatePlaylistFromPrompt: jest.fn(),
  generateAdvancedPlaylistFromPrompt: jest.fn(),
  modifyPlaylist: jest.fn(),
}));
jest.mock('../services/spotify', () => ({ spotifyService: {} }));
jest.mock('../services/playlist-editor', () => ({
  PlaylistEditor: jest.fn().mockImplementation(() => ({})),
}));

import { registerRoutes } from '../routes';

async function createApp(authenticated = false) {
  const app = express();
  app.use(express.json());
  app.use(session({ secret: 'test', resave: false, saveUninitialized: false }));
  if (authenticated) {
    app.use((req, _res, next) => {
      req.session.userId = 1;
      next();
    });
  }
  await registerRoutes(app);
  return app;
}

describe('API routes', () => {
  beforeEach(() => jest.clearAllMocks());

  it('GET /api/auth/me requires auth', async () => {
    const app = await createApp(false);
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('GET /api/auth/me returns user when authenticated', async () => {
    mockStorage.getUser.mockResolvedValue({ id: 1, displayName: 'User' });
    const app = await createApp(true);
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.displayName).toBe('User');
  });

  it('GET /api/playlists returns playlists for user', async () => {
    const playlists = [{ id: 1, name: 'P1' }];
    mockStorage.getUserPlaylists.mockResolvedValue(playlists);
    const app = await createApp(true);
    const res = await request(app).get('/api/playlists');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(playlists);
  });

  it('GET /api/recent-prompts returns prompts for user', async () => {
    const prompts = [{ id: 1, prompt: 'hi' }];
    mockStorage.getRecentPrompts.mockResolvedValue(prompts);
    const app = await createApp(true);
    const res = await request(app).get('/api/recent-prompts');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(prompts);
  });
});
