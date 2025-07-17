import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  type User,
  type Playlist,
  type RecentPrompt,
  type PlaylistWithTracks,
} from "@shared/schema";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PlaylistGenerator from "@/components/playlist-generator";
import TrackList from "@/components/track-list";
import {
  Music,
  Sparkles,
  History,
  Library,
  Settings,
  User as UserIcon,
  Zap,
} from "lucide-react";

export default function MaximalistHome() {
  const [location] = useLocation();
  const { toast } = useToast();
  const [currentPlaylist, setCurrentPlaylist] = useState<PlaylistWithTracks | null>(
    null
  );
  const [activeTab, setActiveTab] = useState("generate");

  const { data: user, isLoading: userLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  const { data: playlists, isLoading: playlistsLoading } = useQuery<Playlist[]>({
    queryKey: ["/api/playlists"],
    enabled: !!user,
  });

  const { data: recentPrompts } = useQuery<RecentPrompt[]>({
    queryKey: ["/api/recent-prompts"],
    enabled: !!user,
  });

  const { data: spotifyPlaylists } = useQuery<any[]>({
    queryKey: ["/api/spotify/playlists"],
    enabled: !!user,
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(location.split('?')[1] || '');
    const auth = urlParams.get('auth');
    
    if (auth === 'success') {
      toast({
        title: "Connected to Spotify!",
        description: "You can now generate playlists with advanced AI features.",
      });
    } else if (auth === 'error') {
      toast({
        title: "Authentication failed",
        description: "Please try connecting to Spotify again.",
        variant: "destructive",
      });
    }
  }, [location, toast]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.reload();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleTemplateClick = (prompt: string) => {
    // Switch to generate tab and trigger playlist generation
    setActiveTab("generate");
    // You can pass this prompt to the PlaylistGenerator component
    setCurrentTemplatePrompt(prompt);
  };

  const handlePlaylistClick = (playlist: any) => {
    setCurrentPlaylist(playlist);
  };

  const handlePromptClick = (prompt: string) => {
    setCurrentTemplatePrompt(prompt);
    setActiveTab("generate");
  };

  const [currentTemplatePrompt, setCurrentTemplatePrompt] = useState<string>("");

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <p className="text-white text-lg">Loading advanced AI playlist generator...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="text-center max-w-2xl mx-4">
          <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
            <Sparkles className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">
            Advanced AI Playlist Generator
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            Create perfect playlists with AI-powered precision controls, advanced audio analysis, and intelligent curation
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-black/20 border-purple-500/30">
              <CardContent className="p-4 text-center">
                <Zap className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <p className="text-white text-sm">Audio Analysis</p>
              </CardContent>
            </Card>
            <Card className="bg-black/20 border-purple-500/30">
              <CardContent className="p-4 text-center">
                <Music className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <p className="text-white text-sm">Vibe Control</p>
              </CardContent>
            </Card>
            <Card className="bg-black/20 border-purple-500/30">
              <CardContent className="p-4 text-center">
                <Settings className="w-8 h-8 text-pink-400 mx-auto mb-2" />
                <p className="text-white text-sm">Fine-Tuning</p>
              </CardContent>
            </Card>
            <Card className="bg-black/20 border-purple-500/30">
              <CardContent className="p-4 text-center">
                <Sparkles className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-white text-sm">AI Templates</p>
              </CardContent>
            </Card>
          </div>
          <Button
            onClick={() => window.location.href = "/api/auth/spotify"}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-4 text-lg font-semibold rounded-full transform hover:scale-105 transition-all duration-200"
          >
            Connect to Spotify & Start Creating
          </Button>
          <p className="text-gray-400 mt-4 text-sm">
            Free to use • No ads • Unlimited playlists
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
      {/* Header */}
      <div className="border-b border-gray-800 bg-black/30 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Advanced AI Playlist Generator</h1>
              <p className="text-gray-400 text-sm">Create perfect playlists with precision controls</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <img 
                src={user.imageUrl || "https://via.placeholder.com/32"} 
                alt={user.displayName} 
                className="w-8 h-8 rounded-full"
              />
              <span className="text-white text-sm">{user.displayName}</span>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-80 bg-black/30 backdrop-blur-sm border-r border-gray-800 min-h-screen">
          <div className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-gray-800/50">
                <TabsTrigger value="generate" className="text-xs">
                  <Sparkles className="w-4 h-4 mr-1" />
                  Generate
                </TabsTrigger>
                <TabsTrigger value="library" className="text-xs">
                  <Library className="w-4 h-4 mr-1" />
                  Library
                </TabsTrigger>
                <TabsTrigger value="history" className="text-xs">
                  <History className="w-4 h-4 mr-1" />
                  History
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="generate" className="mt-4">
                <div className="space-y-4">
                  <h3 className="text-white font-semibold">Quick Templates</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { name: "Villain Origin Story", desc: "Dark transformation vibes", prompt: "Create a dark, intense playlist for a villain's origin story with haunting melodies, heavy bass, and dramatic crescendos" },
                      { name: "Main Character Energy", desc: "Protagonist anthem", prompt: "Epic main character energy playlist with empowering anthems, soaring vocals, and cinematic builds" },
                      { name: "Study with Vengeance", desc: "Aggressive focus music", prompt: "Aggressive study playlist with dark electronic beats, heavy drums, and intense energy for focused work" },
                      { name: "Cowboy Rave", desc: "Western meets electronic", prompt: "Western country meets electronic dance music fusion with banjos, synthesizers, and heavy beats" },
                    ].map((template, index) => (
                      <Card key={index} className="bg-gray-800/50 border-gray-700 hover:bg-gray-700/50 cursor-pointer transition-colors" onClick={() => handleTemplateClick(template.prompt)}>
                        <CardContent className="p-3">
                          <p className="text-white text-sm font-medium">{template.name}</p>
                          <p className="text-gray-400 text-xs">{template.desc}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="library" className="mt-4">
                <div className="space-y-4">
                  <h3 className="text-white font-semibold">Your Playlists ({playlists?.length || 0})</h3>
                  <div className="space-y-2">
                    {playlistsLoading ? (
                      <div className="text-center py-4">
                        <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full mx-auto"></div>
                        <p className="text-gray-400 text-sm mt-2">Loading playlists...</p>
                      </div>
                    ) : playlists && playlists.length > 0 ? (
                      playlists.map((playlist: Playlist) => (
                        <Card key={playlist.id} className="bg-gray-800/50 border-gray-700 hover:bg-gray-700/50 cursor-pointer transition-colors" onClick={() => handlePlaylistClick(playlist)}>
                          <CardContent className="p-3">
                            <p className="text-white text-sm font-medium">{playlist.name}</p>
                            <p className="text-gray-400 text-xs">{playlist.trackCount} tracks</p>
                            <p className="text-gray-500 text-xs mt-1">{new Date(playlist.createdAt).toLocaleDateString()}</p>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-gray-400 text-sm">No playlists yet</p>
                        <p className="text-gray-500 text-xs">Generate your first playlist to get started</p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="history" className="mt-4">
                <div className="space-y-4">
                  <h3 className="text-white font-semibold">Recent Prompts</h3>
                  <div className="space-y-2">
                    {recentPrompts && recentPrompts.length > 0 ? (
                      recentPrompts.map((prompt: RecentPrompt) => (
                        <Card key={prompt.id} className="bg-gray-800/50 border-gray-700 hover:bg-gray-700/50 cursor-pointer transition-colors" onClick={() => handlePromptClick(prompt.prompt)}>
                          <CardContent className="p-3">
                            <p className="text-white text-sm">{prompt.prompt}</p>
                            <p className="text-gray-400 text-xs">{new Date(prompt.createdAt).toLocaleDateString()}</p>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-gray-400 text-sm">No recent prompts</p>
                        <p className="text-gray-500 text-xs">Your prompt history will appear here</p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          {currentPlaylist ? (
            <div className="p-6">
              <div className="mb-6">
                <Button
                  onClick={() => setCurrentPlaylist(null)}
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  ← Back to Generator
                </Button>
              </div>
              
              <Card className="bg-black/30 backdrop-blur-sm border-gray-800">
                <CardHeader>
                  <div className="flex items-center space-x-4">
                    <img 
                      src={currentPlaylist.imageUrl || "https://images.unsplash.com/photo-1518837695005-2083093ee35b?ixlib=rb-4.0.3&auto=format&fit=crop&w=160&h=160"} 
                      alt={currentPlaylist.name} 
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div>
                      <CardTitle className="text-white">{currentPlaylist.name}</CardTitle>
                      <CardDescription className="text-gray-400">{currentPlaylist.description}</CardDescription>
                      <p className="text-sm text-gray-500 mt-1">
                        {currentPlaylist.tracks?.length || 0} tracks
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <TrackList tracks={currentPlaylist.tracks || []} showArtwork={true} />
                </CardContent>
              </Card>
            </div>
          ) : (
            <PlaylistGenerator onPlaylistGenerated={setCurrentPlaylist} templatePrompt={currentTemplatePrompt} onTemplateUsed={() => setCurrentTemplatePrompt("")} />
          )}
        </div>
      </div>
    </div>
  );
}