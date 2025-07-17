import { Button } from "@/components/ui/button";
import { type Playlist } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PlaylistActionsProps {
  currentPlaylist: Playlist & { tracks: any[] };
}

export default function PlaylistActions({ currentPlaylist }: PlaylistActionsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addSimilarSongs = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        "POST",
        `/api/playlists/${currentPlaylist.id}/add-similar`
      );
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/playlists", "current"], data.playlist);
      toast({
        title: "Added similar songs",
        description: data.reasoning || "New tracks have been appended",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Failed to add songs",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleAddSimilarSongs = () => {
    addSimilarSongs.mutate();
  };

  const handleReplaceOverplayed = () => {
    toast({
      title: "Not implemented",
      description: "Replace overplayed is coming soon",
    });
  };

  const handleReorderByMood = () => {
    toast({
      title: "Not implemented",
      description: "Reorder by mood is coming soon",
    });
  };

  return (
    <div className="spotify-gray rounded-xl p-6">
      <h3 className="text-lg font-semibold mb-4">Modify Your Playlist</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="spotify-lightgray rounded-lg p-4">
          <h4 className="font-medium mb-2">Add Similar Songs</h4>
          <p className="text-sm text-gray-400 mb-3">Find more tracks that match the vibe</p>
          <Button 
            onClick={handleAddSimilarSongs}
            className="w-full spotify-green hover:bg-green-600 text-white py-2 rounded-lg font-medium transition-colors"
          >
            <i className="fas fa-plus mr-2"></i>
            Add Songs
          </Button>
        </div>
        <div className="spotify-lightgray rounded-lg p-4">
          <h4 className="font-medium mb-2">Replace Overplayed</h4>
          <p className="text-sm text-gray-400 mb-3">Swap popular tracks for hidden gems</p>
          <Button 
            onClick={handleReplaceOverplayed}
            className="w-full spotify-green hover:bg-green-600 text-white py-2 rounded-lg font-medium transition-colors"
          >
            <i className="fas fa-exchange-alt mr-2"></i>
            Replace
          </Button>
        </div>
        <div className="spotify-lightgray rounded-lg p-4">
          <h4 className="font-medium mb-2">Reorder by Mood</h4>
          <p className="text-sm text-gray-400 mb-3">Arrange tracks by energy or BPM</p>
          <Button 
            onClick={handleReorderByMood}
            className="w-full spotify-green hover:bg-green-600 text-white py-2 rounded-lg font-medium transition-colors"
          >
            <i className="fas fa-sort mr-2"></i>
            Reorder
          </Button>
        </div>
      </div>
    </div>
  );
}
