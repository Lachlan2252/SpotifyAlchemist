import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { spotifyService } from "./services/spotify";
import { generatePlaylistFromPrompt, generateAdvancedPlaylistFromPrompt, modifyPlaylist, get_playlist_criteria_from_prompt } from "./services/openai";
import { PlaylistEditor } from "./services/playlist-editor";
import { updateTrackSchema } from "@shared/schema";
import { z } from "zod";

// Extend express session to include userId
declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  const playlistEditor = new PlaylistEditor();
  // Spotify OAuth routes
  app.get("/api/auth/spotify", async (req, res) => {
    try {
      const authUrl = spotifyService.getAuthUrl();
      res.redirect(authUrl);
    } catch (error) {
      res.status(500).json({ message: "Failed to initiate Spotify authentication" });
    }
  });

  app.get("/callback", async (req, res) => {
    try {
      const { code } = req.query;
      if (!code) {
        return res.status(400).json({ message: "Authorization code not provided" });
      }

      const tokens = await spotifyService.exchangeCodeForTokens(code as string);
      const userProfile = await spotifyService.getUserProfile(tokens.access_token);

      const userData = {
        spotifyId: userProfile.id,
        displayName: userProfile.display_name,
        email: userProfile.email,
        imageUrl: userProfile.images[0]?.url || null,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      };

      const user = await storage.createOrUpdateUser(userData);
      
      // Set session
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

      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        id: user.id,
        displayName: user.displayName,
        email: user.email,
        imageUrl: user.imageUrl,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get user profile" });
    }
  });

  // Playlist generation routes
  const generatePlaylistSchema = z.object({
    prompt: z.string().min(1).max(500),
  });

  app.post("/api/playlists/generate", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { prompt } = generatePlaylistSchema.parse(req.body);
      
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const debug = req.query.debug === 'true';

      // Generate playlist metadata with OpenAI
      const playlistData = await generatePlaylistFromPrompt({
        prompt,
        userId: user.id,
      });
      const criteria = await get_playlist_criteria_from_prompt(prompt);

      // Search for tracks using Spotify API
      const tracks: any[] = [];
      for (const query of playlistData.searchQueries) {
        try {
          const searchResults = await spotifyService.searchTracks(user.accessToken, query, 3);
          tracks.push(...searchResults);
        } catch (error) {
          console.error(`Search failed for query: ${query}`, error);
        }
      }

      try {
        const recs = await spotifyService.getRecommendations(user.accessToken, {
          seed_artists: criteria.seed_artists.join(','),
          seed_genres: criteria.seed_genres.join(','),
          limit: 50,
          target_energy: criteria.audio_features.target_energy,
          target_danceability: criteria.audio_features.target_danceability,
          target_valence: criteria.audio_features.target_valence,
          target_tempo: criteria.audio_features.target_tempo,
        });
        tracks.push(...recs);
      } catch (err) {
        console.error('Recommendation fetch failed', err);
      }

      // Remove duplicates
      const deduped = tracks.filter((t, i, self) => i === self.findIndex(x => x.id === t.id));

      // Validate audio features
      const features = await spotifyService.getAudioFeaturesMap(user.accessToken, deduped.map(t => t.id));
      const filtered = deduped.filter(t => {
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
        afterFiltering: filtered.length,
      } : undefined;

      const finalTracks = filtered;

      // Create playlist in database
      const playlist = await storage.createPlaylist({
        userId: user.id,
        name: playlistData.name,
        description: playlistData.description,
        prompt,
        trackCount: finalTracks.length,
        isPublic: false,
      });

      // Add tracks to database
      for (let i = 0; i < finalTracks.length; i++) {
        const track = finalTracks[i];
        await storage.addTrackToPlaylist({
          playlistId: playlist.id,
          spotifyId: track.id,
          name: track.name,
          artist: track.artists[0]?.name || "Unknown Artist",
          album: track.album.name,
          duration: track.duration_ms,
          imageUrl: track.album.images[0]?.url || null,
          previewUrl: track.preview_url,
          position: i,
        });
      }

      // Save recent prompt
      await storage.addRecentPrompt({
        userId: user.id,
        prompt,
        playlistId: playlist.id,
      });

      const fullPlaylist = await storage.getPlaylistWithTracks(playlist.id);
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
      
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Generate playlist with advanced configuration
      const playlistData = await generateAdvancedPlaylistFromPrompt(config);

      // Search for tracks using Spotify API with advanced filters
      const tracks: any[] = [];
      for (const query of playlistData.searchQueries) {
        try {
          const searchResults = await spotifyService.searchTracks(user.accessToken, query, 5);
          tracks.push(...searchResults);
        } catch (error) {
          console.error(`Search failed for query: ${query}`, error);
        }
      }

      // Remove duplicates and apply advanced filtering
      const uniqueTracks = tracks.filter((track, index, self) => 
        index === self.findIndex(t => t.id === track.id)
      ).slice(0, config.targetTrackCount || 25);

      // Create playlist in database with advanced configuration
      const playlist = await storage.createPlaylist({
        userId: user.id,
        name: config.name || playlistData.name,
        description: config.description || playlistData.description,
        prompt: config.prompt,
        trackCount: uniqueTracks.length,
        isPublic: false,
        ...config, // Include all advanced configuration
      });

      // Add tracks to database
      for (let i = 0; i < uniqueTracks.length; i++) {
        const track = uniqueTracks[i];
        await storage.addTrackToPlaylist({
          playlistId: playlist.id,
          spotifyId: track.id,
          name: track.name,
          artist: track.artists[0]?.name || "Unknown Artist",
          album: track.album.name,
          duration: track.duration_ms,
          imageUrl: track.album.images[0]?.url || null,
          previewUrl: track.preview_url,
          position: i,
        });
      }

      // Save recent prompt
      await storage.addRecentPrompt({
        userId: user.id,
        prompt: config.prompt,
        playlistId: playlist.id,
      });

      const fullPlaylist = await storage.getPlaylistWithTracks(playlist.id);
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
      const user = await storage.getUser(req.session.userId);
      const playlist = await storage.getPlaylistWithTracks(playlistId);

      if (!user || !playlist || playlist.userId !== user.id) {
        return res.status(404).json({ message: "Playlist not found" });
      }

      // Create playlist on Spotify
      const spotifyPlaylist = await spotifyService.createPlaylist(
        user.accessToken,
        user.spotifyId,
        playlist.name,
        playlist.description || ""
      );

      // Add tracks to Spotify playlist
      if (playlist.tracks.length > 0) {
        const trackUris = playlist.tracks.map(track => `spotify:track:${track.spotifyId}`);
        await spotifyService.addTracksToPlaylist(user.accessToken, spotifyPlaylist.id, trackUris);
      }

      // Update playlist with Spotify ID
      await storage.updatePlaylist(playlistId, {
        spotifyId: spotifyPlaylist.id,
        imageUrl: spotifyPlaylist.images[0]?.url || null,
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

      const playlists = await storage.getUserPlaylists(req.session.userId);
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
      const playlist = await storage.getPlaylistWithTracks(playlistId);

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

      const prompts = await storage.getRecentPrompts(req.session.userId);
      res.json(prompts);
    } catch (error) {
      res.status(500).json({ message: "Failed to get recent prompts" });
    }
  });

  // Spotify data endpoints
  app.get("/api/spotify/playlists", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const playlists = await spotifyService.getUserPlaylists(user.accessToken);
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

      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const tracks = await spotifyService.getRecentlyPlayed(user.accessToken);
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

      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const playlistId = req.params.id;
      const tracks = await spotifyService.getPlaylistTracks(user.accessToken, playlistId);
      res.json(tracks);
    } catch (error) {
      console.error("Get playlist tracks error:", error);
      res.status(500).json({ message: "Failed to get playlist tracks" });
    }
  });

  // Playlist editing endpoint
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

      const playlist = await storage.getPlaylistWithTracks(playlistId);
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

      // Update playlist metadata
      await storage.updatePlaylist(playlistId, {
        trackCount: result.tracks.length,
      });

      // For now, we'll return the result without updating individual tracks
      // In a full implementation, we'd need to update the tracks table

      res.json({
        playlist: {
          ...playlist,
          tracks: result.tracks,
          updatedAt: new Date(),
        },
        explanation: result.explanation,
        changes: result.changes,
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
      const { tracks } = req.body as { tracks: unknown[] };

      if (!Array.isArray(tracks)) {
        return res.status(400).json({ message: "Tracks must be an array" });
      }

      const playlist = await storage.getPlaylistWithTracks(playlistId);
      if (!playlist || playlist.userId !== req.session.userId) {
        return res.status(404).json({ message: "Playlist not found" });
      }

      for (const trackData of tracks) {
        const parsed = updateTrackSchema.parse(trackData);
        const { id, ...updates } = parsed;
        await storage.updateTrack(id, updates);
      }

      const updatedPlaylist = await storage.getPlaylistWithTracks(playlistId);
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
      const playlist = await storage.getPlaylistWithTracks(playlistId);
      if (!playlist || playlist.userId !== req.session.userId) {
        return res.status(404).json({ message: "Playlist not found" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const chunks = [] as string[][];
      for (let i = 0; i < playlist.tracks.length; i += 100) {
        chunks.push(playlist.tracks.slice(i, i + 100).map(t => t.spotifyId));
      }

      for (const chunk of chunks) {
        const features = await spotifyService.getAudioFeatures(user.accessToken, chunk);
        for (const feat of features) {
          if (!feat) continue;
          const track = playlist.tracks.find(t => t.spotifyId === feat.id);
          if (!track) continue;
          await storage.updateTrack(track.id, {
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
            loudness: feat.loudness,
          });
        }
      }

      const updatedPlaylist = await storage.getPlaylistWithTracks(playlistId);
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
      const playlist = await storage.getPlaylistWithTracks(playlistId);
      if (!playlist || playlist.userId !== req.session.userId) {
        return res.status(404).json({ message: "Playlist not found" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const currentTracks = playlist.tracks.map(t => ({
        name: t.name,
        artist: t.artist,
        album: t.album,
      }));

      const ai = await modifyPlaylist({
        action: "add_similar",
        currentTracks,
      });

      const newTracks: any[] = [];
      const existing = new Set(playlist.tracks.map(t => t.spotifyId));
      for (const query of (ai.searchQueries ?? []).slice(0, 5)) {
        const results = await spotifyService.searchTracks(user.accessToken, query, 3);
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
        await storage.addTrackToPlaylist({
          playlistId,
          spotifyId: track.id,
          name: track.name,
          artist: track.artists[0]?.name || "Unknown Artist",
          album: track.album.name,
          duration: track.duration_ms,
          imageUrl: track.album.images[0]?.url || null,
          previewUrl: track.preview_url,
          position: startPos + i,
        });
      }

      await storage.updatePlaylist(playlistId, { trackCount: startPos + newTracks.length });

      const updated = await storage.getPlaylistWithTracks(playlistId);
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
      const playlist = await storage.getPlaylistWithTracks(playlistId);
      if (!playlist || playlist.userId !== req.session.userId) {
        return res.status(404).json({ message: "Playlist not found" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const currentTracks = playlist.tracks.map(t => ({
        name: t.name,
        artist: t.artist,
        album: t.album,
      }));

      const ai = await modifyPlaylist({
        action: "replace_overplayed",
        currentTracks,
      });

      const removals = (ai.trackRemovals ?? []).sort((a, b) => b - a);
      for (const index of removals) {
        const track = playlist.tracks[index];
        if (track) {
          await storage.removeTrackFromPlaylist(playlistId, track.id);
        }
      }

      let updated = await storage.getPlaylistWithTracks(playlistId);
      if (!updated) throw new Error("Playlist disappeared");
      for (let i = 0; i < updated.tracks.length; i++) {
        await storage.updateTrack(updated.tracks[i].id, { position: i });
      }

      const newTracks: any[] = [];
      const existing = new Set(updated.tracks.map(t => t.spotifyId));
      for (const query of (ai.searchQueries ?? []).slice(0, 5)) {
        const results = await spotifyService.searchTracks(user.accessToken, query, 3);
        for (const track of results) {
          if (!existing.has(track.id)) {
            newTracks.push(track);
            existing.add(track.id);
          }
          if (newTracks.length >= removals.length) break;
        }
        if (newTracks.length >= removals.length) break;
      }

      const startPos = updated.tracks.length;
      for (let i = 0; i < newTracks.length; i++) {
        const track = newTracks[i];
        await storage.addTrackToPlaylist({
          playlistId,
          spotifyId: track.id,
          name: track.name,
          artist: track.artists[0]?.name || "Unknown Artist",
          album: track.album.name,
          duration: track.duration_ms,
          imageUrl: track.album.images[0]?.url || null,
          previewUrl: track.preview_url,
          position: startPos + i,
        });
      }

      await storage.updatePlaylist(playlistId, { trackCount: startPos + newTracks.length });

      updated = await storage.getPlaylistWithTracks(playlistId);
      res.json({ playlist: updated, reasoning: ai.reasoning });
    } catch (error) {
      console.error("Replace overplayed error:", error);
      res.status(500).json({ message: "Failed to replace overplayed songs" });
    }
  });

  app.post("/api/playlists/:id/reorder-by-mood", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const playlistId = parseInt(req.params.id);
      const playlist = await storage.getPlaylistWithTracks(playlistId);
      if (!playlist || playlist.userId !== req.session.userId) {
        return res.status(404).json({ message: "Playlist not found" });
      }

      const currentTracks = playlist.tracks.map(t => ({
        name: t.name,
        artist: t.artist,
        album: t.album,
      }));

      const ai = await modifyPlaylist({
        action: "reorder_by_mood",
        currentTracks,
      });

      const order = ai.reorderedPositions ?? [];
      if (order.length === playlist.tracks.length) {
        for (let i = 0; i < order.length; i++) {
          const track = playlist.tracks[order[i]];
          if (track) {
            await storage.updateTrack(track.id, { position: i });
          }
        }
      }

      const updated = await storage.getPlaylistWithTracks(playlistId);
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
      const { prompt } = req.body as { prompt: string };
      const playlist = await storage.getPlaylistWithTracks(playlistId);
      if (!playlist || playlist.userId !== req.session.userId) {
        return res.status(404).json({ message: "Playlist not found" });
      }

      const currentTracks = playlist.tracks.map(t => ({
        name: t.name,
        artist: t.artist,
        album: t.album,
      }));

      const ai = await modifyPlaylist({
        action: "follow_up",
        currentTracks,
        prompt,
      });

      await storage.addRecentPrompt({
        userId: req.session.userId,
        prompt,
        playlistId,
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
      const format = (req.query.format as string) || "json";
      const playlist = await storage.getPlaylistWithTracks(playlistId);
      if (!playlist || playlist.userId !== req.session.userId) {
        return res.status(404).json({ message: "Playlist not found" });
      }

      if (format === "csv") {
        const header = "name,artist,album\n";
        const rows = playlist.tracks.map(t => `${t.name.replace(/,/g, '')},${t.artist.replace(/,/g, '')},${t.album.replace(/,/g, '')}`).join("\n");
        res.type("text/csv").send(header + rows);
      } else if (format === "txt") {
        const lines = playlist.tracks.map(t => `${t.name} - ${t.artist}`).join("\n");
        res.type("text/plain").send(lines);
      } else {
        res.json(playlist);
      }
    } catch (error) {
      console.error("Export playlist error:", error);
      res.status(500).json({ message: "Failed to export playlist" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
