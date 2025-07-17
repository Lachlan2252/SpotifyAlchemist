import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export interface PlaylistRequest {
  prompt: string;
  userId: number;
  existingTracks?: string[];
}

export interface PlaylistResponse {
  name: string;
  description: string;
  searchQueries: string[];
  genre: string;
  mood: string;
  energy: number;
}

export interface TrackModificationRequest {
  action: "add_similar" | "replace_overplayed" | "reorder_by_mood";
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

export async function generatePlaylistFromPrompt(request: PlaylistRequest): Promise<PlaylistResponse> {
  try {
    const systemPrompt = `You are a music expert AI that creates Spotify playlists based on natural language descriptions. 
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
        { role: "user", content: request.prompt }
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
      mood: result.mood || "Mixed",
      energy: Math.max(1, Math.min(10, result.energy || 5)),
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

export async function generateAdvancedPlaylistFromPrompt(config: any): Promise<any> {
  try {
    // Build a comprehensive prompt incorporating all advanced features
    let systemPrompt = `You are an expert AI music curator with deep knowledge of musical genres, artists, decades, and audio characteristics. 
    Generate a playlist based on the provided advanced configuration. Consider all parameters carefully.

    Your task is to create intelligent search queries that will find the perfect tracks for this playlist.
    
    Return JSON format with:
    {
      "name": "playlist name",
      "description": "playlist description",
      "searchQueries": ["query1", "query2", "query3", ...],
      "reasoning": "detailed explanation of your curation choices"
    }`;

    let userPrompt = `Main prompt: ${config.prompt}

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
    return JSON.parse(response);
  } catch (error) {
    console.error("Advanced playlist generation error:", error);
    throw new Error("Failed to generate advanced playlist: " + (error as Error).message);
  }
}
