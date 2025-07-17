import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import PromptGenerator from "@/components/prompt-generator";
import PlaylistDisplay from "@/components/playlist-display";

export default function Home() {
  const [location] = useLocation();
  const { toast } = useToast();

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  const { data: playlists, isLoading: playlistsLoading } = useQuery({
    queryKey: ["/api/playlists"],
    enabled: !!user,
  });

  const { data: recentPrompts } = useQuery({
    queryKey: ["/api/recent-prompts"],
    enabled: !!user,
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(location.split('?')[1] || '');
    const auth = urlParams.get('auth');
    
    if (auth === 'success') {
      toast({
        title: "Connected to Spotify!",
        description: "You can now generate playlists.",
      });
    } else if (auth === 'error') {
      toast({
        title: "Authentication failed",
        description: "Please try connecting to Spotify again.",
        variant: "destructive",
      });
    }
  }, [location, toast]);

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-spotify-green to-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-magic text-white text-2xl animate-pulse"></i>
          </div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-4">
          <div className="w-20 h-20 bg-gradient-to-br from-spotify-green to-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="fas fa-magic text-white text-3xl"></i>
          </div>
          <h1 className="text-3xl font-bold mb-4">Welcome to Promptify</h1>
          <p className="text-gray-400 mb-8">Connect your Spotify account to start generating AI-powered playlists from natural language prompts.</p>
          <a
            href="/api/auth/spotify"
            className="inline-flex items-center bg-spotify-green hover:bg-green-600 text-white px-8 py-3 rounded-full font-medium transition-colors"
          >
            <i className="fab fa-spotify text-xl mr-3"></i>
            Connect with Spotify
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar playlists={playlists || []} recentPrompts={recentPrompts || []} />
      <main className="flex-1 ml-64 p-8">
        <Header user={user} />
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="xl:col-span-2">
            <PromptGenerator />
            <PlaylistDisplay />
          </div>
          
          {/* Right Column - Spotify Data */}
          <div className="space-y-6">
            <div className="spotify-gray rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">Your Spotify Playlists</h2>
              <div className="space-y-3">
                {playlists && playlists.length > 0 ? (
                  playlists.slice(0, 5).map((playlist: any) => (
                    <div key={playlist.id} className="flex items-center justify-between hover-spotify-lightgray p-3 rounded-lg transition-colors">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-spotify-green rounded flex items-center justify-center">
                          <i className="fas fa-music text-white text-sm"></i>
                        </div>
                        <div className="ml-3">
                          <h3 className="font-medium text-sm">{playlist.name}</h3>
                          <p className="text-xs text-gray-400">{playlist.description}</p>
                        </div>
                      </div>
                      <button className="text-spotify-green hover:text-green-400 transition-colors">
                        <i className="fas fa-play text-sm"></i>
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400 text-sm">Generate your first playlist!</p>
                )}
              </div>
            </div>

            <div id="recent" className="spotify-gray rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">Recent Prompts</h2>
              <div className="space-y-2">
                {recentPrompts && recentPrompts.length > 0 ? (
                  recentPrompts.slice(0, 5).map((prompt: any) => (
                    <div key={prompt.id} className="p-3 bg-spotify-darkgray rounded-lg hover-spotify-lightgray transition-colors cursor-pointer">
                      <p className="text-sm text-gray-300 line-clamp-2">{prompt.prompt}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(prompt.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400 text-sm">No recent prompts yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
