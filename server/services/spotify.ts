interface SpotifyAuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

interface SpotifyUser {
  id: string;
  display_name: string;
  email: string;
  images: Array<{ url: string }>;
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: { name: string; images: Array<{ url: string }> };
  duration_ms: number;
  preview_url: string | null;
}

interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  images: Array<{ url: string }>;
  tracks: { total: number };
  public: boolean;
}

export class SpotifyService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.SPOTIFY_CLIENT_ID || "";
    this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET || "";
    // Use the exact redirect URI from your Spotify app settings
    this.redirectUri = process.env.SPOTIFY_REDIRECT_URI || "http://localhost:5000/api/auth/spotify/callback";
  }

  getAuthUrl(): string {
    const scopes = [
      'user-read-private',
      'user-read-email',
      'playlist-modify-public',
      'playlist-modify-private',
      'playlist-read-private',
    ];
    
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      scope: scopes.join(' '),
      redirect_uri: this.redirectUri,
      show_dialog: 'true',
    });

    return `https://accounts.spotify.com/authorize?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<SpotifyAuthTokens> {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to exchange code for tokens: ${response.statusText}`);
    }

    return response.json();
  }

  async refreshAccessToken(refreshToken: string): Promise<SpotifyAuthTokens> {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to refresh access token: ${response.statusText}`);
    }

    return response.json();
  }

  async getUserProfile(accessToken: string): Promise<SpotifyUser> {
    const response = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get user profile: ${response.statusText}`);
    }

    return response.json();
  }

  async searchTracks(accessToken: string, query: string, limit = 10): Promise<SpotifyTrack[]> {
    const params = new URLSearchParams({
      q: query,
      type: 'track',
      limit: limit.toString(),
    });

    const response = await fetch(`https://api.spotify.com/v1/search?${params}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to search tracks: ${response.statusText}`);
    }

    const data = await response.json();
    return data.tracks.items;
  }

  async getRecommendations(
    accessToken: string,
    options: Record<string, string | number | undefined>
  ): Promise<SpotifyTrack[]> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(options)) {
      if (value !== undefined && value !== '') {
        params.append(key, String(value));
      }
    }

    const response = await fetch(`https://api.spotify.com/v1/recommendations?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get recommendations: ${response.statusText}`);
    }

    const data = await response.json();
    return data.tracks;
  }

  async getAudioFeaturesMap(accessToken: string, trackIds: string[]): Promise<Record<string, any>> {
    if (trackIds.length === 0) return {};
    const idChunks: string[][] = [];
    for (let i = 0; i < trackIds.length; i += 100) {
      idChunks.push(trackIds.slice(i, i + 100));
    }

    const features: Record<string, any> = {};

    for (const chunk of idChunks) {
      const response = await fetch(`https://api.spotify.com/v1/audio-features?ids=${chunk.join(',')}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get audio features: ${response.statusText}`);
      }

      const data = await response.json();
      for (const af of data.audio_features || []) {
        if (af && af.id) {
          features[af.id] = af;
        }
      }
    }

    return features;
  }

  async createPlaylist(accessToken: string, userId: string, name: string, description: string): Promise<SpotifyPlaylist> {
    const response = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        description,
        public: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create playlist: ${response.statusText}`);
    }

    return response.json();
  }

  async addTracksToPlaylist(accessToken: string, playlistId: string, trackUris: string[]): Promise<void> {
    const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uris: trackUris,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to add tracks to playlist: ${response.statusText}`);
    }
  }

  async getUserPlaylists(accessToken: string, limit = 20): Promise<SpotifyPlaylist[]> {
    const response = await fetch(`https://api.spotify.com/v1/me/playlists?limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get user playlists: ${response.statusText}`);
    }

    const data = await response.json();
    return data.items;
  }

  async getRecentlyPlayed(accessToken: string, limit = 20): Promise<SpotifyTrack[]> {
    const response = await fetch(`https://api.spotify.com/v1/me/player/recently-played?limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get recently played tracks: ${response.statusText}`);
    }

    const data = await response.json();
    return data.items.map((item: any) => item.track);
  }

  async getPlaylistTracks(accessToken: string, playlistId: string): Promise<SpotifyTrack[]> {
    const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get playlist tracks: ${response.statusText}`);
    }

    const data = await response.json();
    return data.items.map((item: any) => item.track);
  }

  async getAudioFeatures(accessToken: string, trackIds: string[]): Promise<any[]> {
    const ids = trackIds.join(',');
    const response = await fetch(`https://api.spotify.com/v1/audio-features?ids=${ids}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get audio features: ${response.statusText}`);
    }

    const data = await response.json();
    return data.audio_features;
  }
}

export const spotifyService = new SpotifyService();
