import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { spotifyService } from "./services/spotify";
import { generatePlaylistFromPrompt, generateAdvancedPlaylistFromPrompt, modifyPlaylist } from "./services/openai";
import { PlaylistEditor } from "./services/playlist-editor";
import { z } from "zod";
import { franc } from "franc-min";

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

      // Generate playlist metadata with OpenAI
      const playlistData = await generatePlaylistFromPrompt({
        prompt,
        userId: user.id,
      });

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

      // Remove duplicates and limit to 25 tracks
      const uniqueTracks = tracks.filter((track, index, self) => 
        index === self.findIndex(t => t.id === track.id)
      ).slice(0, 25);

      // Create playlist in database
      const playlist = await storage.createPlaylist({
        userId: user.id,
        name: playlistData.name,
        description: playlistData.description,
        prompt,
        trackCount: uniqueTracks.length,
        isPublic: false,
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
        prompt,
        playlistId: playlist.id,
      });

      const fullPlaylist = await storage.getPlaylistWithTracks(playlist.id);
      res.json(fullPlaylist);
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
      const debugMode = !!config.debug;
      const debug: any = { filtersUsed: {}, rejected: [] };

      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const playlistData = await generateAdvancedPlaylistFromPrompt(config);

      const seedArtistIds: string[] = [];
      for (const name of (config.seedArtists || []).slice(0, 5)) {
        try {
          const results = await spotifyService.searchArtists(user.accessToken, name, 1);
          if (results[0]) seedArtistIds.push(results[0].id);
        } catch {}
      }

      const seedTrackIds: string[] = [];
      for (const name of (config.includeSpecificTracks || []).slice(0, 5)) {
        try {
          const results = await spotifyService.searchTracks(user.accessToken, name, 1);
          if (results[0]) seedTrackIds.push(results[0].id);
        } catch {}
      }

      interface RecommendationParams {
        limit: number;
        seed_artists: string[];
        seed_genres: string[];
        seed_tracks: string[];
        min_tempo: number;
        max_tempo: number;
        min_energy: number;
        max_energy: number;
        min_valence: number;
        max_valence: number;
        min_popularity: number;
        max_popularity: number;
      }

      const recParams: RecommendationParams = {
        limit: Math.min(100, (config.targetTrackCount || 20) * 2),
        seed_artists: seedArtistIds.slice(0, 5),
        seed_genres: (config.seedGenres || []).slice(0, 5 - seedArtistIds.length - seedTrackIds.length),
        seed_tracks: seedTrackIds.slice(0, 5 - seedArtistIds.length - (config.seedGenres || []).length),
        min_tempo: Math.max(0, (config.targetTempo || 120) - 20),
        max_tempo: Math.min(250, (config.targetTempo || 120) + 20),
        min_energy: Math.max(0, (config.targetEnergy || 0.5) - 0.2),
        max_energy: Math.min(1, (config.targetEnergy || 0.5) + 0.2),
        min_valence: Math.max(0, (config.targetValence || 0.5) - 0.2),
        max_valence: Math.min(1, (config.targetValence || 0.5) + 0.2),
        min_popularity: 0,
        max_popularity: config.popularityThreshold || 100,
      };

      debug.filtersUsed = recParams;

      const recommended = await spotifyService.getRecommendations(user.accessToken, recParams);

      const features = await spotifyService.getAudioFeatures(user.accessToken, recommended.map((t: any) => t.id));
      const featureMap: Record<string, any> = {};
      features.forEach(f => { if (f && f.id) featureMap[f.id] = f; });

      const finalTracks: any[] = [];
      const seen = new Set<string>();

      for (const track of recommended) {
        if (finalTracks.length >= (config.targetTrackCount || 20)) break;
        if (seen.has(track.id)) continue;
        seen.add(track.id);
        const f = featureMap[track.id];
        if (!f) continue;

        if (f.tempo < recParams.min_tempo || f.tempo > recParams.max_tempo) { debug.rejected.push({ id: track.id, reason: 'tempo' }); continue; }
        if (f.energy < recParams.min_energy || f.energy > recParams.max_energy) { debug.rejected.push({ id: track.id, reason: 'energy' }); continue; }
        if (f.valence < recParams.min_valence || f.valence > recParams.max_valence) { debug.rejected.push({ id: track.id, reason: 'valence' }); continue; }
        if (typeof track.popularity === 'number' && (track.popularity < recParams.min_popularity || track.popularity > recParams.max_popularity)) { debug.rejected.push({ id: track.id, reason: 'popularity' }); continue; }

        const releaseYear = parseInt((track.album as any).release_date?.slice(0,4) || '0', 10);
        if (config.yearRangeStart && releaseYear < config.yearRangeStart) { debug.rejected.push({ id: track.id, reason: 'year' }); continue; }
        if (config.yearRangeEnd && releaseYear > config.yearRangeEnd) { debug.rejected.push({ id: track.id, reason: 'year' }); continue; }

        const title = track.name.toLowerCase();
        if (/live|remix|sped up|slowed/.test(title)) { debug.rejected.push({ id: track.id, reason: 'title' }); continue; }

        if (config.languageSpecific) {
          const lang = franc(`${track.name} ${track.artists[0]?.name || ''}`);
          if (lang && lang !== 'und' && lang !== config.languageSpecific.slice(0,3).toLowerCase()) { debug.rejected.push({ id: track.id, reason: 'language' }); continue; }
        }

        finalTracks.push(track);
      }

      const playlist = await storage.createPlaylist({
        userId: user.id,
        name: config.name || playlistData.name,
        description: config.description || playlistData.description,
        prompt: config.prompt,
        trackCount: finalTracks.length,
        isPublic: false,
        ...config,
      });

      for (let i = 0; i < finalTracks.length; i++) {
        const track = finalTracks[i];
        const f = featureMap[track.id];
        await storage.addTrackToPlaylist({
          playlistId: playlist.id,
          spotifyId: track.id,
          name: track.name,
          artist: track.artists[0]?.name || 'Unknown Artist',
          album: track.album.name,
          duration: track.duration_ms,
          imageUrl: track.album.images[0]?.url || null,
          previewUrl: track.preview_url,
          position: i,
          energy: f?.energy,
          danceability: f?.danceability,
          acousticness: f?.acousticness,
          instrumentalness: f?.instrumentalness,
          liveness: f?.liveness,
          speechiness: f?.speechiness,
          valence: f?.valence,
          tempo: f?.tempo,
          audioKey: f?.key,
          musicalMode: f?.mode,
          loudness: f?.loudness,
          popularity: track.popularity,
          releaseDate: (track.album as any).release_date,
        });
      }

      await storage.addRecentPrompt({
        userId: user.id,
        prompt: config.prompt,
        playlistId: playlist.id,
      });

      const fullPlaylist = await storage.getPlaylistWithTracks(playlist.id);
      if (debugMode) {
        res.json({ ...fullPlaylist, debug });
      } else {
        res.json(fullPlaylist);
      }
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

  const httpServer = createServer(app);
  return httpServer;
}
