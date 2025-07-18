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
import { motion, AnimatePresence } from "framer-motion";
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(76,29,149,0.3),transparent)] animate-pulse" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(139,69,19,0.2),transparent)] animate-pulse" style={{ animationDelay: '0.5s' }} />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(30,58,138,0.2),transparent)] animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center relative z-10"
        >
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              rotateY: [0, 360],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <Sparkles className="w-10 h-10 text-white" />
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-white text-lg font-medium"
          >
            Loading advanced AI playlist generator...
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="mt-4 flex justify-center space-x-1"
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{
                  opacity: [0.3, 1, 0.3],
                  scale: [0.8, 1.2, 0.8],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
                className="w-2 h-2 bg-purple-400 rounded-full"
              />
            ))}
          </motion.div>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(76,29,149,0.3),transparent)] animate-pulse" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(139,69,19,0.2),transparent)] animate-pulse" style={{ animationDelay: '0.5s' }} />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(30,58,138,0.2),transparent)] animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center max-w-2xl mx-4 relative z-10"
        >
          <motion.div
            animate={{
              scale: [1, 1.05, 1],
              rotateY: [0, 5, -5, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl"
          >
            <Sparkles className="w-12 h-12 text-white" />
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="text-4xl font-bold text-white mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"
          >
            Advanced AI Playlist Generator
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="text-xl text-gray-300 mb-8 leading-relaxed"
          >
            Create perfect playlists with AI-powered precision controls, advanced audio analysis, and intelligent curation
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          >
            {[
              { icon: Zap, label: "Audio Analysis", color: "purple" },
              { icon: Music, label: "Vibe Control", color: "blue" },
              { icon: Settings, label: "Fine-Tuning", color: "pink" },
              { icon: Sparkles, label: "AI Templates", color: "green" },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 + index * 0.1, duration: 0.5 }}
                whileHover={{ scale: 1.05, y: -5 }}
                className="transition-all duration-300"
              >
                <Card className="bg-black/20 border-purple-500/30 hover:bg-black/30 hover:border-purple-500/50 transition-all duration-300">
                  <CardContent className="p-4 text-center">
                    <feature.icon className={`w-8 h-8 text-${feature.color}-400 mx-auto mb-2`} />
                    <p className="text-white text-sm">{feature.label}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.8 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              onClick={() => window.location.href = "/api/auth/spotify"}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-4 text-lg font-semibold rounded-full shadow-2xl transition-all duration-300"
            >
              Connect to Spotify & Start Creating
            </Button>
          </motion.div>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4, duration: 0.8 }}
            className="text-gray-400 mt-4 text-sm"
          >
            Free to use • No ads • Unlimited playlists
          </motion.p>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 relative overflow-hidden"
    >
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(76,29,149,0.1),transparent)] animate-pulse" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(139,69,19,0.1),transparent)] animate-pulse" style={{ animationDelay: '0.5s' }} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(30,58,138,0.1),transparent)] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Header with enhanced animations */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="border-b border-gray-800 bg-black/30 backdrop-blur-sm relative z-10"
      >
        <div className="flex items-center justify-between px-6 py-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="flex items-center space-x-4"
          >
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ duration: 0.3 }}
              className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center cursor-pointer"
            >
              <Sparkles className="w-6 h-6 text-white" />
            </motion.div>
            <div>
              <h1 className="text-xl font-bold text-white">Advanced AI Playlist Generator</h1>
              <p className="text-gray-400 text-sm">Create perfect playlists with precision controls</p>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="flex items-center space-x-4"
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center space-x-2 px-3 py-2 bg-black/30 rounded-full"
            >
              <img 
                src={user.imageUrl || "https://via.placeholder.com/32"} 
                alt={user.displayName} 
                className="w-8 h-8 rounded-full"
              />
              <span className="text-white text-sm">{user.displayName}</span>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={handleLogout}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-800 transition-all duration-200"
              >
                Logout
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      <div className="flex relative z-10">
        {/* Sidebar with enhanced animations */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="w-80 bg-black/30 backdrop-blur-sm border-r border-gray-800 min-h-screen"
        >
          <div className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-gray-800/50 backdrop-blur-sm">
                <TabsTrigger value="generate" className="text-xs transition-all duration-200">
                  <Sparkles className="w-4 h-4 mr-1" />
                  Generate
                </TabsTrigger>
                <TabsTrigger value="library" className="text-xs transition-all duration-200">
                  <Library className="w-4 h-4 mr-1" />
                  Library
                </TabsTrigger>
                <TabsTrigger value="history" className="text-xs transition-all duration-200">
                  <History className="w-4 h-4 mr-1" />
                  History
                </TabsTrigger>
              </TabsList>
              
              <AnimatePresence mode="wait">
                <TabsContent value="generate" className="mt-4">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                  >
                    <h3 className="text-white font-semibold">Quick Templates</h3>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { name: "Villain Origin Story", desc: "Dark transformation vibes", prompt: "Create a dark, intense playlist for a villain's origin story with haunting melodies, heavy bass, and dramatic crescendos" },
                        { name: "Main Character Energy", desc: "Protagonist anthem", prompt: "Epic main character energy playlist with empowering anthems, soaring vocals, and cinematic builds" },
                        { name: "Study with Vengeance", desc: "Aggressive focus music", prompt: "Aggressive study playlist with dark electronic beats, heavy drums, and intense energy for focused work" },
                        { name: "Cowboy Rave", desc: "Western meets electronic", prompt: "Western country meets electronic dance music fusion with banjos, synthesizers, and heavy beats" },
                      ].map((template, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1, duration: 0.4 }}
                          whileHover={{ scale: 1.02, x: 5 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Card 
                            className="bg-gray-800/50 border-gray-700 hover:bg-gray-700/50 cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-purple-500/10" 
                            onClick={() => handleTemplateClick(template.prompt)}
                          >
                            <CardContent className="p-3">
                              <p className="text-white text-sm font-medium">{template.name}</p>
                              <p className="text-gray-400 text-xs">{template.desc}</p>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                </TabsContent>
              </AnimatePresence>
              
              <TabsContent value="library" className="mt-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <h3 className="text-white font-semibold">Your Playlists ({playlists?.length || 0})</h3>
                  <div className="space-y-2">
                    {playlistsLoading ? (
                      <div className="text-center py-4">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full mx-auto"
                        />
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
                </motion.div>
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
        </motion.div>

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
    </motion.div>
  );
}