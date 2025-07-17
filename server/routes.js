"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var routes_exports = {};
__export(routes_exports, {
  registerRoutes: () => registerRoutes
});
module.exports = __toCommonJS(routes_exports);
var import_http = require("http");
var import_storage = require("./storage");
var import_spotify = require("./services/spotify");
var import_openai = require("./services/openai");
var import_playlist_editor = require("./services/playlist-editor");
var import_schema = require("@shared/schema");
var import_zod = require("zod");
async function registerRoutes(app) {
  const playlistEditor = new import_playlist_editor.PlaylistEditor();
  app.get("/api/auth/spotify", async (req, res) => {
    try {
      const authUrl = import_spotify.spotifyService.getAuthUrl();
      res.redirect(authUrl);
    } catch (error) {
      res.status(500).json({ message: "Failed to initiate Spotify authentication" });
    }
  });
  app.get("/api/auth/spotify/callback", async (req, res) => {
    try {
      const { code } = req.query;
      if (!code) {
        return res.status(400).json({ message: "Authorization code not provided" });
      }
      const tokens = await import_spotify.spotifyService.exchangeCodeForTokens(code);
      const userProfile = await import_spotify.spotifyService.getUserProfile(tokens.access_token);
      const userData = {
        spotifyId: userProfile.id,
        displayName: userProfile.display_name,
        email: userProfile.email,
        imageUrl: userProfile.images[0]?.url || null,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1e3)
      };
      const user = await import_storage.storage.createOrUpdateUser(userData);
      req.session.userId = user.id;
      res.redirect("/?auth=success");
    } catch (error) {
      console.error("Spotify auth error:", error);
      res.redirect("/?auth=error");
    }
  });
  app.get("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out successfully" });
    });
  });
  app.get("/api/auth/me", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const user = await import_storage.storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({
        id: user.id,
        displayName: user.displayName,
        email: user.email,
        imageUrl: user.imageUrl
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get user profile" });
    }
  });
  app.get("/api/preferences", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const prefs = await import_storage.storage.getUserPreferences(req.session.userId);
      res.json(prefs || {});
    } catch (error) {
      res.status(500).json({ message: "Failed to load preferences" });
    }
  });
  app.put("/api/preferences", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const prefs = req.body;
      const updated = await import_storage.storage.setUserPreferences(req.session.userId, prefs);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update preferences" });
    }
  });
  app.post("/api/assistant", async (req, res) => {
    try {
      const { message } = import_zod.z.object({ message: import_zod.z.string().min(1).max(500) }).parse(req.body);
      const reply = await (0, import_openai.assistantExplainFeatures)(message);
      res.json({ response: reply });
    } catch (error) {
      console.error("Assistant error:", error);
      res.status(500).json({ message: "Failed to generate assistant response" });
    }
  });
  app.get("/api/prompts/suggest", async (req, res) => {
    try {
      const text = import_zod.z.string().min(1).max(100).parse(req.query.text);
      const suggestions = await (0, import_openai.suggestPromptCompletions)(text);
      res.json({ suggestions });
    } catch (error) {
      console.error("Prompt suggest error:", error);
      res.status(500).json({ message: "Failed to get suggestions" });
    }
  });
  const generatePlaylistSchema = import_zod.z.object({
    prompt: import_zod.z.string().min(1).max(500)
  });
  app.post("/api/playlists/generate", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const { prompt } = generatePlaylistSchema.parse(req.body);
      const user = await import_storage.storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const userPrefs = await import_storage.storage.getUserPreferences(user.id);
      const debug = req.query.debug === "true";
      const playlistData = await (0, import_openai.generatePlaylistFromPrompt)({
        prompt,
        userId: user.id,
        preferences: userPrefs || void 0
      });
      const criteria = await (0, import_openai.get_playlist_criteria_from_prompt)(prompt);
      const tracks = [];
      for (const query of playlistData.searchQueries) {
        try {
          const searchResults = await import_spotify.spotifyService.searchTracks(user.accessToken, query, 3);
          tracks.push(...searchResults);
        } catch (error) {
          console.error(`Search failed for query: ${query}`, error);
        }
      }
      try {
        const recs = await import_spotify.spotifyService.getRecommendations(user.accessToken, {
          seed_artists: criteria.seed_artists.join(","),
          seed_genres: criteria.seed_genres.join(","),
          limit: 50,
          target_energy: criteria.audio_features.target_energy,
          target_danceability: criteria.audio_features.target_danceability,
          target_valence: criteria.audio_features.target_valence,
          target_tempo: criteria.audio_features.target_tempo
        });
        tracks.push(...recs);
      } catch (err) {
        console.error("Recommendation fetch failed", err);
      }
      const deduped = tracks.filter((t, i, self) => i === self.findIndex((x) => x.id === t.id));
      const features = await import_spotify.spotifyService.getAudioFeaturesMap(user.accessToken, deduped.map((t) => t.id));
      const filtered = deduped.filter((t) => {
        const af = features[t.id];
        if (!af) return true;
        if (Math.abs(af.energy - criteria.audio_features.target_energy) > 0.3) return false;
        if (Math.abs(af.valence - criteria.audio_features.target_valence) > 0.4) return false;
        if (Math.abs(af.danceability - criteria.audio_features.target_danceability) > 0.3) return false;
        if (Math.abs(af.tempo - criteria.audio_features.target_tempo) > 20) return false;
        const name = t.name.toLowerCase();
        if (/(remix|remaster|live|sped|edit)/.test(name)) return false;
        return true;
      }).slice(0, 25);
      const debugInfo = debug ? {
        criteria,
        initial: tracks.length,
        afterDedup: deduped.length,
        afterFiltering: filtered.length
      } : void 0;
      const finalTracks = filtered;
      const playlist = await import_storage.storage.createPlaylist({
        userId: user.id,
        name: playlistData.name,
        description: playlistData.description,
        prompt,
        trackCount: finalTracks.length,
        isPublic: false
      });
      for (let i = 0; i < finalTracks.length; i++) {
        const track = finalTracks[i];
        await import_storage.storage.addTrackToPlaylist({
          playlistId: playlist.id,
          spotifyId: track.id,
          name: track.name,
          artist: track.artists[0]?.name || "Unknown Artist",
          album: track.album.name,
          duration: track.duration_ms,
          imageUrl: track.album.images[0]?.url || null,
          previewUrl: track.preview_url,
          position: i
        });
      }
      await import_storage.storage.addRecentPrompt({
        userId: user.id,
        prompt,
        playlistId: playlist.id
      });
      const fullPlaylist = await import_storage.storage.getPlaylistWithTracks(playlist.id);
      if (debugInfo) {
        res.json({ ...fullPlaylist, debugInfo });
      } else {
        res.json(fullPlaylist);
      }
    } catch (error) {
      console.error("Generate playlist error:", error);
      res.status(500).json({ message: "Failed to generate playlist" });
    }
  });
  app.post("/api/playlists/generate-advanced", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const config = req.body;
      const user = await import_storage.storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const userPrefs = await import_storage.storage.getUserPreferences(user.id);
      const playlistData = await (0, import_openai.generateAdvancedPlaylistFromPrompt)(config, userPrefs || void 0);
      const tracks = [];
      for (const query of playlistData.searchQueries) {
        try {
          const searchResults = await import_spotify.spotifyService.searchTracks(user.accessToken, query, 5);
          tracks.push(...searchResults);
        } catch (error) {
          console.error(`Search failed for query: ${query}`, error);
        }
      }
      const uniqueTracks = tracks.filter(
        (track, index, self) => index === self.findIndex((t) => t.id === track.id)
      ).slice(0, config.targetTrackCount || 25);
      const playlist = await import_storage.storage.createPlaylist({
        userId: user.id,
        name: config.name || playlistData.name,
        description: config.description || playlistData.description,
        prompt: config.prompt,
        trackCount: uniqueTracks.length,
        isPublic: false,
        ...config
        // Include all advanced configuration
      });
      for (let i = 0; i < uniqueTracks.length; i++) {
        const track = uniqueTracks[i];
        await import_storage.storage.addTrackToPlaylist({
          playlistId: playlist.id,
          spotifyId: track.id,
          name: track.name,
          artist: track.artists[0]?.name || "Unknown Artist",
          album: track.album.name,
          duration: track.duration_ms,
          imageUrl: track.album.images[0]?.url || null,
          previewUrl: track.preview_url,
          position: i
        });
      }
      await import_storage.storage.addRecentPrompt({
        userId: user.id,
        prompt: config.prompt,
        playlistId: playlist.id
      });
      const fullPlaylist = await import_storage.storage.getPlaylistWithTracks(playlist.id);
      res.json(fullPlaylist);
    } catch (error) {
      console.error("Generate advanced playlist error:", error);
      res.status(500).json({ message: "Failed to generate advanced playlist" });
    }
  });
  app.post("/api/playlists/:id/save-to-spotify", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const playlistId = parseInt(req.params.id);
      const user = await import_storage.storage.getUser(req.session.userId);
      const playlist = await import_storage.storage.getPlaylistWithTracks(playlistId);
      if (!user || !playlist || playlist.userId !== user.id) {
        return res.status(404).json({ message: "Playlist not found" });
      }
      const spotifyPlaylist = await import_spotify.spotifyService.createPlaylist(
        user.accessToken,
        user.spotifyId,
        playlist.name,
        playlist.description || ""
      );
      if (playlist.tracks.length > 0) {
        const trackUris = playlist.tracks.map((track) => `spotify:track:${track.spotifyId}`);
        await import_spotify.spotifyService.addTracksToPlaylist(user.accessToken, spotifyPlaylist.id, trackUris);
      }
      await import_storage.storage.updatePlaylist(playlistId, {
        spotifyId: spotifyPlaylist.id,
        imageUrl: spotifyPlaylist.images[0]?.url || null
      });
      res.json({ message: "Playlist saved to Spotify successfully", spotifyId: spotifyPlaylist.id });
    } catch (error) {
      console.error("Save to Spotify error:", error);
      res.status(500).json({ message: "Failed to save playlist to Spotify" });
    }
  });
  app.get("/api/playlists", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const playlists = await import_storage.storage.getUserPlaylists(req.session.userId);
      res.json(playlists);
    } catch (error) {
      res.status(500).json({ message: "Failed to get playlists" });
    }
  });
  app.get("/api/playlists/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const playlistId = parseInt(req.params.id);
      const playlist = await import_storage.storage.getPlaylistWithTracks(playlistId);
      if (!playlist || playlist.userId !== req.session.userId) {
        return res.status(404).json({ message: "Playlist not found" });
      }
      res.json(playlist);
    } catch (error) {
      res.status(500).json({ message: "Failed to get playlist" });
    }
  });
  app.get("/api/recent-prompts", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const prompts = await import_storage.storage.getRecentPrompts(req.session.userId);
      res.json(prompts);
    } catch (error) {
      res.status(500).json({ message: "Failed to get recent prompts" });
    }
  });
  app.get("/api/spotify/playlists", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const user = await import_storage.storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const playlists = await import_spotify.spotifyService.getUserPlaylists(user.accessToken);
      res.json(playlists);
    } catch (error) {
      console.error("Get Spotify playlists error:", error);
      res.status(500).json({ message: "Failed to get Spotify playlists" });
    }
  });
  app.get("/api/spotify/recently-played", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const user = await import_storage.storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const tracks = await import_spotify.spotifyService.getRecentlyPlayed(user.accessToken);
      res.json(tracks);
    } catch (error) {
      console.error("Get recently played error:", error);
      res.status(500).json({ message: "Failed to get recently played tracks" });
    }
  });
  app.get("/api/spotify/playlist/:id/tracks", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const user = await import_storage.storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const playlistId = req.params.id;
      const tracks = await import_spotify.spotifyService.getPlaylistTracks(user.accessToken, playlistId);
      res.json(tracks);
    } catch (error) {
      console.error("Get playlist tracks error:", error);
      res.status(500).json({ message: "Failed to get playlist tracks" });
    }
  });
  app.post("/api/playlists/:id/edit", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const { command, userPreferences } = req.body;
      const playlistId = parseInt(req.params.id);
      if (!command) {
        return res.status(400).json({ message: "Command is required" });
      }
      const playlist = await import_storage.storage.getPlaylistWithTracks(playlistId);
      if (!playlist) {
        return res.status(404).json({ message: "Playlist not found" });
      }
      if (playlist.userId !== req.session.userId) {
        return res.status(403).json({ message: "Not authorized to edit this playlist" });
      }
      const result = await playlistEditor.processCommand({
        tracks: playlist.tracks,
        command,
        userPreferences
      });
      await import_storage.storage.updatePlaylist(playlistId, {
        trackCount: result.tracks.length
      });
      res.json({
        playlist: {
          ...playlist,
          tracks: result.tracks,
          updatedAt: /* @__PURE__ */ new Date()
        },
        explanation: result.explanation,
        changes: result.changes
      });
    } catch (error) {
      console.error("Playlist edit error:", error);
      res.status(500).json({ message: "Failed to edit playlist" });
    }
  });
  app.put("/api/playlists/:id/tracks", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const playlistId = parseInt(req.params.id);
      const { tracks } = req.body;
      if (!Array.isArray(tracks)) {
        return res.status(400).json({ message: "Tracks must be an array" });
      }
      const playlist = await import_storage.storage.getPlaylistWithTracks(playlistId);
      if (!playlist || playlist.userId !== req.session.userId) {
        return res.status(404).json({ message: "Playlist not found" });
      }
      for (const trackData of tracks) {
        const parsed = import_schema.updateTrackSchema.parse(trackData);
        const { id, ...updates } = parsed;
        await import_storage.storage.updateTrack(id, updates);
      }
      const updatedPlaylist = await import_storage.storage.getPlaylistWithTracks(playlistId);
      res.json(updatedPlaylist);
    } catch (error) {
      console.error("Update playlist tracks error:", error);
      res.status(500).json({ message: "Failed to update playlist tracks" });
    }
  });
  app.post("/api/playlists/:id/audio-features", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const playlistId = parseInt(req.params.id);
      const playlist = await import_storage.storage.getPlaylistWithTracks(playlistId);
      if (!playlist || playlist.userId !== req.session.userId) {
        return res.status(404).json({ message: "Playlist not found" });
      }
      const user = await import_storage.storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const chunks = [];
      for (let i = 0; i < playlist.tracks.length; i += 100) {
        chunks.push(playlist.tracks.slice(i, i + 100).map((t) => t.spotifyId));
      }
      for (const chunk of chunks) {
        const features = await import_spotify.spotifyService.getAudioFeatures(user.accessToken, chunk);
        for (const feat of features) {
          if (!feat) continue;
          const track = playlist.tracks.find((t) => t.spotifyId === feat.id);
          if (!track) continue;
          await import_storage.storage.updateTrack(track.id, {
            energy: feat.energy,
            danceability: feat.danceability,
            acousticness: feat.acousticness,
            instrumentalness: feat.instrumentalness,
            liveness: feat.liveness,
            speechiness: feat.speechiness,
            valence: feat.valence,
            tempo: feat.tempo,
            audioKey: feat.key,
            musicalMode: feat.mode,
            loudness: feat.loudness
          });
        }
      }
      const updatedPlaylist = await import_storage.storage.getPlaylistWithTracks(playlistId);
      res.json(updatedPlaylist);
    } catch (error) {
      console.error("Get audio features error:", error);
      res.status(500).json({ message: "Failed to load audio features" });
    }
  });
  app.post("/api/playlists/:id/add-similar", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const playlistId = parseInt(req.params.id);
      const playlist = await import_storage.storage.getPlaylistWithTracks(playlistId);
      if (!playlist || playlist.userId !== req.session.userId) {
        return res.status(404).json({ message: "Playlist not found" });
      }
      const user = await import_storage.storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const currentTracks = playlist.tracks.map((t) => ({
        name: t.name,
        artist: t.artist,
        album: t.album
      }));
      const ai = await (0, import_openai.modifyPlaylist)({
        action: "add_similar",
        currentTracks
      });
      const newTracks = [];
      const existing = new Set(playlist.tracks.map((t) => t.spotifyId));
      for (const query of (ai.searchQueries ?? []).slice(0, 5)) {
        const results = await import_spotify.spotifyService.searchTracks(user.accessToken, query, 3);
        for (const track of results) {
          if (!existing.has(track.id)) {
            newTracks.push(track);
            existing.add(track.id);
          }
          if (newTracks.length >= 10) break;
        }
        if (newTracks.length >= 10) break;
      }
      const startPos = playlist.tracks.length;
      for (let i = 0; i < newTracks.length; i++) {
        const track = newTracks[i];
        await import_storage.storage.addTrackToPlaylist({
          playlistId,
          spotifyId: track.id,
          name: track.name,
          artist: track.artists[0]?.name || "Unknown Artist",
          album: track.album.name,
          duration: track.duration_ms,
          imageUrl: track.album.images[0]?.url || null,
          previewUrl: track.preview_url,
          position: startPos + i
        });
      }
      await import_storage.storage.updatePlaylist(playlistId, { trackCount: startPos + newTracks.length });
      const updated = await import_storage.storage.getPlaylistWithTracks(playlistId);
      res.json({ playlist: updated, reasoning: ai.reasoning });
    } catch (error) {
      console.error("Add similar songs error:", error);
      res.status(500).json({ message: "Failed to add similar songs" });
    }
  });
  app.post("/api/playlists/:id/replace-overplayed", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const playlistId = parseInt(req.params.id);
      const playlist = await import_storage.storage.getPlaylistWithTracks(playlistId);
      if (!playlist || playlist.userId !== req.session.userId) {
        return res.status(404).json({ message: "Playlist not found" });
      }
      const user = await import_storage.storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const currentTracks = playlist.tracks.map((t) => ({
        name: t.name,
        artist: t.artist,
        album: t.album
      }));
      const ai = await (0, import_openai.modifyPlaylist)({
        action: "replace_overplayed",
        currentTracks
      });
      const removals = (ai.trackRemovals ?? []).sort((a, b) => b - a);
      for (const index of removals) {
        const track = playlist.tracks[index];
        if (track) {
          await import_storage.storage.removeTrackFromPlaylist(playlistId, track.id);
        }
      }
      const newTracks = [];
      for (const query of (ai.searchQueries ?? []).slice(0, removals.length)) {
        const results = await import_spotify.spotifyService.searchTracks(user.accessToken, query, 3);
        if (results.length > 0) {
          newTracks.push(results[0]);
        }
        if (newTracks.length >= removals.length) break;
      }
      let trackList = [...playlist.tracks];
      for (let i = 0; i < removals.length && i < newTracks.length; i++) {
        const oldTrack = trackList[removals[i]];
        const newTrack = newTracks[i];
        if (oldTrack && newTrack) {
          await import_storage.storage.updateTrack(oldTrack.id, {
            spotifyId: newTrack.id,
            name: newTrack.name,
            artist: newTrack.artists[0]?.name || "Unknown Artist",
            album: newTrack.album.name,
            duration: newTrack.duration_ms,
            imageUrl: newTrack.album.images[0]?.url || null,
            previewUrl: newTrack.preview_url
          });
        }
      }
      const updated = await import_storage.storage.getPlaylistWithTracks(playlistId);
      res.json({ playlist: updated, reasoning: ai.reasoning });
    } catch (error) {
      console.error("Replace overplayed error:", error);
      res.status(500).json({ message: "Failed to replace overplayed tracks" });
    }
  });
  app.get("/api/user/preferences", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const preferences = await import_storage.storage.getUserPreferences(req.session.userId);
      res.json(preferences || {
        favoriteGenres: [],
        favoriteArtists: [],
        avoidArtists: [],
        bannedSongs: [],
        preferredBpmRange: [60, 200],
        preferredDecades: [],
        preferredEra: "",
        avoidExplicit: false,
        preferredLanguages: [],
        bannedTerms: [],
        bannedGenres: []
      });
    } catch (error) {
      console.error("Get preferences error:", error);
      res.status(500).json({ message: "Failed to get preferences" });
    }
  });
  app.get("/api/preferences", async (req, res) => {
    return app._router.handle(req, res, () => {
      req.url = "/api/user/preferences";
      app._router.handle(req, res);
    });
  });
  app.put("/api/user/preferences", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      await import_storage.storage.updateUserPreferences(req.session.userId, req.body);
      const updated = await import_storage.storage.getUserPreferences(req.session.userId);
      res.json(updated);
    } catch (error) {
      console.error("Update preferences error:", error);
      res.status(500).json({ message: "Failed to update preferences" });
    }
  });
  app.put("/api/preferences", async (req, res) => {
    return app._router.handle(req, res, () => {
      req.url = "/api/user/preferences";
      app._router.handle(req, res);
    });
  });
  app.post("/api/assistant", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const { message } = req.body;
      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }
      const response = await generateCompletion(
        `You are a helpful music assistant. Answer questions about playlists, music genres, artists, and help users with the Promptify app features. Be concise and friendly.`,
        message
      );
      res.json({ response });
    } catch (error) {
      console.error("Assistant error:", error);
      res.status(500).json({ message: "Failed to get assistant response" });
    }
  });
  app.get("/api/prompts/suggest", async (req, res) => {
    try {
      const { text } = req.query;
      if (!text || typeof text !== "string") {
        return res.json({ suggestions: [] });
      }
      const suggestions = await generateCompletion(
        `You are a playlist prompt suggestion engine. Given the user's partial prompt, suggest 3-5 creative and specific playlist prompts that complete or enhance their idea. Return only a JSON array of strings.`,
        `Partial prompt: "${text}"`
      );
      try {
        const parsed = JSON.parse(suggestions);
        res.json({ suggestions: Array.isArray(parsed) ? parsed : [] });
      } catch {
        res.json({ suggestions: [] });
      }
    } catch (error) {
      console.error("Prompt suggestions error:", error);
      res.json({ suggestions: [] });
    }
  });
  app.post("/api/playlists/:id/reorder-by-mood", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const playlistId = parseInt(req.params.id);
      const playlist = await import_storage.storage.getPlaylistWithTracks(playlistId);
      if (!playlist || playlist.userId !== req.session.userId) {
        return res.status(404).json({ message: "Playlist not found" });
      }
      const currentTracks = playlist.tracks.map((t) => ({
        name: t.name,
        artist: t.artist,
        album: t.album
      }));
      const ai = await (0, import_openai.modifyPlaylist)({
        action: "reorder_by_mood",
        currentTracks
      });
      const order = ai.reorderedPositions ?? [];
      if (order.length === playlist.tracks.length) {
        for (let i = 0; i < order.length; i++) {
          const track = playlist.tracks[order[i]];
          if (track) {
            await import_storage.storage.updateTrack(track.id, { position: i });
          }
        }
      }
      const updated = await import_storage.storage.getPlaylistWithTracks(playlistId);
      res.json({ playlist: updated, reasoning: ai.reasoning });
    } catch (error) {
      console.error("Reorder by mood error:", error);
      res.status(500).json({ message: "Failed to reorder playlist" });
    }
  });
  app.post("/api/playlists/:id/follow-up", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const playlistId = parseInt(req.params.id);
      const { prompt } = req.body;
      const playlist = await import_storage.storage.getPlaylistWithTracks(playlistId);
      if (!playlist || playlist.userId !== req.session.userId) {
        return res.status(404).json({ message: "Playlist not found" });
      }
      const currentTracks = playlist.tracks.map((t) => ({
        name: t.name,
        artist: t.artist,
        album: t.album
      }));
      const ai = await (0, import_openai.modifyPlaylist)({
        action: "follow_up",
        currentTracks,
        prompt
      });
      await import_storage.storage.addRecentPrompt({
        userId: req.session.userId,
        prompt,
        playlistId
      });
      res.json(ai);
    } catch (error) {
      console.error("Follow-up prompt error:", error);
      res.status(500).json({ message: "Failed to process follow-up" });
    }
  });
  app.get("/api/playlists/:id/export", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const playlistId = parseInt(req.params.id);
      const format = req.query.format || "json";
      const playlist = await import_storage.storage.getPlaylistWithTracks(playlistId);
      if (!playlist || playlist.userId !== req.session.userId) {
        return res.status(404).json({ message: "Playlist not found" });
      }
      if (format === "csv") {
        const header = "name,artist,album\n";
        const rows = playlist.tracks.map((t) => `${t.name.replace(/,/g, "")},${t.artist.replace(/,/g, "")},${t.album.replace(/,/g, "")}`).join("\n");
        res.type("text/csv").send(header + rows);
      } else if (format === "txt") {
        const lines = playlist.tracks.map((t) => `${t.name} - ${t.artist}`).join("\n");
        res.type("text/plain").send(lines);
      } else {
        res.json(playlist);
      }
    } catch (error) {
      console.error("Export playlist error:", error);
      res.status(500).json({ message: "Failed to export playlist" });
    }
  });
  const httpServer = (0, import_http.createServer)(app);
  return httpServer;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  registerRoutes
});
