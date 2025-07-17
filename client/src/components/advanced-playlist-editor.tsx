import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type Track, type PlaylistWithTracks } from "@shared/schema";
import { 
  ArrowUpDown, 
  Zap, 
  Music, 
  TrendingUp, 
  TrendingDown,
  Shuffle,
  Filter,
  SortAsc,
  SortDesc,
  BarChart3,
  Heart,
  Volume2
} from "lucide-react";

interface AdvancedPlaylistEditorProps {
  playlist: PlaylistWithTracks;
  onPlaylistUpdate: (playlist: PlaylistWithTracks) => void;
}

export default function AdvancedPlaylistEditor({ playlist, onPlaylistUpdate }: AdvancedPlaylistEditorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [sortBy, setSortBy] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [energyFilter, setEnergyFilter] = useState<[number, number]>([0, 1]);
  const [bpmFilter, setBpmFilter] = useState<[number, number]>([60, 200]);
  const [moodFilter, setMoodFilter] = useState<[number, number]>([0, 1]);
  const [activeTab, setActiveTab] = useState("sort");
  
  const [tracks, setTracks] = useState<Track[]>(playlist?.tracks || []);
  
  const updatePlaylistTracks = useMutation({
    mutationFn: async (newTracks: Track[]) => {
      const response = await apiRequest("PUT", `/api/playlists/${playlist.id}/tracks`, {
        tracks: newTracks.map((track, index) => ({
          ...track,
          position: index
        }))
      });
      return response.json();
    },
    onSuccess: (data) => {
      onPlaylistUpdate(data);
      toast({
        title: "Playlist updated!",
        description: "Track order has been saved.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update playlist",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });
  
  const getAudioFeatures = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/playlists/${playlist.id}/audio-features`);
      return response.json();
    },
    onSuccess: (data) => {
      setTracks(data.tracks);
      onPlaylistUpdate(data);
      toast({
        title: "Audio features loaded!",
        description: "Advanced sorting options are now available.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to load audio features",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });
  
  const sortTracks = (sortKey: string, order: "asc" | "desc") => {
    const sorted = [...tracks].sort((a, b) => {
      let aVal: number, bVal: number;
      
      switch (sortKey) {
        case "bpm":
          aVal = a.tempo || 0;
          bVal = b.tempo || 0;
          break;
        case "energy":
          aVal = a.energy || 0;
          bVal = b.energy || 0;
          break;
        case "mood":
          aVal = a.valence || 0;
          bVal = b.valence || 0;
          break;
        case "danceability":
          aVal = a.danceability || 0;
          bVal = b.danceability || 0;
          break;
        case "popularity":
          aVal = a.popularity || 0;
          bVal = b.popularity || 0;
          break;
        case "duration":
          aVal = a.duration || 0;
          bVal = b.duration || 0;
          break;
        case "acousticness":
          aVal = a.acousticness || 0;
          bVal = b.acousticness || 0;
          break;
        default:
          return 0;
      }
      
      return order === "asc" ? aVal - bVal : bVal - aVal;
    });
    
    setTracks(sorted);
    setSortBy(sortKey);
    setSortOrder(order);
  };
  
  const filterTracks = () => {
    const filtered = playlist.tracks.filter((track: Track) => {
      const energy = track.energy || 0;
      const bpm = track.tempo || 0;
      const mood = track.valence || 0;
      
      return (
        energy >= energyFilter[0] && energy <= energyFilter[1] &&
        bpm >= bpmFilter[0] && bpm <= bpmFilter[1] &&
        mood >= moodFilter[0] && mood <= moodFilter[1]
      );
    });
    
    setTracks(filtered);
  };
  
  const shuffleTracks = () => {
    const shuffled = [...tracks].sort(() => Math.random() - 0.5);
    setTracks(shuffled);
  };
  
  const createMoodJourney = () => {
    // Create a mood journey: sad → neutral → happy
    const sortedByMood = [...tracks].sort((a, b) => (a.valence || 0) - (b.valence || 0));
    const journey = [];
    
    // Start with sad (low valence)
    const sad = sortedByMood.slice(0, Math.floor(sortedByMood.length / 3));
    // Middle with neutral
    const neutral = sortedByMood.slice(Math.floor(sortedByMood.length / 3), Math.floor(sortedByMood.length * 2 / 3));
    // End with happy (high valence)
    const happy = sortedByMood.slice(Math.floor(sortedByMood.length * 2 / 3));
    
    journey.push(...sad, ...neutral, ...happy);
    setTracks(journey);
  };
  
  const createEnergyBuildup = () => {
    // Sort by energy for gradual buildup
    const sorted = [...tracks].sort((a, b) => (a.energy || 0) - (b.energy || 0));
    setTracks(sorted);
  };
  
  const createBpmGradient = () => {
    // Sort by BPM for tempo progression
    const sorted = [...tracks].sort((a, b) => (a.tempo || 0) - (b.tempo || 0));
    setTracks(sorted);
  };
  
  const resetOrder = () => {
    setTracks(playlist.tracks);
    setSortBy("");
  };
  
  const applyChanges = () => {
    updatePlaylistTracks.mutate(tracks);
  };
  
  const hasAudioFeatures = tracks.some(track => track.energy !== undefined);
  
  return (
    <Card className="bg-black/30 backdrop-blur-sm border-gray-800 mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <ArrowUpDown className="w-5 h-5" />
          Advanced Playlist Editor
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-gray-800/50">
            <TabsTrigger value="sort" className="flex items-center gap-2">
              <SortAsc className="w-4 h-4" />
              Sort & Order
            </TabsTrigger>
            <TabsTrigger value="filter" className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filter
            </TabsTrigger>
            <TabsTrigger value="smart" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Smart Arrangements
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="sort" className="space-y-4">
            {!hasAudioFeatures && (
              <div className="bg-orange-500/20 border border-orange-500/30 rounded-lg p-4">
                <p className="text-orange-200 mb-3">
                  Load audio features to unlock advanced sorting options like BPM, energy, and mood.
                </p>
                <Button
                  onClick={() => getAudioFeatures.mutate()}
                  disabled={getAudioFeatures.isPending}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {getAudioFeatures.isPending ? "Loading..." : "Load Audio Features"}
                </Button>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-white text-sm font-medium">Sort By</label>
                <Select value={sortBy} onValueChange={(value) => sortTracks(value, sortOrder)}>
                  <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white">
                    <SelectValue placeholder="Choose sort criteria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="duration">Duration</SelectItem>
                    <SelectItem value="popularity">Popularity</SelectItem>
                    {hasAudioFeatures && (
                      <>
                        <SelectItem value="bpm">BPM (Tempo)</SelectItem>
                        <SelectItem value="energy">Energy</SelectItem>
                        <SelectItem value="mood">Mood (Valence)</SelectItem>
                        <SelectItem value="danceability">Danceability</SelectItem>
                        <SelectItem value="acousticness">Acousticness</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-white text-sm font-medium">Order</label>
                <Select value={sortOrder} onValueChange={(value: "asc" | "desc") => {
                  setSortOrder(value);
                  if (sortBy) sortTracks(sortBy, value);
                }}>
                  <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">
                      <div className="flex items-center gap-2">
                        <SortAsc className="w-4 h-4" />
                        Ascending
                      </div>
                    </SelectItem>
                    <SelectItem value="desc">
                      <div className="flex items-center gap-2">
                        <SortDesc className="w-4 h-4" />
                        Descending
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={shuffleTracks}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                <Shuffle className="w-4 h-4 mr-2" />
                Shuffle
              </Button>
              <Button
                onClick={resetOrder}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Reset Order
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="filter" className="space-y-4">
            {!hasAudioFeatures ? (
              <div className="text-center py-8">
                <p className="text-gray-400 mb-4">Load audio features to use advanced filters</p>
                <Button
                  onClick={() => getAudioFeatures.mutate()}
                  disabled={getAudioFeatures.isPending}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {getAudioFeatures.isPending ? "Loading..." : "Load Audio Features"}
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-white text-sm font-medium">
                      Energy Level: {energyFilter[0].toFixed(1)} - {energyFilter[1].toFixed(1)}
                    </label>
                    <Slider
                      value={energyFilter}
                      onValueChange={(val) =>
                        setEnergyFilter(val as [number, number])
                      }
                      max={1}
                      min={0}
                      step={0.1}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-white text-sm font-medium">
                      BPM Range: {bpmFilter[0]} - {bpmFilter[1]}
                    </label>
                    <Slider
                      value={bpmFilter}
                      onValueChange={(val) =>
                        setBpmFilter(val as [number, number])
                      }
                      max={200}
                      min={60}
                      step={1}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-white text-sm font-medium">
                      Mood (Valence): {moodFilter[0].toFixed(1)} - {moodFilter[1].toFixed(1)}
                    </label>
                    <Slider
                      value={moodFilter}
                      onValueChange={(val) =>
                        setMoodFilter(val as [number, number])
                      }
                      max={1}
                      min={0}
                      step={0.1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Sad</span>
                      <span>Happy</span>
                    </div>
                  </div>
                </div>
                
                <Button
                  onClick={filterTracks}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Apply Filters
                </Button>
              </>
            )}
          </TabsContent>
          
          <TabsContent value="smart" className="space-y-4">
            {!hasAudioFeatures ? (
              <div className="text-center py-8">
                <p className="text-gray-400 mb-4">Load audio features to use smart arrangements</p>
                <Button
                  onClick={() => getAudioFeatures.mutate()}
                  disabled={getAudioFeatures.isPending}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {getAudioFeatures.isPending ? "Loading..." : "Load Audio Features"}
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-gray-800/50 border-gray-700 hover:bg-gray-700/50 cursor-pointer transition-colors" onClick={createMoodJourney}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Heart className="w-5 h-5 text-pink-400" />
                      <h3 className="text-white font-medium">Mood Journey</h3>
                    </div>
                    <p className="text-gray-400 text-sm">Arrange tracks from sad to happy for emotional progression</p>
                  </CardContent>
                </Card>
                
                <Card className="bg-gray-800/50 border-gray-700 hover:bg-gray-700/50 cursor-pointer transition-colors" onClick={createEnergyBuildup}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Zap className="w-5 h-5 text-yellow-400" />
                      <h3 className="text-white font-medium">Energy Buildup</h3>
                    </div>
                    <p className="text-gray-400 text-sm">Gradually increase energy levels throughout the playlist</p>
                  </CardContent>
                </Card>
                
                <Card className="bg-gray-800/50 border-gray-700 hover:bg-gray-700/50 cursor-pointer transition-colors" onClick={createBpmGradient}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Music className="w-5 h-5 text-blue-400" />
                      <h3 className="text-white font-medium">BPM Gradient</h3>
                    </div>
                    <p className="text-gray-400 text-sm">Arrange by tempo for smooth rhythm transitions</p>
                  </CardContent>
                </Card>
                
                <Card className="bg-gray-800/50 border-gray-700 hover:bg-gray-700/50 cursor-pointer transition-colors" onClick={() => sortTracks("danceability", "desc")}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Volume2 className="w-5 h-5 text-purple-400" />
                      <h3 className="text-white font-medium">Danceability Sort</h3>
                    </div>
                    <p className="text-gray-400 text-sm">Order tracks by how danceable they are</p>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        <div className="mt-6 pt-4 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-gray-700 text-gray-300">
                {tracks.length} tracks
              </Badge>
              {sortBy && (
                <Badge variant="outline" className="border-purple-500 text-purple-300">
                  Sorted by {sortBy} ({sortOrder})
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={resetOrder}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Reset
              </Button>
              <Button
                onClick={applyChanges}
                disabled={updatePlaylistTracks.isPending}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
              >
                {updatePlaylistTracks.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}