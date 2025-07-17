import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import LoadingModal from "@/components/loading-modal";

const promptSuggestions = [
  "90s road trip vibes",
  "Focus music for coding",
  "Workout pump-up songs",
  "Sad girl indie for a rainy night",
  "Villain arc dark electronic",
  "Main character moment songs",
  "Cozy coffee shop acoustic",
  "Late night study session",
];

export default function PromptGenerator() {
  const [prompt, setPrompt] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const generatePlaylist = useMutation({
    mutationFn: async (promptText: string) => {
      const response = await apiRequest("POST", "/api/playlists/generate", { prompt: promptText });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
      queryClient.setQueryData(["/api/playlists", "current"], data);
      toast({
        title: "Playlist generated!",
        description: `Created "${data.name}" with ${data.tracks.length} songs.`,
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      generatePlaylist.mutate(prompt.trim());
    }
  };

  const useSuggestion = (suggestion: string) => {
    setPrompt(suggestion);
  };

  return (
    <div id="generator" className="gradient-bg rounded-xl p-8 mb-8">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-4">Create Your Perfect Playlist</h2>
        <p className="text-gray-300 mb-8">
          Describe the vibe, mood, or genre you want, and let AI craft the perfect playlist for you.
        </p>
        
        <form onSubmit={handleSubmit} className="relative mb-6">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full spotify-bg border-gray-600 rounded-lg p-4 text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            rows={3}
            placeholder="e.g., 'I need sad girl indie for a rainy night in 2007' or 'Create a villain arc playlist with dark electronic music'"
            disabled={generatePlaylist.isPending}
          />
          <Button
            type="submit"
            disabled={!prompt.trim() || generatePlaylist.isPending}
            className="absolute bottom-4 right-4 spotify-green hover:bg-green-600 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            <i className="fas fa-magic mr-2"></i>
            {generatePlaylist.isPending ? "Generating..." : "Generate"}
          </Button>
        </form>

        <div className="flex flex-wrap gap-2 justify-center">
          <span className="text-sm text-gray-400">Try:</span>
          {promptSuggestions.map((suggestion) => (
            <Button
              key={suggestion}
              variant="outline"
              size="sm"
              onClick={() => useSuggestion(suggestion)}
              className="spotify-lightgray hover-spotify-gray text-sm px-4 py-2 rounded-full transition-colors border-gray-600 hover:border-gray-500"
            >
              {suggestion}
            </Button>
          ))}
        </div>
      </div>

      <LoadingModal isOpen={generatePlaylist.isPending} />
    </div>
  );
}
