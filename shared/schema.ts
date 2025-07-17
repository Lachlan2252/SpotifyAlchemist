import { pgTable, text, serial, integer, boolean, timestamp, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  spotifyId: text("spotify_id").notNull().unique(),
  displayName: text("display_name").notNull(),
  email: text("email"),
  imageUrl: text("image_url"),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  tokenExpiresAt: timestamp("token_expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const playlists = pgTable("playlists", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  spotifyId: text("spotify_id"),
  name: text("name").notNull(),
  description: text("description"),
  prompt: text("prompt").notNull(),
  imageUrl: text("image_url"),
  trackCount: integer("track_count").default(0),
  isPublic: boolean("is_public").default(false),
  
  // Vibe & Theme Controls
  vibe: text("vibe"),
  mood: text("mood"),
  scene: text("scene"),
  energyScale: integer("energy_scale"),
  darknessScale: integer("darkness_scale"),
  emotionalTone: text("emotional_tone"),
  
  // Audio Features
  targetEnergy: real("target_energy"),
  targetDanceability: real("target_danceability"),
  targetAcousticness: real("target_acousticness"),
  targetInstrumentalness: real("target_instrumentalness"),
  targetLiveness: real("target_liveness"),
  targetSpeechiness: real("target_speechiness"),
  targetValence: real("target_valence"),
  targetTempo: integer("target_tempo"),
  audioKey: text("audio_key"),
  musicalMode: text("musical_mode"),
  
  // Time & Era
  decadeFilter: jsonb("decade_filter"),
  yearRangeStart: integer("year_range_start"),
  yearRangeEnd: integer("year_range_end"),
  onlyNewMusic: boolean("only_new_music").default(false),
  onlyThrowbacks: boolean("only_throwbacks").default(false),
  mixedEra: boolean("mixed_era").default(false),
  
  // Artist/Track/Genre Controls
  seedArtists: jsonb("seed_artists"),
  seedGenres: jsonb("seed_genres"),
  includeSpecificTracks: jsonb("include_specific_tracks"),
  excludeArtists: jsonb("exclude_artists"),
  excludeGenres: jsonb("exclude_genres"),
  excludeTracks: jsonb("exclude_tracks"),
  avoidOverplayed: boolean("avoid_overplayed").default(false),
  onlyUnderground: boolean("only_underground").default(false),
  popularityThreshold: integer("popularity_threshold"),
  
  // Playlist Structure
  targetTrackCount: integer("target_track_count"),
  targetDurationMin: integer("target_duration_min"),
  targetDurationMax: integer("target_duration_max"),
  storyArcMode: boolean("story_arc_mode").default(false),
  segmentedMode: boolean("segmented_mode").default(false),
  
  // Style & Customization
  styleFusion: jsonb("style_fusion"),
  randomnessLevel: integer("randomness_level"),
  balanceHitsGems: integer("balance_hits_gems"),
  explicitLyrics: text("explicit_lyrics"),
  smartLyrics: boolean("smart_lyrics").default(false),
  languageSpecific: text("language_specific"),
  
  // Template
  templateUsed: text("template_used"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tracks = pgTable("tracks", {
  id: serial("id").primaryKey(),
  playlistId: integer("playlist_id").references(() => playlists.id).notNull(),
  spotifyId: text("spotify_id").notNull(),
  name: text("name").notNull(),
  artist: text("artist").notNull(),
  album: text("album").notNull(),
  duration: integer("duration_ms").notNull(),
  imageUrl: text("image_url"),
  previewUrl: text("preview_url"),
  position: integer("position").notNull(),
  
  // Audio Features from Spotify
  energy: real("energy"),
  danceability: real("danceability"),
  acousticness: real("acousticness"),
  instrumentalness: real("instrumentalness"),
  liveness: real("liveness"),
  speechiness: real("speechiness"),
  valence: real("valence"),
  tempo: real("tempo"),
  audioKey: integer("audio_key"),
  musicalMode: integer("musical_mode"),
  loudness: real("loudness"),
  popularity: integer("popularity"),
  releaseDate: text("release_date"),
  genres: jsonb("genres"),
  
  // AI reasoning
  aiReasoning: text("ai_reasoning"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const recentPrompts = pgTable("recent_prompts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  prompt: text("prompt").notNull(),
  playlistId: integer("playlist_id").references(() => playlists.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userPreferences = pgTable("user_preferences", {
  userId: integer("user_id").references(() => users.id).primaryKey(),
  favoriteGenres: jsonb("favorite_genres"),
  favoriteArtists: jsonb("favorite_artists"),
  bannedTerms: jsonb("banned_terms"),
  bannedArtists: jsonb("banned_artists"),
  bannedGenres: jsonb("banned_genres"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertPlaylistSchema = createInsertSchema(playlists).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTrackSchema = createInsertSchema(tracks).omit({
  id: true,
  createdAt: true,
});

export const updateTrackSchema = insertTrackSchema.partial().extend({
  id: z.number(),
});

export const insertRecentPromptSchema = createInsertSchema(recentPrompts).omit({
  id: true,
  createdAt: true,
});

export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Playlist = typeof playlists.$inferSelect;
export type InsertPlaylist = z.infer<typeof insertPlaylistSchema>;
export type Track = typeof tracks.$inferSelect;
export type InsertTrack = z.infer<typeof insertTrackSchema>;
export type UpdateTrack = z.infer<typeof updateTrackSchema>;
export type RecentPrompt = typeof recentPrompts.$inferSelect;
export type InsertRecentPrompt = z.infer<typeof insertRecentPromptSchema>;
export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;

export interface PlaylistWithTracks extends Playlist {
  tracks: Track[];
}
