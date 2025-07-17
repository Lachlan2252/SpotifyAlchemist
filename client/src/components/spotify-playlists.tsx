import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  images: Array<{ url: string }>;
  tracks: { total: number };
  external_urls: { spotify: string };
}

export default function SpotifyPlaylists() {
  const { data: spotifyPlaylists, isLoading } = useQuery({
    queryKey: ["/api/spotify/playlists"],
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="spotify-gray rounded-xl p-6">
        <h2 className="text-xl font-bold mb-4">Your Spotify Playlists</h2>
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

  if (!spotifyPlaylists || !Array.isArray(spotifyPlaylists) || spotifyPlaylists.length === 0) {
    return (
      <div className="spotify-gray rounded-xl p-6">
        <h2 className="text-xl font-bold mb-4">Your Spotify Playlists</h2>
        <p className="text-gray-400">No playlists found. Create some playlists on Spotify first!</p>
      </div>
    );
  }

  return (
    <div className="spotify-gray rounded-xl p-6">
      <h2 className="text-xl font-bold mb-4">Your Spotify Playlists</h2>
      <div className="space-y-4">
        {Array.isArray(spotifyPlaylists) ? spotifyPlaylists.map((playlist: SpotifyPlaylist) => (
          <div key={playlist.id} className="flex items-center justify-between hover-spotify-lightgray p-3 rounded-lg transition-colors">
            <div className="flex items-center">
              <img 
                src={playlist.images[0]?.url || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&auto=format&fit=crop&w=48&h=48"} 
                alt={playlist.name} 
                className="w-12 h-12 rounded object-cover"
              />
              <div className="ml-4">
                <h3 className="font-medium">{playlist.name}</h3>
                <p className="text-sm text-gray-400">{playlist.tracks.total} tracks</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => window.open(playlist.external_urls.spotify, '_blank')}
                variant="outline"
                size="sm"
                className="text-spotify-green border-spotify-green hover:bg-spotify-green hover:text-white"
              >
                <i className="fab fa-spotify mr-2"></i>
                Open
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-gray-600 hover:bg-gray-600"
              >
                <i className="fas fa-magic mr-2"></i>
                Remix
              </Button>
            </div>
          </div>
        )) : null}
      </div>
    </div>
  );
}