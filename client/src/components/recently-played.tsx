import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

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

export default function RecentlyPlayed() {
  const { data: recentlyPlayed, isLoading } = useQuery({
    queryKey: ["/api/spotify/recently-played"],
    retry: false,
  });

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="spotify-gray rounded-xl p-6">
        <h2 className="text-xl font-bold mb-4">Recently Played</h2>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center animate-pulse">
              <div className="w-12 h-12 bg-gray-600 rounded"></div>
              <div className="ml-4 flex-1">
                <div className="h-4 bg-gray-600 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-600 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!recentlyPlayed || !Array.isArray(recentlyPlayed) || recentlyPlayed.length === 0) {
    return (
      <div className="spotify-gray rounded-xl p-6">
        <h2 className="text-xl font-bold mb-4">Recently Played</h2>
        <p className="text-gray-400">No recently played tracks found. Start listening to some music!</p>
      </div>
    );
  }

  return (
    <div className="spotify-gray rounded-xl p-6">
      <h2 className="text-xl font-bold mb-4">Recently Played</h2>
      <div className="space-y-4">
        {Array.isArray(recentlyPlayed) ? recentlyPlayed.map((track: SpotifyTrack) => (
          <div key={track.id} className="flex items-center justify-between hover-spotify-lightgray p-3 rounded-lg transition-colors">
            <div className="flex items-center">
              <img 
                src={track.album.images[0]?.url || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&auto=format&fit=crop&w=48&h=48"} 
                alt={track.album.name} 
                className="w-12 h-12 rounded object-cover"
              />
              <div className="ml-4">
                <h3 className="font-medium">{track.name}</h3>
                <p className="text-sm text-gray-400">
                  {track.artists.map(artist => artist.name).join(", ")} • {formatDuration(track.duration_ms)}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => window.open(track.external_urls.spotify, '_blank')}
                variant="outline"
                size="sm"
                className="text-spotify-green border-spotify-green hover:bg-spotify-green hover:text-white"
              >
                <i className="fab fa-spotify mr-2"></i>
                Play
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-gray-600 hover:bg-gray-600"
              >
                <i className="fas fa-plus mr-2"></i>
                Add to Playlist
              </Button>
            </div>
          </div>
        )) : null}
      </div>
    </div>
  );
}