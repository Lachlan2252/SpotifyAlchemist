import { users, playlists, tracks, recentPrompts, type User, type InsertUser, type Playlist, type InsertPlaylist, type Track, type InsertTrack, type InsertRecentPrompt, type RecentPrompt } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  createOrUpdateUser(user: InsertUser): Promise<User>;
  createPlaylist(playlist: InsertPlaylist): Promise<Playlist>;
  getPlaylistWithTracks(id: number): Promise<(Playlist & { tracks: Track[] }) | undefined>;
  getUserPlaylists(userId: number): Promise<Playlist[]>;
  updatePlaylist(id: number, updates: Partial<InsertPlaylist>): Promise<void>;
  addTrackToPlaylist(track: InsertTrack): Promise<Track>;
  removeTrackFromPlaylist(playlistId: number, trackId: number): Promise<void>;
  addRecentPrompt(prompt: InsertRecentPrompt): Promise<RecentPrompt>;
  getRecentPrompts(userId: number, limit?: number): Promise<RecentPrompt[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private playlists: Map<number, Playlist>;
  private tracks: Map<number, Track>;
  private recentPrompts: Map<number, RecentPrompt>;
  private usersBySpotifyId: Map<string, User>;
  private currentUserId: number;
  private currentPlaylistId: number;
  private currentTrackId: number;
  private currentPromptId: number;

  constructor() {
    this.users = new Map();
    this.playlists = new Map();
    this.tracks = new Map();
    this.recentPrompts = new Map();
    this.usersBySpotifyId = new Map();
    this.currentUserId = 1;
    this.currentPlaylistId = 1;
    this.currentTrackId = 1;
    this.currentPromptId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async createOrUpdateUser(insertUser: InsertUser): Promise<User> {
    const existingUser = this.usersBySpotifyId.get(insertUser.spotifyId);
    
    if (existingUser) {
      // Update existing user
      const updatedUser: User = {
        ...existingUser,
        ...insertUser,
        id: existingUser.id,
        createdAt: existingUser.createdAt,
        email: insertUser.email || null,
        imageUrl: insertUser.imageUrl || null,
      };
      this.users.set(existingUser.id, updatedUser);
      this.usersBySpotifyId.set(insertUser.spotifyId, updatedUser);
      return updatedUser;
    } else {
      // Create new user
      const id = this.currentUserId++;
      const user: User = {
        ...insertUser,
        id,
        createdAt: new Date(),
        email: insertUser.email || null,
        imageUrl: insertUser.imageUrl || null,
      };
      this.users.set(id, user);
      this.usersBySpotifyId.set(insertUser.spotifyId, user);
      return user;
    }
  }

  async createPlaylist(insertPlaylist: InsertPlaylist): Promise<Playlist> {
    const id = this.currentPlaylistId++;
    const playlist: Playlist = {
      ...insertPlaylist,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      description: insertPlaylist.description || null,
      spotifyId: insertPlaylist.spotifyId || null,
      imageUrl: insertPlaylist.imageUrl || null,
      trackCount: insertPlaylist.trackCount || null,
      isPublic: insertPlaylist.isPublic || null,
    };
    this.playlists.set(id, playlist);
    return playlist;
  }

  async getPlaylistWithTracks(id: number): Promise<(Playlist & { tracks: Track[] }) | undefined> {
    const playlist = this.playlists.get(id);
    if (!playlist) return undefined;

    const playlistTracks = Array.from(this.tracks.values())
      .filter(track => track.playlistId === id)
      .sort((a, b) => a.position - b.position);

    return {
      ...playlist,
      tracks: playlistTracks,
    };
  }

  async getUserPlaylists(userId: number): Promise<Playlist[]> {
    return Array.from(this.playlists.values())
      .filter(playlist => playlist.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updatePlaylist(id: number, updates: Partial<InsertPlaylist>): Promise<void> {
    const playlist = this.playlists.get(id);
    if (!playlist) return;

    const updatedPlaylist: Playlist = {
      ...playlist,
      ...updates,
      updatedAt: new Date(),
    };
    this.playlists.set(id, updatedPlaylist);
  }

  async addTrackToPlaylist(insertTrack: InsertTrack): Promise<Track> {
    const id = this.currentTrackId++;
    const track: Track = {
      ...insertTrack,
      id,
      createdAt: new Date(),
      imageUrl: insertTrack.imageUrl || null,
      previewUrl: insertTrack.previewUrl || null,
    };
    this.tracks.set(id, track);
    return track;
  }

  async removeTrackFromPlaylist(playlistId: number, trackId: number): Promise<void> {
    const track = this.tracks.get(trackId);
    if (track && track.playlistId === playlistId) {
      this.tracks.delete(trackId);
    }
  }

  async addRecentPrompt(insertPrompt: InsertRecentPrompt): Promise<RecentPrompt> {
    const id = this.currentPromptId++;
    const prompt: RecentPrompt = {
      ...insertPrompt,
      id,
      createdAt: new Date(),
      playlistId: insertPrompt.playlistId || null,
    };
    this.recentPrompts.set(id, prompt);
    return prompt;
  }

  async getRecentPrompts(userId: number, limit = 10): Promise<RecentPrompt[]> {
    return Array.from(this.recentPrompts.values())
      .filter(prompt => prompt.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }
}

export const storage = new MemStorage();
