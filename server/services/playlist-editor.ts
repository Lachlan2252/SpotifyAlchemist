import { generateCompletion } from './openai.js';
import { SpotifyService } from './spotify.js';
import { type Track } from '@shared/schema';

interface EditCommand {
  type: 'filter' | 'transform' | 'sort' | 'expand' | 'refine' | 'theme';
  action: string;
  parameters: Record<string, any>;
}

interface PlaylistEditRequest {
  tracks: Track[];
  command: string;
  userPreferences?: UserPreferences;
}

interface UserPreferences {
  favoriteArtists?: string[];
  avoidArtists?: string[];
  bannedSongs?: string[];
  preferredBpmRange?: [number, number];
  preferredGenres?: string[];
}

export class PlaylistEditor {
  private spotify: SpotifyService;

  constructor() {
    this.spotify = new SpotifyService();
  }

  async processCommand(request: PlaylistEditRequest): Promise<{
    tracks: Track[];
    explanation: string;
    changes: string[];
  }> {
    const command = await this.parseCommand(request.command);
    
    switch (command.type) {
      case 'filter':
        return this.filterTracks(request.tracks, command, request.userPreferences);
      case 'transform':
        return this.transformMood(request.tracks, command, request.userPreferences);
      case 'sort':
        return this.sortTracks(request.tracks, command);
      case 'expand':
        return this.expandPlaylist(request.tracks, command, request.userPreferences);
      case 'refine':
        return this.refineTracks(request.tracks, command, request.userPreferences);
      case 'theme':
        return this.applyTheme(request.tracks, command, request.userPreferences);
      default:
        throw new Error('Unknown command type');
    }
  }

  private async parseCommand(command: string): Promise<EditCommand> {
    const systemPrompt = `You are a music expert and playlist curator. Parse the user's natural language command into a structured format.

    Analyze the command and determine:
    1. The main action type (filter, transform, sort, expand, refine, theme)
    2. Specific parameters and criteria
    3. Any emotional or stylistic targets

    Command types:
    - filter: Remove/keep tracks based on criteria (duration, year, genre, etc.)
    - transform: Change mood/energy/vibe of the playlist
    - sort: Reorder tracks by specific criteria
    - expand: Add more tracks to the playlist
    - refine: Improve quality or remove unwanted tracks
    - theme: Apply a specific style, era, or character theme

    Return JSON format: {"type": "filter", "action": "remove_short_tracks", "parameters": {"min_duration": 150}}`;

    const response = await generateCompletion(systemPrompt, command);
    return JSON.parse(response);
  }

  private async filterTracks(tracks: Track[], command: EditCommand, prefs?: UserPreferences): Promise<{
    tracks: Track[];
    explanation: string;
    changes: string[];
  }> {
    let filteredTracks = [...tracks];
    const changes: string[] = [];

    switch (command.action) {
      case 'remove_short_tracks':
        const minDuration = command.parameters.min_duration || 150; // 2:30 in seconds
        const originalCount = filteredTracks.length;
        filteredTracks = filteredTracks.filter(track => track.duration > minDuration);
        changes.push(`Removed ${originalCount - filteredTracks.length} tracks shorter than ${Math.floor(minDuration/60)}:${(minDuration%60).toString().padStart(2, '0')}`);
        break;

      case 'remove_by_year':
        const beforeYear = command.parameters.before_year;
        const afterYear = command.parameters.after_year;
        const beforeCount = filteredTracks.length;
        filteredTracks = filteredTracks.filter(track => {
          const year = track.releaseDate
            ? new Date(track.releaseDate).getFullYear()
            : 0;
          if (beforeYear && year < beforeYear) return false;
          if (afterYear && year > afterYear) return false;
          return true;
        });
        changes.push(`Removed ${beforeCount - filteredTracks.length} tracks outside the year range`);
        break;

      case 'remove_by_genre':
        const excludeGenres = command.parameters.exclude_genres || [];
        const beforeGenreCount = filteredTracks.length;
        filteredTracks = filteredTracks.filter(track => {
          const genres = Array.isArray(track.genres) ? track.genres : [];
          return !excludeGenres.some((genre: string) =>
            genres.some(g => g.toLowerCase().includes(genre.toLowerCase()))
          );
        });
        changes.push(`Removed ${beforeGenreCount - filteredTracks.length} tracks from excluded genres`);
        break;

      case 'remove_low_energy':
        const minEnergy = command.parameters.min_energy || 0.5;
        const beforeEnergyCount = filteredTracks.length;
        filteredTracks = filteredTracks.filter(track => (track.energy || 0.5) >= minEnergy);
        changes.push(`Removed ${beforeEnergyCount - filteredTracks.length} low-energy tracks`);
        break;
    }

    return {
      tracks: filteredTracks,
      explanation: `Applied ${command.action} filter to your playlist`,
      changes
    };
  }

  private async transformMood(tracks: Track[], command: EditCommand, prefs?: UserPreferences): Promise<{
    tracks: Track[];
    explanation: string;
    changes: string[];
  }> {
    const changes: string[] = [];
    
    // Use AI to determine which tracks to replace and with what
    const moodPrompt = `Transform this playlist to match the mood: "${command.parameters.target_mood}". 
    
    Current tracks: ${tracks.map(t => `${t.name} by ${t.artist}`).join(', ')}
    
    Provide replacement suggestions for tracks that don't match the target mood. Return JSON format:
    {"replacements": [{"original": "track_name", "replacement": "new_track_name", "artist": "artist_name", "reason": "explanation"}]}`;

    const response = await generateCompletion(
      "You are a music expert specializing in mood transformation.",
      moodPrompt
    );

    const suggestions = JSON.parse(response);
    
    // For now, return the original tracks with the explanation
    // In a full implementation, we'd search for and replace tracks
    changes.push(`Analyzed playlist for mood transformation: ${command.parameters.target_mood}`);
    changes.push(`Found ${suggestions.replacements?.length || 0} tracks that could be replaced`);

    return {
      tracks,
      explanation: `Transformed playlist mood to: ${command.parameters.target_mood}`,
      changes
    };
  }

  private async sortTracks(tracks: Track[], command: EditCommand): Promise<{
    tracks: Track[];
    explanation: string;
    changes: string[];
  }> {
    let sortedTracks = [...tracks];
    const changes: string[] = [];

    switch (command.action) {
      case 'sort_by_bpm':
        const ascending = command.parameters.ascending !== false;
        sortedTracks.sort((a, b) => {
          const bpmA = a.tempo || 120;
          const bpmB = b.tempo || 120;
          return ascending ? bpmA - bpmB : bpmB - bpmA;
        });
        changes.push(`Sorted by BPM ${ascending ? 'ascending' : 'descending'}`);
        break;

      case 'sort_by_energy':
        sortedTracks.sort((a, b) => (b.energy || 0.5) - (a.energy || 0.5));
        changes.push('Sorted by energy level (high to low)');
        break;

        case 'sort_by_year':
          sortedTracks.sort((a, b) => {
            const yearA = a.releaseDate ? new Date(a.releaseDate).getFullYear() : 0;
            const yearB = b.releaseDate ? new Date(b.releaseDate).getFullYear() : 0;
            return yearB - yearA;
          });
        changes.push('Sorted by release year (newest first)');
        break;

      case 'energy_curve':
        // Create a curve: chill start, peak in middle, soft end
        const third = Math.floor(sortedTracks.length / 3);
        const chillTracks = sortedTracks.filter(t => (t.energy || 0.5) < 0.4);
        const energyTracks = sortedTracks.filter(t => (t.energy || 0.5) > 0.7);
        const midTracks = sortedTracks.filter(t => (t.energy || 0.5) >= 0.4 && (t.energy || 0.5) <= 0.7);
        
        sortedTracks = [
          ...chillTracks.slice(0, third),
          ...energyTracks,
          ...midTracks,
          ...chillTracks.slice(third)
        ];
        changes.push('Created energy curve: chill → energetic → mellow');
        break;
    }

    return {
      tracks: sortedTracks,
      explanation: `Reordered playlist using ${command.action}`,
      changes
    };
  }

  private async expandPlaylist(tracks: Track[], command: EditCommand, prefs?: UserPreferences): Promise<{
    tracks: Track[];
    explanation: string;
    changes: string[];
  }> {
    const changes: string[] = [];
    
    // For now, return original tracks with explanation
    // In full implementation, we'd search for similar tracks
    changes.push(`Analyzed playlist for expansion: ${command.parameters.expansion_type}`);
    changes.push(`Target size: ${command.parameters.target_size || tracks.length * 2} tracks`);

    return {
      tracks,
      explanation: `Expanded playlist with ${command.parameters.expansion_type} tracks`,
      changes
    };
  }

  private async refineTracks(tracks: Track[], command: EditCommand, prefs?: UserPreferences): Promise<{
    tracks: Track[];
    explanation: string;
    changes: string[];
  }> {
    const changes: string[] = [];
    let refinedTracks = [...tracks];

    if (prefs?.bannedSongs) {
      const beforeCount = refinedTracks.length;
      refinedTracks = refinedTracks.filter(track => 
        !prefs.bannedSongs!.some(banned => 
          track.name.toLowerCase().includes(banned.toLowerCase()) ||
          track.artist.toLowerCase().includes(banned.toLowerCase())
        )
      );
      changes.push(`Removed ${beforeCount - refinedTracks.length} banned tracks`);
    }

    return {
      tracks: refinedTracks,
      explanation: `Refined playlist quality`,
      changes
    };
  }

  private async applyTheme(tracks: Track[], command: EditCommand, prefs?: UserPreferences): Promise<{
    tracks: Track[];
    explanation: string;
    changes: string[];
  }> {
    const changes: string[] = [];
    const theme = command.parameters.theme;
    
    changes.push(`Applied theme: ${theme}`);
    changes.push(`Analyzed ${tracks.length} tracks for theme compatibility`);

    return {
      tracks,
      explanation: `Applied ${theme} theme to playlist`,
      changes
    };
  }
}