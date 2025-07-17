import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface GeneratedPlaylist {
  id: string;
  name: string;
  description: string;
  tracks: SpotifyTrack[];
  spotifyId?: string;
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images: Array<{ url: string }>;
  };
  duration_ms: number;
  external_urls: { spotify: string };
}

export default function PlaylistGenerator() {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentPlaylist, setCurrentPlaylist] = useState<GeneratedPlaylist | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: recentPrompts } = useQuery({
    queryKey: ["/api/recent-prompts"],
    retry: false,
  });

  const generatePlaylist = useMutation({
    mutationFn: async (prompt: string) => {
      const response = await apiRequest("/api/generate-playlist", {
        method: "POST",
        body: { prompt },
      });
      return response;
    },
    onSuccess: (data) => {
      setCurrentPlaylist(data);
      queryClient.invalidateQueries({ queryKey: ["/api/recent-prompts"] });
      toast({
        title: "Playlist Generated!",
        description: `Created "${data.name}" with ${data.tracks.length} tracks`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate playlist",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsGenerating(false);
    },
  });

  const saveToSpotify = useMutation({
    mutationFn: async (playlistId: string) => {
      const response = await apiRequest(`/api/playlists/${playlistId}/save-to-spotify`, {
        method: "POST",
      });
      return response;
    },
    onSuccess: (data) => {
      if (currentPlaylist) {
        setCurrentPlaylist({ ...currentPlaylist, spotifyId: data.spotifyId });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
      toast({
        title: "Saved to Spotify!",
        description: "Your playlist has been saved to your Spotify account",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save to Spotify",
        variant: "destructive",
      });
    },
  });

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Enter a Prompt",
        description: "Please describe what kind of playlist you want",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    generatePlaylist.mutate(prompt);
  };

  const handleSaveToSpotify = () => {
    if (currentPlaylist) {
      saveToSpotify.mutate(currentPlaylist.id);
    }
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Playlist Generator */}
      <div className="spotify-gray rounded-xl p-6">
        <h2 className="text-2xl font-bold mb-4">Generate AI Playlist</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Describe your perfect playlist
            </label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., 'sad girl indie for a rainy night' or 'upbeat pop for working out'"
              className="min-h-[100px] bg-spotify-darkgray border-gray-600 text-white placeholder-gray-400"
            />
          </div>

          <Button 
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full bg-spotify-green hover:bg-green-600 text-white font-medium"
          >
            {isGenerating ? (
              <>
                <i className="fas fa-spinner animate-spin mr-2"></i>
                Generating...
              </>
            ) : (
              <>
                <i className="fas fa-magic mr-2"></i>
                Generate Playlist
              </>
            )}
          </Button>
        </div>

        {/* Recent Prompts */}
        {recentPrompts && recentPrompts.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">Recent Prompts</h3>
            <div className="flex flex-wrap gap-2">
              {recentPrompts.slice(0, 5).map((recentPrompt: any) => (
                <Button
                  key={recentPrompt.id}
                  onClick={() => setPrompt(recentPrompt.prompt)}
                  variant="outline"
                  size="sm"
                  className="text-sm border-gray-600 hover:bg-gray-600"
                >
                  {recentPrompt.prompt}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Generated Playlist */}
      {currentPlaylist && (
        <div className="spotify-gray rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold">{currentPlaylist.name}</h3>
              <p className="text-gray-400">{currentPlaylist.description}</p>
            </div>
            <div className="flex items-center space-x-2">
              {!currentPlaylist.spotifyId && (
                <Button
                  onClick={handleSaveToSpotify}
                  disabled={saveToSpotify.isPending}
                  className="bg-spotify-green hover:bg-green-600 text-white"
                >
                  {saveToSpotify.isPending ? (
                    <>
                      <i className="fas fa-spinner animate-spin mr-2"></i>
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="fab fa-spotify mr-2"></i>
                      Save to Spotify
                    </>
                  )}
                </Button>
              )}
              {currentPlaylist.spotifyId && (
                <Button
                  onClick={() => window.open(`https://open.spotify.com/playlist/${currentPlaylist.spotifyId}`, '_blank')}
                  className="bg-spotify-green hover:bg-green-600 text-white"
                >
                  <i className="fab fa-spotify mr-2"></i>
                  Open in Spotify
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {currentPlaylist.tracks.map((track, index) => (
              <div key={track.id} className="flex items-center justify-between hover-spotify-lightgray p-3 rounded-lg transition-colors">
                <div className="flex items-center">
                  <span className="w-6 text-center text-sm text-gray-400">{index + 1}</span>
                  <img 
                    src={track.album.images[0]?.url} 
                    alt={track.album.name} 
                    className="w-10 h-10 rounded ml-4 object-cover"
                  />
                  <div className="ml-4">
                    <h4 className="font-medium">{track.name}</h4>
                    <p className="text-sm text-gray-400">
                      {track.artists.map(artist => artist.name).join(", ")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-400">{formatDuration(track.duration_ms)}</span>
                  <Button
                    onClick={() => window.open(track.external_urls.spotify, '_blank')}
                    variant="outline"
                    size="sm"
                    className="text-spotify-green border-spotify-green hover:bg-spotify-green hover:text-white"
                  >
                    <i className="fab fa-spotify"></i>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}