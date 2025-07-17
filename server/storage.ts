import { users, playlists, tracks, recentPrompts, userPreferences, type User, type InsertUser, type Playlist, type InsertPlaylist, type Track, type InsertTrack, type InsertRecentPrompt, type RecentPrompt, type UserPreferences, type InsertUserPreferences } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserBySpotifyId(spotifyId: string): Promise<User | undefined>;
  createOrUpdateUser(user: InsertUser): Promise<User>;
  createPlaylist(playlist: InsertPlaylist): Promise<Playlist>;
  getPlaylistWithTracks(id: number): Promise<(Playlist & { tracks: Track[] }) | undefined>;
  getUserPlaylists(userId: number): Promise<Playlist[]>;
  updatePlaylist(id: number, updates: Partial<InsertPlaylist>): Promise<void>;
  addTrackToPlaylist(track: InsertTrack): Promise<Track>;
  updateTrack(id: number, updates: Partial<InsertTrack>): Promise<void>;
  removeTrackFromPlaylist(playlistId: number, trackId: number): Promise<void>;
  addRecentPrompt(prompt: InsertRecentPrompt): Promise<RecentPrompt>;
  getRecentPrompts(userId: number, limit?: number): Promise<RecentPrompt[]>;
  getUserPreferences(userId: number): Promise<UserPreferences | undefined>;
  setUserPreferences(userId: number, prefs: InsertUserPreferences): Promise<UserPreferences>;
}



export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserBySpotifyId(spotifyId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.spotifyId, spotifyId));
    return user || undefined;
  }

  async createOrUpdateUser(insertUser: InsertUser): Promise<User> {
    try {
      const existingUser = await this.getUserBySpotifyId(insertUser.spotifyId);
      
      if (existingUser) {
        // Update existing user
        const [updatedUser] = await db
          .update(users)
          .set({
            ...insertUser,
            email: insertUser.email || null,
            imageUrl: insertUser.imageUrl || null,
          })
          .where(eq(users.id, existingUser.id))
          .returning();
        return updatedUser;
      } else {
        // Create new user
        const [user] = await db
          .insert(users)
          .values({
            ...insertUser,
            email: insertUser.email || null,
            imageUrl: insertUser.imageUrl || null,
          })
          .returning();
        return user;
      }
    } catch (error: any) {
      // Handle unique constraint violation
      if (error.code === '23505' && error.constraint === 'users_spotify_id_unique') {
        const existingUser = await this.getUserBySpotifyId(insertUser.spotifyId);
        if (existingUser) {
          const [updatedUser] = await db
            .update(users)
            .set({
              ...insertUser,
              email: insertUser.email || null,
              imageUrl: insertUser.imageUrl || null,
            })
            .where(eq(users.id, existingUser.id))
            .returning();
          return updatedUser;
        }
      }
      throw error;
    }
  }

  async createPlaylist(insertPlaylist: InsertPlaylist): Promise<Playlist> {
    const [playlist] = await db
      .insert(playlists)
      .values({
        ...insertPlaylist,
        description: insertPlaylist.description || null,
        spotifyId: insertPlaylist.spotifyId || null,
        imageUrl: insertPlaylist.imageUrl || null,
        trackCount: insertPlaylist.trackCount || null,
        isPublic: insertPlaylist.isPublic || null,
      })
      .returning();
    return playlist;
  }

  async getPlaylistWithTracks(id: number): Promise<(Playlist & { tracks: Track[] }) | undefined> {
    const [playlist] = await db.select().from(playlists).where(eq(playlists.id, id));
    if (!playlist) return undefined;

    const playlistTracks = await db
      .select()
      .from(tracks)
      .where(eq(tracks.playlistId, id))
      .orderBy(tracks.position);

    return {
      ...playlist,
      tracks: playlistTracks,
    };
  }

  async getUserPlaylists(userId: number): Promise<Playlist[]> {
    return await db
      .select()
      .from(playlists)
      .where(eq(playlists.userId, userId))
      .orderBy(playlists.createdAt);
  }

  async getPlaylist(id: number): Promise<Playlist | undefined> {
    const [playlist] = await db.select().from(playlists).where(eq(playlists.id, id));
    return playlist || undefined;
  }

  async updatePlaylist(id: number, updates: Partial<InsertPlaylist>): Promise<void> {
    await db
      .update(playlists)
      .set(updates)
      .where(eq(playlists.id, id));
  }

  async addTrackToPlaylist(insertTrack: InsertTrack): Promise<Track> {
    const [track] = await db
      .insert(tracks)
      .values({
        ...insertTrack,
        imageUrl: insertTrack.imageUrl || null,
        previewUrl: insertTrack.previewUrl || null,
      })
      .returning();
    return track;
  }

  async updateTrack(id: number, updates: Partial<InsertTrack>): Promise<void> {
    await db
      .update(tracks)
      .set(updates)
      .where(eq(tracks.id, id));
  }

  async removeTrackFromPlaylist(playlistId: number, trackId: number): Promise<void> {
    await db
      .delete(tracks)
      .where(and(eq(tracks.id, trackId), eq(tracks.playlistId, playlistId)));
  }

  async addRecentPrompt(insertPrompt: InsertRecentPrompt): Promise<RecentPrompt> {
    const [prompt] = await db
      .insert(recentPrompts)
      .values({
        ...insertPrompt,
        playlistId: insertPrompt.playlistId || null,
      })
      .returning();
    return prompt;
  }

  async getRecentPrompts(userId: number, limit = 10): Promise<RecentPrompt[]> {
    return await db
      .select()
      .from(recentPrompts)
      .where(eq(recentPrompts.userId, userId))
      .orderBy(recentPrompts.createdAt)
      .limit(limit);
  }

  async getUserPreferences(userId: number): Promise<UserPreferences | undefined> {
    const [prefs] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId));
    return prefs || undefined;
  }

  async setUserPreferences(userId: number, prefs: InsertUserPreferences): Promise<UserPreferences> {
    const existing = await this.getUserPreferences(userId);
    if (existing) {
      const [updated] = await db
        .update(userPreferences)
        .set(prefs)
        .where(eq(userPreferences.userId, userId))
        .returning();
      return updated;
    }
    const [created] = await db
      .insert(userPreferences)
      .values({ userId, ...prefs })
      .returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
