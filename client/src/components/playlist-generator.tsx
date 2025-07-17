import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Music, Zap, Brain, Clock, Users, Palette, Settings, Sparkles } from "lucide-react";

interface PlaylistConfig {
  // Basic
  prompt: string;
  name: string;
  description: string;
  
  // Vibe & Theme
  vibe: string;
  mood: string;
  scene: string;
  energyScale: number;
  darknessScale: number;
  emotionalTone: string;
  
  // Audio Features
  targetEnergy: number;
  targetDanceability: number;
  targetAcousticness: number;
  targetInstrumentalness: number;
  targetLiveness: number;
  targetSpeechiness: number;
  targetValence: number;
  targetTempo: number;
  audioKey: string;
  musicalMode: string;
  
  // Time & Era
  decadeFilter: string[];
  yearRangeStart: number;
  yearRangeEnd: number;
  onlyNewMusic: boolean;
  onlyThrowbacks: boolean;
  mixedEra: boolean;
  
  // Artist/Track/Genre
  seedArtists: string[];
  seedGenres: string[];
  includeSpecificTracks: string[];
  excludeArtists: string[];
  excludeGenres: string[];
  excludeTracks: string[];
  avoidOverplayed: boolean;
  onlyUnderground: boolean;
  popularityThreshold: number;
  
  // Structure
  targetTrackCount: number;
  targetDurationMin: number;
  targetDurationMax: number;
  storyArcMode: boolean;
  segmentedMode: boolean;
  
  // Style & Customization
  styleFusion: string[];
  randomnessLevel: number;
  balanceHitsGems: number;
  explicitLyrics: string;
  smartLyrics: boolean;
  languageSpecific: string;
  
  // Template
  templateUsed: string;
}

const PLAYLIST_TEMPLATES = [
  { id: "study-vengeance", name: "Study with a vengeance", prompt: "aggressive focus music for intense study sessions" },
  { id: "apocalypse-road", name: "Road trip into the apocalypse", prompt: "dark driving music for the end times" },
  { id: "main-character", name: "Songs that scream main character", prompt: "music that makes you feel like the protagonist" },
  { id: "villain-origin", name: "Villain origin story", prompt: "dark transformation music for becoming the villain" },
  { id: "cowboy-rave", name: "Cowboy-core but make it rave", prompt: "western vibes mixed with electronic dance music" },
  { id: "hyperpop-breakup", name: "Hyperpop breakup recovery arc", prompt: "chaotic hyperpop for getting over someone" },
  { id: "fantasy-rpg", name: "Fantasy RPG soundtrack but modern", prompt: "epic fantasy vibes with contemporary production" },
  { id: "tarantino-movie", name: "Make this playlist feel like a Quentin Tarantino movie", prompt: "cinematic, eclectic, and slightly dangerous" },
];

const MOODS = ["happy", "sad", "angry", "romantic", "chaotic", "sleepy", "nostalgic", "rebellious", "dreamy", "mellow", "epic", "sensual", "quirky"];
const DECADES = ["1960s", "1970s", "1980s", "1990s", "2000s", "2010s", "2020s"];
const AUDIO_KEYS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const MUSICAL_MODES = ["Major", "Minor"];
const EXPLICIT_OPTIONS = ["allow", "filter", "prefer_clean"];

export default function PlaylistGenerator({ onPlaylistGenerated, templatePrompt, onTemplateUsed }: { 
  onPlaylistGenerated: (playlist: any) => void;
  templatePrompt?: string;
  onTemplateUsed?: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [config, setConfig] = useState<PlaylistConfig>({
    prompt: "",
    name: "",
    description: "",
    vibe: "",
    mood: "",
    scene: "",
    energyScale: 5,
    darknessScale: 5,
    emotionalTone: "",
    targetEnergy: 0.5,
    targetDanceability: 0.5,
    targetAcousticness: 0.5,
    targetInstrumentalness: 0.5,
    targetLiveness: 0.5,
    targetSpeechiness: 0.5,
    targetValence: 0.5,
    targetTempo: 120,
    audioKey: "",
    musicalMode: "",
    decadeFilter: [],
    yearRangeStart: 1960,
    yearRangeEnd: 2024,
    onlyNewMusic: false,
    onlyThrowbacks: false,
    mixedEra: false,
    seedArtists: [],
    seedGenres: [],
    includeSpecificTracks: [],
    excludeArtists: [],
    excludeGenres: [],
    excludeTracks: [],
    avoidOverplayed: false,
    onlyUnderground: false,
    popularityThreshold: 50,
    targetTrackCount: 20,
    targetDurationMin: 30,
    targetDurationMax: 90,
    storyArcMode: false,
    segmentedMode: false,
    styleFusion: [],
    randomnessLevel: 5,
    balanceHitsGems: 5,
    explicitLyrics: "allow",
    smartLyrics: false,
    languageSpecific: "",
    templateUsed: "",
  });

  const [promptSuggestions, setPromptSuggestions] = useState<string[]>([]);

  const [activeTab, setActiveTab] = useState("basic");

  useEffect(() => {
    const text = config.prompt.trim();
    if (!text) {
      setPromptSuggestions([]);
      return;
    }
    const handle = setTimeout(() => {
      apiRequest(
        "GET",
        `/api/prompts/suggest?text=${encodeURIComponent(text)}`
      )
        .then(res => res.json())
        .then(data => setPromptSuggestions(data.suggestions || []))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(handle);
  }, [config.prompt]);
  
  const generatePlaylist = useMutation({
    mutationFn: async (config: PlaylistConfig) => {
      const response = await apiRequest("POST", "/api/playlists/generate-advanced", config);
      return response.json();
    },
    onSuccess: (data) => {
      onPlaylistGenerated(data);
      toast({
        title: "Playlist generated!",
        description: `Created "${data.name}" with ${data.tracks.length} tracks.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to generate playlist",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });
  
  const applyTemplate = (template: any) => {
    setConfig(prev => ({
      ...prev,
      prompt: template.prompt,
      name: template.name,
      templateUsed: template.id,
    }));
  };
  
  const addToArray = (field: keyof PlaylistConfig, value: string) => {
    setConfig(prev => ({
      ...prev,
      [field]: [...(prev[field] as string[]), value],
    }));
  };
  
  const removeFromArray = (field: keyof PlaylistConfig, index: number) => {
    setConfig(prev => ({
      ...prev,
      [field]: (prev[field] as string[]).filter((_, i) => i !== index),
    }));
  };
  
  const tabs = [
    { id: "basic", label: "Basic", icon: Music },
    { id: "vibe", label: "Vibe & Theme", icon: Palette },
    { id: "audio", label: "Audio Features", icon: Zap },
    { id: "time", label: "Time & Era", icon: Clock },
    { id: "artists", label: "Artists & Genres", icon: Users },
    { id: "structure", label: "Structure", icon: Settings },
    { id: "style", label: "Style & AI", icon: Brain },
    { id: "templates", label: "Templates", icon: Sparkles },
  ];
  
  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Advanced Playlist Generator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Create the perfect playlist with AI-powered precision controls
        </p>
      </div>
      
      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 justify-center border-b">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "ghost"}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2"
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </Button>
          );
        })}
      </div>
      
      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === "basic" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Music className="w-5 h-5" />
                Basic Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 relative">
                <Label htmlFor="prompt">Main Prompt</Label>
                <Textarea
                  id="prompt"
                  placeholder="Describe your ideal playlist... (e.g., sad indie girl autumn vibes)"
                  value={config.prompt}
                  onChange={(e) => setConfig(prev => ({ ...prev, prompt: e.target.value }))}
                  className="min-h-[100px]"
                />
                {promptSuggestions.length > 0 && (
                  <ul className="absolute z-10 w-full bg-popover border mt-1 rounded-md max-h-40 overflow-y-auto">
                    {promptSuggestions.map((s) => (
                      <li key={s}>
                        <button
                          type="button"
                          onClick={() => {
                            setConfig(prev => ({ ...prev, prompt: s }));
                            setPromptSuggestions([]);
                          }}
                          className="w-full text-left px-2 py-1 hover:bg-muted"
                        >
                          {s}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Playlist Name</Label>
                  <Input
                    id="name"
                    placeholder="My Awesome Playlist"
                    value={config.name}
                    onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="Brief description"
                    value={config.description}
                    onChange={(e) => setConfig(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {activeTab === "vibe" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Vibe & Theme Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vibe">Specific Vibe</Label>
                  <Input
                    id="vibe"
                    placeholder="e.g., sad indie girl autumn, GTA loading screen music"
                    value={config.vibe}
                    onChange={(e) => setConfig(prev => ({ ...prev, vibe: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scene">Scene Description</Label>
                  <Input
                    id="scene"
                    placeholder="e.g., songs to walk home to after getting dumped"
                    value={config.scene}
                    onChange={(e) => setConfig(prev => ({ ...prev, scene: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="mood">Mood</Label>
                <Select value={config.mood} onValueChange={(value) => setConfig(prev => ({ ...prev, mood: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select mood" />
                  </SelectTrigger>
                  <SelectContent>
                    {MOODS.map(mood => (
                      <SelectItem key={mood} value={mood}>{mood}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Energy Scale: {config.energyScale}/10</Label>
                  <Slider
                    value={[config.energyScale]}
                    onValueChange={([value]) => setConfig(prev => ({ ...prev, energyScale: value }))}
                    max={10}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Calm</span>
                    <span>Hype</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Darkness Scale: {config.darknessScale}/10</Label>
                  <Slider
                    value={[config.darknessScale]}
                    onValueChange={([value]) => setConfig(prev => ({ ...prev, darknessScale: value }))}
                    max={10}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Sunny</span>
                    <span>Sinister</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="emotional-tone">Emotional Tone</Label>
                <Input
                  id="emotional-tone"
                  placeholder="e.g., dreamy, rebellious, mellow, epic"
                  value={config.emotionalTone}
                  onChange={(e) => setConfig(prev => ({ ...prev, emotionalTone: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>
        )}
        
        {activeTab === "audio" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Audio Features (Spotify Analysis)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Energy: {config.targetEnergy.toFixed(1)}</Label>
                  <Slider
                    value={[config.targetEnergy]}
                    onValueChange={([value]) => setConfig(prev => ({ ...prev, targetEnergy: value }))}
                    max={1}
                    min={0}
                    step={0.1}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Danceability: {config.targetDanceability.toFixed(1)}</Label>
                  <Slider
                    value={[config.targetDanceability]}
                    onValueChange={([value]) => setConfig(prev => ({ ...prev, targetDanceability: value }))}
                    max={1}
                    min={0}
                    step={0.1}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Acousticness: {config.targetAcousticness.toFixed(1)}</Label>
                  <Slider
                    value={[config.targetAcousticness]}
                    onValueChange={([value]) => setConfig(prev => ({ ...prev, targetAcousticness: value }))}
                    max={1}
                    min={0}
                    step={0.1}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Instrumentalness: {config.targetInstrumentalness.toFixed(1)}</Label>
                  <Slider
                    value={[config.targetInstrumentalness]}
                    onValueChange={([value]) => setConfig(prev => ({ ...prev, targetInstrumentalness: value }))}
                    max={1}
                    min={0}
                    step={0.1}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valence (Happiness): {config.targetValence.toFixed(1)}</Label>
                  <Slider
                    value={[config.targetValence]}
                    onValueChange={([value]) => setConfig(prev => ({ ...prev, targetValence: value }))}
                    max={1}
                    min={0}
                    step={0.1}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Speechiness: {config.targetSpeechiness.toFixed(1)}</Label>
                  <Slider
                    value={[config.targetSpeechiness]}
                    onValueChange={([value]) => setConfig(prev => ({ ...prev, targetSpeechiness: value }))}
                    max={1}
                    min={0}
                    step={0.1}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>BPM: {config.targetTempo}</Label>
                  <Slider
                    value={[config.targetTempo]}
                    onValueChange={([value]) => setConfig(prev => ({ ...prev, targetTempo: value }))}
                    max={200}
                    min={60}
                    step={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Audio Key</Label>
                  <Select value={config.audioKey} onValueChange={(value) => setConfig(prev => ({ ...prev, audioKey: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any key" />
                    </SelectTrigger>
                    <SelectContent>
                      {AUDIO_KEYS.map(key => (
                        <SelectItem key={key} value={key}>{key}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Musical Mode</Label>
                  <Select value={config.musicalMode} onValueChange={(value) => setConfig(prev => ({ ...prev, musicalMode: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any mode" />
                    </SelectTrigger>
                    <SelectContent>
                      {MUSICAL_MODES.map(mode => (
                        <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {activeTab === "time" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Time & Era Control
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Decade Filters</Label>
                <div className="flex flex-wrap gap-2">
                  {DECADES.map(decade => (
                    <Badge
                      key={decade}
                      variant={config.decadeFilter.includes(decade) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        if (config.decadeFilter.includes(decade)) {
                          setConfig(prev => ({ ...prev, decadeFilter: prev.decadeFilter.filter(d => d !== decade) }));
                        } else {
                          setConfig(prev => ({ ...prev, decadeFilter: [...prev.decadeFilter, decade] }));
                        }
                      }}
                    >
                      {decade}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Year Range Start</Label>
                  <Input
                    type="number"
                    value={config.yearRangeStart}
                    onChange={(e) => setConfig(prev => ({ ...prev, yearRangeStart: parseInt(e.target.value) }))}
                    min="1900"
                    max="2024"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Year Range End</Label>
                  <Input
                    type="number"
                    value={config.yearRangeEnd}
                    onChange={(e) => setConfig(prev => ({ ...prev, yearRangeEnd: parseInt(e.target.value) }))}
                    min="1900"
                    max="2024"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="only-new"
                    checked={config.onlyNewMusic}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, onlyNewMusic: checked as boolean }))}
                  />
                  <Label htmlFor="only-new">Only new music (past 6 months)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="only-throwbacks"
                    checked={config.onlyThrowbacks}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, onlyThrowbacks: checked as boolean }))}
                  />
                  <Label htmlFor="only-throwbacks">Only throwbacks (pre-2010)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="mixed-era"
                    checked={config.mixedEra}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, mixedEra: checked as boolean }))}
                  />
                  <Label htmlFor="mixed-era">Mixed era mode</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {activeTab === "artists" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Artists & Genres
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Seed Artists</Label>
                  <Input
                    placeholder="Add artist and press Enter"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.currentTarget.value) {
                        addToArray('seedArtists', e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                  <div className="flex flex-wrap gap-1">
                    {config.seedArtists.map((artist, index) => (
                      <Badge key={index} variant="secondary" className="cursor-pointer" onClick={() => removeFromArray('seedArtists', index)}>
                        {artist} ×
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Seed Genres</Label>
                  <Input
                    placeholder="Add genre and press Enter"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.currentTarget.value) {
                        addToArray('seedGenres', e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                  <div className="flex flex-wrap gap-1">
                    {config.seedGenres.map((genre, index) => (
                      <Badge key={index} variant="secondary" className="cursor-pointer" onClick={() => removeFromArray('seedGenres', index)}>
                        {genre} ×
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="avoid-overplayed"
                    checked={config.avoidOverplayed}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, avoidOverplayed: checked as boolean }))}
                  />
                  <Label htmlFor="avoid-overplayed">Avoid overplayed artists</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="only-underground"
                    checked={config.onlyUnderground}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, onlyUnderground: checked as boolean }))}
                  />
                  <Label htmlFor="only-underground">Only underground artists</Label>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Popularity Threshold: {config.popularityThreshold}/100</Label>
                <Slider
                  value={[config.popularityThreshold]}
                  onValueChange={([value]) => setConfig(prev => ({ ...prev, popularityThreshold: value }))}
                  max={100}
                  min={0}
                  step={1}
                />
              </div>
            </CardContent>
          </Card>
        )}
        
        {activeTab === "structure" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Playlist Structure
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Track Count: {config.targetTrackCount}</Label>
                  <Slider
                    value={[config.targetTrackCount]}
                    onValueChange={([value]) => setConfig(prev => ({ ...prev, targetTrackCount: value }))}
                    max={100}
                    min={5}
                    step={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Min Duration (minutes): {config.targetDurationMin}</Label>
                  <Slider
                    value={[config.targetDurationMin]}
                    onValueChange={([value]) => setConfig(prev => ({ ...prev, targetDurationMin: value }))}
                    max={180}
                    min={10}
                    step={5}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Duration (minutes): {config.targetDurationMax}</Label>
                  <Slider
                    value={[config.targetDurationMax]}
                    onValueChange={([value]) => setConfig(prev => ({ ...prev, targetDurationMax: value }))}
                    max={240}
                    min={20}
                    step={5}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="story-arc"
                    checked={config.storyArcMode}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, storyArcMode: checked as boolean }))}
                  />
                  <Label htmlFor="story-arc">Story arc mode (slow → upbeat → climax → cooldown)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="segmented"
                    checked={config.segmentedMode}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, segmentedMode: checked as boolean }))}
                  />
                  <Label htmlFor="segmented">Segmented mode (intro → middle → outro)</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {activeTab === "style" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Style & AI Customization
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Style Fusion</Label>
                <Input
                  placeholder="Add style and press Enter (e.g., jazz + trap)"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value) {
                      addToArray('styleFusion', e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                />
                <div className="flex flex-wrap gap-1">
                  {config.styleFusion.map((style, index) => (
                    <Badge key={index} variant="secondary" className="cursor-pointer" onClick={() => removeFromArray('styleFusion', index)}>
                      {style} ×
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Randomness Level: {config.randomnessLevel}/10</Label>
                  <Slider
                    value={[config.randomnessLevel]}
                    onValueChange={([value]) => setConfig(prev => ({ ...prev, randomnessLevel: value }))}
                    max={10}
                    min={1}
                    step={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hits vs Gems: {config.balanceHitsGems}/10</Label>
                  <Slider
                    value={[config.balanceHitsGems]}
                    onValueChange={([value]) => setConfig(prev => ({ ...prev, balanceHitsGems: value }))}
                    max={10}
                    min={1}
                    step={1}
                  />
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Hidden Gems</span>
                    <span>Popular Hits</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Explicit Lyrics</Label>
                <Select value={config.explicitLyrics} onValueChange={(value) => setConfig(prev => ({ ...prev, explicitLyrics: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPLICIT_OPTIONS.map(option => (
                      <SelectItem key={option} value={option}>{option.replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="smart-lyrics"
                    checked={config.smartLyrics}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, smartLyrics: checked as boolean }))}
                  />
                  <Label htmlFor="smart-lyrics">Smart lyrics (emphasize lyrical content)</Label>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Language Specific</Label>
                <Input
                  placeholder="e.g., French, Spanish, Korean"
                  value={config.languageSpecific}
                  onChange={(e) => setConfig(prev => ({ ...prev, languageSpecific: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>
        )}
        
        {activeTab === "templates" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Quick Templates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PLAYLIST_TEMPLATES.map(template => (
                  <div key={template.id} className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors" onClick={() => applyTemplate(template)}>
                    <h3 className="font-semibold mb-2">{template.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{template.prompt}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Generate Button */}
      <div className="flex justify-center">
        <Button
          onClick={() => generatePlaylist.mutate(config)}
          disabled={generatePlaylist.isPending || !config.prompt}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-3 text-lg font-semibold"
        >
          {generatePlaylist.isPending ? "Generating..." : "Generate Playlist"}
        </Button>
      </div>
    </div>
  );
}