import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import TrackList from "@/components/track-list";
import PlaylistActions from "@/components/playlist-actions";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function PlaylistDisplay() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: currentPlaylist, isLoading } = useQuery({
    queryKey: ["/api/playlists", "current"],
    enabled: false,
  });

  const saveToSpotify = useMutation({
    mutationFn: async (playlistId: number) => {
      const response = await apiRequest("POST", `/api/playlists/${playlistId}/save-to-spotify`);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
      toast({
        title: "Saved to Spotify!",
        description: "Your playlist has been created in your Spotify library.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to save playlist",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const regeneratePlaylist = useMutation({
    mutationFn: async (prompt: string) => {
      const response = await apiRequest("POST", "/api/playlists/generate", { prompt });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/playlists", "current"], data);
      toast({
        title: "Playlist regenerated!",
        description: `Created new version with ${data.tracks.length} songs.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to regenerate playlist",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="spotify-gray rounded-xl p-6 mb-8">
        <div className="animate-pulse">
          <div className="flex items-center mb-6">
            <div className="w-20 h-20 bg-gray-600 rounded-lg"></div>
            <div className="ml-4 flex-1">
              <div className="h-6 bg-gray-600 rounded w-1/3 mb-2"></div>
              <div className="h-4 bg-gray-600 rounded w-2/3 mb-1"></div>
              <div className="h-3 bg-gray-600 rounded w-1/4"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentPlaylist) {
    return null;
  }

  return (
    <div id="playlists" className="space-y-8">
      <div className="spotify-gray rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <img 
              src={currentPlaylist.imageUrl || "https://images.unsplash.com/photo-1518837695005-2083093ee35b?ixlib=rb-4.0.3&auto=format&fit=crop&w=160&h=160"} 
              alt="Generated playlist cover" 
              className="w-20 h-20 rounded-lg object-cover"
            />
            <div className="ml-4">
              <h3 className="text-xl font-bold">{currentPlaylist.name}</h3>
              <p className="text-gray-400">{currentPlaylist.description}</p>
              <p className="text-sm text-gray-500 mt-1">
                {currentPlaylist.tracks.length} songs
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              onClick={() => saveToSpotify.mutate(currentPlaylist.id)}
              disabled={saveToSpotify.isPending || currentPlaylist.spotifyId}
              className="spotify-green hover:bg-green-600 text-white px-6 py-2 rounded-full font-medium transition-colors"
            >
              <i className="fas fa-plus mr-2"></i>
              {currentPlaylist.spotifyId ? "Saved" : saveToSpotify.isPending ? "Saving..." : "Save to Spotify"}
            </Button>
            <Button
              onClick={() => regeneratePlaylist.mutate(currentPlaylist.prompt)}
              disabled={regeneratePlaylist.isPending}
              className="spotify-lightgray hover-spotify-gray text-white p-2 rounded-full transition-colors"
            >
              <i className="fas fa-redo"></i>
            </Button>
          </div>
        </div>

        <TrackList tracks={currentPlaylist.tracks} />
      </div>

      <PlaylistActions currentPlaylist={currentPlaylist} />
    </div>
  );
}
