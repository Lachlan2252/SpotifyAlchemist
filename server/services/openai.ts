import OpenAI from "openai";
import { type UserPreferences } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR;
if (!apiKey) {
  throw new Error(
    "OpenAI API key not found. Set OPENAI_API_KEY or OPENAI_API_KEY_ENV_VAR"
  );
}
const openai = new OpenAI({
  apiKey
});

const energySynonyms = ["hype", "banger", "turn up"]; // words implying high energy

function normalizePrompt(prompt: string): { text: string; mood?: string } {
  let text = prompt;
  for (const word of energySynonyms) {
    if (prompt.toLowerCase().includes(word)) {
      if (!/high energy|energetic/.test(prompt.toLowerCase())) {
        text += " high energy";
      }
      break;
    }
  }

  const moodMap: Record<string, string> = {
    "🌧️": "rainy",
    "😢": "sad",
    "😭": "sad",
    "💔": "heartbreak",
    "🔥": "intense",
    "😍": "romantic",
  };
  for (const [emoji, mood] of Object.entries(moodMap)) {
    if (prompt.includes(emoji)) {
      text = text.replace(emoji, "");
      return { text: text.trim(), mood };
    }
  }

  return { text: text.trim() };
}

export interface PlaylistRequest {
  prompt: string;
  userId: number;
  preferences?: UserPreferences | undefined;
  existingTracks?: string[];
}

export interface PlaylistResponse {
  name: string;
  description: string;
  searchQueries: string[];
  genre: string;
  mood: string;
  energy: number;
  coverArtPrompt?: string;
}

export interface TrackModificationRequest {
  action: "add_similar" | "replace_overplayed" | "reorder_by_mood" | "follow_up";
  currentTracks: Array<{
    name: string;
    artist: string;
    album: string;
  }>;
  prompt?: string;
}

export interface TrackModificationResponse {
  searchQueries?: string[];
  trackRemovals?: number[];
  reorderedPositions?: number[];
  reasoning: string;
}

export interface PlaylistCriteria {
  seed_genres: string[];
  seed_artists: string[];
  audio_features: {
    target_valence: number;
    target_energy: number;
    target_danceability: number;
    target_tempo: number;
  };
}

export async function generatePlaylistFromPrompt(request: PlaylistRequest): Promise<PlaylistResponse> {
  try {
    const normalized = normalizePrompt(request.prompt);
    const pref = request.preferences;
    const prefDetails = pref ? `User preferences:\n- Favorite genres: ${((pref.favoriteGenres as string[] | undefined) || []).join(', ')}\n- Favorite artists: ${((pref.favoriteArtists as string[] | undefined) || []).join(', ')}\n- Avoid genres: ${((pref.bannedGenres as string[] | undefined) || []).join(', ')}\n- Avoid artists: ${((pref.bannedArtists as string[] | undefined) || []).join(', ')}\n- Banned terms: ${((pref.bannedTerms as string[] | undefined) || []).join(', ')}` : '';
    const systemPrompt = `You are a music expert AI that creates Spotify playlists based on natural language descriptions.
    ${prefDetails}
    Given a prompt, generate a playlist with a name, description, and search queries for finding appropriate tracks.
    
    The user's prompt might describe:
    - Mood or vibe (e.g., "sad girl indie", "villain arc", "main character moment")
    - Genre preferences
    - Time period or era
    - Activities or contexts
    - Specific artists or songs as reference points
    
    Return a JSON object with:
    - name: Creative playlist name that captures the essence
    - description: Brief description of the playlist's vibe
    - searchQueries: Array of 15-25 search terms/phrases to find relevant tracks on Spotify
    - genre: Primary genre category
    - mood: General mood description
    - energy: Energy level from 1-10
    
    Make search queries specific enough to find good matches but varied enough to create diversity.
    Include artist names, song titles, and descriptive terms that would work well with Spotify's search API.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: normalized.text }
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      name: result.name || "AI Generated Playlist",
      description: result.description || "A playlist created by AI",
      searchQueries: result.searchQueries || [],
      genre: result.genre || "Various",
      mood: result.mood || normalized.mood || "Mixed",
      energy: Math.max(1, Math.min(10, result.energy || 5)),
      coverArtPrompt: result.coverArtPrompt,
    };
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to generate playlist from prompt: " + (error as Error).message);
  }
}

export async function modifyPlaylist(request: TrackModificationRequest): Promise<TrackModificationResponse> {
  try {
    let systemPrompt = "";
    
    switch (request.action) {
      case "add_similar":
        systemPrompt = `You are a music expert AI. Given a list of current tracks in a playlist, suggest search queries for finding similar songs that would fit well with the existing vibe. Return JSON with "searchQueries" array and "reasoning" string.`;
        break;
      case "replace_overplayed":
        systemPrompt = `You are a music expert AI. Given a list of current tracks, identify which ones are likely overplayed/mainstream and suggest search queries for finding lesser-known alternatives with similar vibes. Return JSON with "searchQueries" array, "trackRemovals" array of indices to remove, and "reasoning" string.`;
        break;
      case "reorder_by_mood":
        systemPrompt = `You are a music expert AI. Given a list of current tracks, suggest a new order based on energy flow and mood progression. Return JSON with "reorderedPositions" array (new order indices) and "reasoning" string.`;
        break;
      case "follow_up":
        systemPrompt = `You are a music expert AI helping refine an existing playlist. The user will give follow-up instructions to modify the playlist (e.g., make it slower or more upbeat). Return JSON with any combination of "searchQueries", "trackRemovals", "reorderedPositions", and "reasoning".`;
        break;
    }

    const userPrompt = `Current tracks: ${JSON.stringify(request.currentTracks)}
    ${request.prompt ? `Additional context: ${request.prompt}` : ""}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      searchQueries: result.searchQueries || [],
      trackRemovals: result.trackRemovals || [],
      reorderedPositions: result.reorderedPositions || [],
      reasoning: result.reasoning || "No specific reasoning provided",
    };
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to modify playlist: " + (error as Error).message);
  }
}

export async function generateCompletion(systemPrompt: string, userPrompt: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    return response.choices[0].message.content || "";
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to generate completion: " + (error as Error).message);
  }
}

export async function get_playlist_criteria_from_prompt(prompt: string): Promise<PlaylistCriteria> {
  try {
    const systemPrompt = `You are a Music Expert AI with deep knowledge of musical genres, artists, and audio characteristics. 
    Analyze the user's text prompt and extract structured criteria for creating a Spotify playlist using the Spotify Web API.
    
    Your task is to identify:
    1. Relevant music genres (up to 3) that best match the prompt
    2. Relevant artist names (up to 2) that fit the described style or mood
    3. Audio feature targets that align with the described characteristics
    
    Audio features should be values between 0.0 and 1.0, except tempo which is in BPM:
    - target_valence: Musical positiveness (0.0 = sad/negative, 1.0 = happy/positive)
    - target_energy: Energy level (0.0 = low energy, 1.0 = high energy)
    - target_danceability: How suitable for dancing (0.0 = not danceable, 1.0 = very danceable)
    - target_tempo: Tempo in beats per minute (typical range: 60-200 BPM)
    
    Return a JSON object with this exact structure:
    {
      "seed_genres": ["genre1", "genre2", "genre3"],
      "seed_artists": ["artist1", "artist2"],
      "audio_features": {
        "target_valence": 0.5,
        "target_energy": 0.5,
        "target_danceability": 0.5,
        "target_tempo": 120
      }
    }
    
    Base your analysis on the mood, style, energy level, and any specific references in the prompt.
    Use standard Spotify genre names and well-known artist names.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    // Validate and normalize the response
    return {
      seed_genres: Array.isArray(result.seed_genres) ? result.seed_genres.slice(0, 3) : [],
      seed_artists: Array.isArray(result.seed_artists) ? result.seed_artists.slice(0, 2) : [],
      audio_features: {
        target_valence: Math.max(0.0, Math.min(1.0, result.audio_features?.target_valence || 0.5)),
        target_energy: Math.max(0.0, Math.min(1.0, result.audio_features?.target_energy || 0.5)),
        target_danceability: Math.max(0.0, Math.min(1.0, result.audio_features?.target_danceability || 0.5)),
        target_tempo: Math.max(60, Math.min(200, result.audio_features?.target_tempo || 120)),
      }
    };
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to get playlist criteria from prompt: " + (error as Error).message);
  }
}

export async function generateAdvancedPlaylistFromPrompt(config: any, prefs?: UserPreferences): Promise<any> {
  try {
    // Build a comprehensive prompt incorporating all advanced features
    const prefDetails = prefs ? `User preferences:\n- Favorite genres: ${((prefs.favoriteGenres as string[] | undefined) || []).join(', ')}\n- Favorite artists: ${((prefs.favoriteArtists as string[] | undefined) || []).join(', ')}\n- Avoid genres: ${((prefs.bannedGenres as string[] | undefined) || []).join(', ')}\n- Avoid artists: ${((prefs.bannedArtists as string[] | undefined) || []).join(', ')}\n- Banned terms: ${((prefs.bannedTerms as string[] | undefined) || []).join(', ')}` : '';
    let systemPrompt = `You are an expert AI music curator with deep knowledge of musical genres, artists, decades, and audio characteristics.
    ${prefDetails}
    Generate a playlist based on the provided advanced configuration. Consider all parameters carefully.

    Your task is to create intelligent search queries that will find the perfect tracks for this playlist.
    
    Return JSON format with:
    {
      "name": "playlist name",
      "description": "playlist description",
      "searchQueries": ["query1", "query2", "query3", ...],
      "reasoning": "detailed explanation of your curation choices"
    }`;

    const normalized = normalizePrompt(config.prompt);
    let userPrompt = `Main prompt: ${normalized.text}

Advanced Configuration:
- Vibe: ${config.vibe || "not specified"}
- Mood: ${config.mood || "not specified"}
- Scene: ${config.scene || "not specified"}
- Energy Scale: ${config.energyScale || 5}/10
- Darkness Scale: ${config.darknessScale || 5}/10
- Emotional Tone: ${config.emotionalTone || "not specified"}

Audio Features (0.0-1.0):
- Target Energy: ${config.targetEnergy || 0.5}
- Target Danceability: ${config.targetDanceability || 0.5}
- Target Valence: ${config.targetValence || 0.5}
- Target Tempo: ${config.targetTempo || 120} BPM
- Audio Key: ${config.audioKey || "any"}
- Musical Mode: ${config.musicalMode || "any"}

Time & Era:
- Decades: ${config.decadeFilter?.join(", ") || "any"}
- Year Range: ${config.yearRangeStart || 1960} - ${config.yearRangeEnd || 2024}
- Only New Music: ${config.onlyNewMusic || false}
- Only Throwbacks: ${config.onlyThrowbacks || false}

Artists & Genres:
- Seed Artists: ${config.seedArtists?.join(", ") || "none"}
- Seed Genres: ${config.seedGenres?.join(", ") || "none"}
- Avoid Overplayed: ${config.avoidOverplayed || false}
- Only Underground: ${config.onlyUnderground || false}
- Popularity Threshold: ${config.popularityThreshold || 50}/100

Structure:
- Target Track Count: ${config.targetTrackCount || 20}
- Story Arc Mode: ${config.storyArcMode || false}
- Segmented Mode: ${config.segmentedMode || false}

Style:
- Style Fusion: ${config.styleFusion?.join(" + ") || "none"}
- Randomness Level: ${config.randomnessLevel || 5}/10
- Balance Hits vs Gems: ${config.balanceHitsGems || 5}/10
- Explicit Lyrics: ${config.explicitLyrics || "allow"}
- Language Specific: ${config.languageSpecific || "any"}

Template Used: ${config.templateUsed || "none"}

Create ${config.targetTrackCount || 20} search queries that will find the perfect tracks for this playlist. 
Each query should be a natural language search that Spotify can understand.
Consider decade filters, genre preferences, mood, energy level, and all other parameters.
If story arc mode is enabled, structure queries to progress from intro → build → climax → resolution.
If segmented mode is enabled, create distinct sections with different characteristics.`;

    const response = await generateCompletion(systemPrompt, userPrompt);
    const result = JSON.parse(response);
    if (!result.mood && normalized.mood) {
      result.mood = normalized.mood;
    }
    return result;
  } catch (error) {
    console.error("Advanced playlist generation error:", error);
    throw new Error("Failed to generate advanced playlist: " + (error as Error).message);
  }
}

export async function assistantExplainFeatures(question: string): Promise<string> {
  const systemPrompt = `You are the Promptify AI assistant. Explain how to use the application's features in clear, concise language. Help users understand the interface and available options.`;
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: question }
    ],
    temperature: 0.7,
  });
  return response.choices[0].message.content || "";
}
