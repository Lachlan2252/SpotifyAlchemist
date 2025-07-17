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
        <PromptGenerator />
        <PlaylistDisplay />
      </main>
    </div>
  );
}
