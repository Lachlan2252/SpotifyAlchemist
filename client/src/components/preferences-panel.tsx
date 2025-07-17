import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { preferencesApi } from "@/lib/api";

export default function PreferencesPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data } = useQuery<any>({
    queryKey: ["/api/preferences"],
    queryFn: preferencesApi.get,
  });

  const [genres, setGenres] = useState("");
  const [artists, setArtists] = useState("");
  const [bannedTerms, setBannedTerms] = useState("");
  const [bannedArtists, setBannedArtists] = useState("");
  const [bannedGenres, setBannedGenres] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");

  useEffect(() => {
    if (data) {
      setGenres((data.favoriteGenres || []).join(", "));
      setArtists((data.favoriteArtists || []).join(", "));
      setBannedTerms((data.bannedTerms || []).join(", "));
      setBannedArtists((data.bannedArtists || []).join(", "));
      setBannedGenres((data.bannedGenres || []).join(", "));
    }
    const storedKey = localStorage.getItem("openai_api_key");
    if (storedKey) setOpenaiKey(storedKey);
  }, [data]);

  useEffect(() => {
    if (openaiKey) {
      localStorage.setItem("openai_api_key", openaiKey);
    } else {
      localStorage.removeItem("openai_api_key");
    }
  }, [openaiKey]);

  const savePrefs = useMutation({
    mutationFn: async () => {
      const payload = {
        favoriteGenres: genres.split(",").map(s => s.trim()).filter(Boolean),
        favoriteArtists: artists.split(",").map(s => s.trim()).filter(Boolean),
        bannedTerms: bannedTerms.split(",").map(s => s.trim()).filter(Boolean),
        bannedArtists: bannedArtists.split(",").map(s => s.trim()).filter(Boolean),
        bannedGenres: bannedGenres.split(",").map(s => s.trim()).filter(Boolean),
      };
      return preferencesApi.update(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/preferences"] });
      toast({ title: "Preferences saved" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    }
  });

  return (
    <div className="spotify-gray rounded-xl p-6 space-y-4">
      <h2 className="text-xl font-bold">Preferences</h2>
      <div>
        <label className="text-sm">Favorite Genres</label>
        <Input value={genres} onChange={e => setGenres(e.target.value)} placeholder="rock, pop" />
      </div>
      <div>
        <label className="text-sm">Favorite Artists</label>
        <Input value={artists} onChange={e => setArtists(e.target.value)} placeholder="artist names" />
      </div>
      <div>
        <label className="text-sm">Banned Terms</label>
        <Input value={bannedTerms} onChange={e => setBannedTerms(e.target.value)} placeholder="explicit words" />
      </div>
      <div>
        <label className="text-sm">Banned Artists</label>
        <Input value={bannedArtists} onChange={e => setBannedArtists(e.target.value)} placeholder="artists to exclude" />
      </div>
      <div>
        <label className="text-sm">Banned Genres</label>
        <Input value={bannedGenres} onChange={e => setBannedGenres(e.target.value)} placeholder="genres to exclude" />
      </div>
      <div>
        <label className="text-sm">OpenAI API Key</label>
        <Input
          value={openaiKey}
          onChange={e => setOpenaiKey(e.target.value)}
          placeholder="sk-..."
          type="password"
        />
        <p className="text-xs text-gray-400 mt-1">Stored locally in your browser</p>
      </div>
      <Button onClick={() => savePrefs.mutate()} disabled={savePrefs.isPending}>
        {savePrefs.isPending ? "Saving..." : "Save"}
      </Button>
    </div>
  );
}
