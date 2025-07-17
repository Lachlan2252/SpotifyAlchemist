import { apiRequest } from "./queryClient";

export interface GeneratePlaylistRequest {
  prompt: string;
}

export interface GeneratePlaylistResponse {
  id: number;
  name: string;
  description: string;
  prompt: string;
  tracks: Array<{
    id: number;
    name: string;
    artist: string;
    album: string;
    duration: number;
    imageUrl?: string;
  }>;
}

export interface SavePlaylistResponse {
  message: string;
  spotifyId: string;
}

export const playlistApi = {
  async generate(request: GeneratePlaylistRequest): Promise<GeneratePlaylistResponse> {
    const response = await apiRequest("POST", "/api/playlists/generate", request);
    return response.json();
  },

  async saveToSpotify(playlistId: number): Promise<SavePlaylistResponse> {
    const response = await apiRequest("POST", `/api/playlists/${playlistId}/save-to-spotify`);
    return response.json();
  },

  async getPlaylists() {
    const response = await apiRequest("GET", "/api/playlists");
    return response.json();
  },

  async getPlaylist(id: number) {
    const response = await apiRequest("GET", `/api/playlists/${id}`);
    return response.json();
  },
};

export const authApi = {
  async getMe() {
    const response = await apiRequest("GET", "/api/auth/me");
    return response.json();
  },

  async logout() {
    const response = await apiRequest("POST", "/api/auth/logout");
    return response.json();
  },
};

export const promptApi = {
  async getRecent() {
    const response = await apiRequest("GET", "/api/recent-prompts");
    return response.json();
  },
};

export const preferencesApi = {
  async get() {
    const res = await apiRequest("GET", "/api/preferences");
    return res.json();
  },
  async update(data: any) {
    const res = await apiRequest("PUT", "/api/preferences", data);
    return res.json();
  },
};
