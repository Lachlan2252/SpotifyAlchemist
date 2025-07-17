// @ts-nocheck
import request from 'supertest';
import express from 'express';
import session from 'express-session';
import { jest } from '@jest/globals';

const getUser = jest.fn();
const createPlaylist = jest.fn();
const addTrackToPlaylist = jest.fn();
const addRecentPrompt = jest.fn();
const getPlaylistWithTracks = jest.fn();
const updatePlaylist = jest.fn();

jest.mock('../storage', () => ({
  storage: {
    getUser,
    createPlaylist,
    addTrackToPlaylist,
    addRecentPrompt,
    getPlaylistWithTracks,
    updatePlaylist,
  }
}));

const generatePlaylistFromPrompt = jest.fn();
const get_playlist_criteria_from_prompt = jest.fn();

jest.mock('../services/openai', () => ({
  generatePlaylistFromPrompt,
  generateAdvancedPlaylistFromPrompt: jest.fn(),
  modifyPlaylist: jest.fn(),
  get_playlist_criteria_from_prompt,
}));

const searchTracks = jest.fn();
const getRecommendations = jest.fn();
const getAudioFeaturesMap = jest.fn();

jest.mock('../services/spotify', () => ({
  spotifyService: {
    searchTracks,
    getRecommendations,
    getAudioFeaturesMap,
  }
}));

const processCommand = jest.fn();

jest.mock('../services/playlist-editor', () => ({
  PlaylistEditor: jest.fn().mockImplementation(() => ({ processCommand }))
}));

const parsePromptFilters = jest.fn().mockReturnValue({ noExplicit: false, noRap: false });
jest.mock('../utils/prompt', () => ({ parsePromptFilters }));

import { registerRoutes } from '../routes';

function createApp(auth = false) {
  const app = express();
  app.use(express.json());
  app.use(session({ secret: 'test', resave: false, saveUninitialized: false }));
  if (auth) {
    app.use((req, _res, next) => {
      req.session.userId = 1;
      next();
    });
  }
  return registerRoutes(app).then(() => app);
}

describe('playlist endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('generate playlist requires authentication', async () => {
    const app = await createApp(false);
    await request(app)
      .post('/api/playlists/generate')
      .send({ prompt: 'test' })
      .expect(401);
  });

  test('generate playlist success', async () => {
    getUser.mockResolvedValue({
      id: 1,
      spotifyId: 'u',
      accessToken: 'token',
    });
    generatePlaylistFromPrompt.mockResolvedValue({
      name: 'My Playlist',
      description: 'desc',
      searchQueries: ['query'],
      genre: 'Pop',
      mood: 'Happy',
      energy: 5,
    });
    get_playlist_criteria_from_prompt.mockResolvedValue({
      seed_genres: ['pop'],
      seed_artists: ['artist'],
      audio_features: {
        target_valence: 0.5,
        target_energy: 0.5,
        target_danceability: 0.5,
        target_tempo: 120,
      },
    });
    const track = {
      id: '1',
      name: 'Song1',
      artists: [{ name: 'Artist1' }],
      album: { name: 'Album1', images: [{ url: 'img' }] },
      duration_ms: 100000,
      preview_url: 'prev',
    };
    searchTracks.mockResolvedValue([track]);
    getRecommendations.mockResolvedValue([]);
    getAudioFeaturesMap.mockResolvedValue({ '1': { energy: 0.5, valence: 0.5, danceability: 0.5, tempo: 120 } });
    createPlaylist.mockResolvedValue({ id: 2, userId: 1, name: 'My Playlist', description: 'desc', prompt: 'test', trackCount: 1, isPublic: false });
    addTrackToPlaylist.mockResolvedValue({});
    addRecentPrompt.mockResolvedValue({});
    getPlaylistWithTracks.mockResolvedValue({ id: 2, userId: 1, name: 'My Playlist', description: 'desc', prompt: 'test', trackCount: 1, isPublic: false, tracks: [] });

    const app = await createApp(true);
    const res = await request(app)
      .post('/api/playlists/generate')
      .send({ prompt: 'test' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 2, userId: 1, name: 'My Playlist', description: 'desc', prompt: 'test', trackCount: 1, isPublic: false, tracks: [] });
  });

  test('edit playlist requires authentication', async () => {
    const app = await createApp(false);
    await request(app)
      .post('/api/playlists/2/edit')
      .send({ command: 'do something' })
      .expect(401);
  });

  test('edit playlist success', async () => {
    getPlaylistWithTracks.mockResolvedValue({ id: 2, userId: 1, tracks: [{ id: 1 }] });
    processCommand.mockResolvedValue({ tracks: [{ id: 1 }], explanation: 'ok', changes: ['c'] });
    updatePlaylist.mockResolvedValue(undefined);

    const app = await createApp(true);
    const res = await request(app)
      .post('/api/playlists/2/edit')
      .send({ command: 'do something' });
    expect(res.status).toBe(200);
    expect(processCommand).toHaveBeenCalled();
    expect(res.body.explanation).toBe('ok');
  });
});
