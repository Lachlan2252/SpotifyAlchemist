import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { type Playlist, type RecentPrompt } from "@shared/schema";

interface SidebarProps {
  playlists: Playlist[];
  recentPrompts: RecentPrompt[];
}

export default function Sidebar({ playlists, recentPrompts }: SidebarProps) {
  const [location] = useLocation();

  const { data: spotifyPlaylists } = useQuery<any[]>({
    queryKey: ["/api/spotify/playlists"],
    retry: false,
    refetchOnWindowFocus: false,
  });

  const { data: recentlyPlayed } = useQuery<any[]>({
    queryKey: ["/api/spotify/recently-played"],
    retry: false,
    refetchOnWindowFocus: false,
  });

  return (
    <aside className="w-64 spotify-sidebar p-6 fixed h-full overflow-y-auto">
      <div className="flex items-center mb-8">
        <div className="w-10 h-10 bg-gradient-to-br from-spotify-green to-green-400 rounded-full flex items-center justify-center">
          <i className="fas fa-magic text-white text-lg"></i>
        </div>
        <h1 className="ml-3 text-xl font-bold">Promptify</h1>
      </div>

      <nav className="mb-8">
        <ul className="space-y-2">
          <li>
            <Link href="/">
              <div className={`flex items-center py-2 px-4 rounded-lg font-medium transition-colors cursor-pointer ${
                location === "/" ? "spotify-gray text-white" : "text-gray-300 hover-spotify-gray hover:text-white"
              }`}>
                <i className="fas fa-home w-5 mr-3"></i>
                Home
              </div>
            </Link>
          </li>
          <li>
            <button 
              onClick={() => document.getElementById('generator')?.scrollIntoView({ behavior: 'smooth' })}
              className="flex items-center py-2 px-4 rounded-lg hover-spotify-gray text-gray-300 hover:text-white transition-colors w-full text-left"
            >
              <i className="fas fa-search w-5 mr-3"></i>
              Generate Playlist
            </button>
          </li>
          <li>
            <button 
              onClick={() => document.getElementById('playlists')?.scrollIntoView({ behavior: 'smooth' })}
              className="flex items-center py-2 px-4 rounded-lg hover-spotify-gray text-gray-300 hover:text-white transition-colors w-full text-left"
            >
              <i className="fas fa-list w-5 mr-3"></i>
              My Playlists
            </button>
          </li>
          <li>
            <button 
              onClick={() => document.getElementById('recent')?.scrollIntoView({ behavior: 'smooth' })}
              className="flex items-center py-2 px-4 rounded-lg hover-spotify-gray text-gray-300 hover:text-white transition-colors w-full text-left"
            >
              <i className="fas fa-history w-5 mr-3"></i>
              Recent Prompts
            </button>
          </li>
        </ul>
      </nav>

      <div className="border-t border-gray-600 pt-6">
        <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wide">Your Playlists</h3>
        <div className="space-y-2">
          {playlists.length === 0 ? (
            <p className="text-sm text-gray-500">No playlists yet. Generate your first one!</p>
          ) : (
            playlists.map((playlist) => (
              <div key={playlist.id} className="flex items-center py-2 px-4 rounded-lg hover-spotify-gray cursor-pointer transition-colors">
                <img 
                  src={playlist.imageUrl || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&auto=format&fit=crop&w=50&h=50"} 
                  alt="Playlist cover" 
                  className="w-10 h-10 rounded object-cover"
                />
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium">{playlist.name}</p>
                  <p className="text-xs text-gray-400">{playlist.trackCount} songs</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Spotify Playlists */}
      <div className="border-t border-gray-600 pt-6 mt-6">
        <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wide">Spotify Playlists</h3>
        <div className="space-y-2">
          {spotifyPlaylists && spotifyPlaylists.length > 0 ? (
            spotifyPlaylists.slice(0, 5).map((playlist: any) => (
              <button
                key={playlist.id}
                onClick={() => window.open(playlist.external_urls.spotify, '_blank')}
                className="flex items-center py-2 px-4 rounded-lg hover-spotify-gray cursor-pointer transition-colors w-full text-left"
              >
                <img 
                  src={playlist.images[0]?.url || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&auto=format&fit=crop&w=50&h=50"} 
                  alt="Playlist cover" 
                  className="w-10 h-10 rounded object-cover"
                />
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium">{playlist.name}</p>
                  <p className="text-xs text-gray-400">{playlist.tracks.total} songs</p>
                </div>
                <i className="fab fa-spotify text-spotify-green text-sm"></i>
              </button>
            ))
          ) : (
            <p className="text-sm text-gray-500">Loading Spotify playlists...</p>
          )}
        </div>
      </div>

      {/* Recently Played */}
      <div className="border-t border-gray-600 pt-6 mt-6">
        <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wide">Recently Played</h3>
        <div className="space-y-2">
          {recentlyPlayed && recentlyPlayed.length > 0 ? (
            recentlyPlayed.slice(0, 3).map((track: any) => (
              <button
                key={track.id}
                onClick={() => window.open(track.external_urls.spotify, '_blank')}
                className="flex items-center py-2 px-4 rounded-lg hover-spotify-gray cursor-pointer transition-colors w-full text-left"
              >
                <img 
                  src={track.album.images[0]?.url || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&auto=format&fit=crop&w=50&h=50"} 
                  alt="Album cover" 
                  className="w-10 h-10 rounded object-cover"
                />
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium truncate">{track.name}</p>
                  <p className="text-xs text-gray-400 truncate">{track.artists[0]?.name}</p>
                </div>
                <i className="fas fa-play text-spotify-green text-sm"></i>
              </button>
            ))
          ) : (
            <p className="text-sm text-gray-500">Loading recent tracks...</p>
          )}
        </div>
      </div>

      {recentPrompts.length > 0 && (
        <div className="border-t border-gray-600 pt-6 mt-6">
          <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wide">Recent Prompts</h3>
          <div className="space-y-2">
            {recentPrompts.slice(0, 5).map((prompt) => (
              <div key={prompt.id} className="py-2 px-4 rounded-lg hover-spotify-gray cursor-pointer transition-colors">
                <p className="text-sm text-gray-300 truncate">{prompt.prompt}</p>
                <p className="text-xs text-gray-500">{new Date(prompt.createdAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
