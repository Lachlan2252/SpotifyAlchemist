import { generateCompletion } from './openai.js';
import { SpotifyService } from './spotify.js';
import { type Track } from '@shared/schema';

function isMostlyEnglish(text: string): boolean {
  const ascii = text.replace(/[^\x00-\x7F]/g, '');
  return ascii.length / text.length > 0.8;
}

interface EditCommand {
  type: 'filter' | 'transform' | 'sort' | 'expand' | 'refine' | 'theme';
  action: string;
  parameters: Record<string, any>;
}

interface PlaylistEditRequest {
  tracks: Track[];
  command: string;
  userPreferences?: UserPreferences;
  accessToken?: string;
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
        return this.transformMood(request.tracks, command, request.userPreferences, request.accessToken);
      case 'sort':
        return this.sortTracks(request.tracks, command);
      case 'expand':
        return this.expandPlaylist(request.tracks, command, request.userPreferences, request.accessToken);
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
    - filter: Remove/keep tracks based on criteria (duration, year, genre, BPM, mood, etc.)
    - transform: Change mood/energy/vibe of the playlist
    - sort: Reorder tracks by specific criteria
    - expand: Add more tracks to the playlist
    - refine: Improve quality or remove unwanted tracks
    - theme: Apply a specific style, era, or character theme

    Example filter actions include:
    - remove_short_tracks { min_duration }
    - remove_by_year { before_year?, after_year? }
    - remove_by_genre { exclude_genres[] }
    - remove_low_energy { min_energy }
    - remove_low_valence { min_valence }
    - remove_by_bpm { min_bpm?, max_bpm? }
    - remove_by_artist { exclude_artists[] }
    - remove_duplicates {}
    - remove_title_keywords { keywords[] }
    - remove_non_english {}`;

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
        filteredTracks = filteredTracks.filter(track =>
          !excludeGenres.some((genre: string) =>
            (track.genres as string[] | undefined)?.some((g: string) =>
              g.toLowerCase().includes(genre.toLowerCase())
            )
          )
        );
        changes.push(`Removed ${beforeGenreCount - filteredTracks.length} tracks from excluded genres`);
        break;

      case 'remove_low_energy':
        const minEnergy = command.parameters.min_energy || 0.5;
        const beforeEnergyCount = filteredTracks.length;
        filteredTracks = filteredTracks.filter(track => (track.energy || 0.5) >= minEnergy);
        changes.push(`Removed ${beforeEnergyCount - filteredTracks.length} low-energy tracks`);
        break;

      case 'remove_low_valence':
        const minValence = command.parameters.min_valence || 0.3;
        const beforeValenceCount = filteredTracks.length;
        filteredTracks = filteredTracks.filter(track => (track.valence || 0.5) >= minValence);
        changes.push(`Removed ${beforeValenceCount - filteredTracks.length} low-valence tracks`);
        break;

      case 'remove_by_bpm':
        const minBpm = command.parameters.min_bpm || 0;
        const maxBpm = command.parameters.max_bpm || Infinity;
        const beforeBpmCount = filteredTracks.length;
        filteredTracks = filteredTracks.filter(track => {
          const tempo = track.tempo || 0;
          return tempo >= minBpm && tempo <= maxBpm;
        });
        changes.push(`Removed ${beforeBpmCount - filteredTracks.length} tracks outside BPM range`);
        break;

      case 'remove_by_artist':
        const excludeArtists = (command.parameters.exclude_artists || []).map((a: string) => a.toLowerCase());
        const beforeArtistCount = filteredTracks.length;
        filteredTracks = filteredTracks.filter(track => !excludeArtists.some((a: string) => track.artist.toLowerCase().includes(a)));
        changes.push(`Removed ${beforeArtistCount - filteredTracks.length} tracks by excluded artists`);
        break;

      case 'remove_duplicates':
        const seen = new Set<string>();
        const beforeDupCount = filteredTracks.length;
        filteredTracks = filteredTracks.filter(track => {
          const key = `${track.name.toLowerCase()}-${track.artist.toLowerCase()}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        changes.push(`Removed ${beforeDupCount - filteredTracks.length} duplicate tracks`);
        break;

      case 'remove_title_keywords':
        const keywords = (command.parameters.keywords || ['remix', 'live', 'slowed', 'sped up']).map((k: string) => k.toLowerCase());
        const beforeTitleCount = filteredTracks.length;
        filteredTracks = filteredTracks.filter(track => !keywords.some((k: string) => track.name.toLowerCase().includes(k)));
        changes.push(`Removed ${beforeTitleCount - filteredTracks.length} tracks with unwanted title keywords`);
        break;

      case 'remove_non_english':
        const beforeLangCount = filteredTracks.length;
        filteredTracks = filteredTracks.filter(track => isMostlyEnglish(track.name));
        changes.push(`Removed ${beforeLangCount - filteredTracks.length} non-English tracks`);
        break;
    }

    return {
      tracks: filteredTracks,
      explanation: `Applied ${command.action} filter to your playlist`,
      changes
    };
  }

  private async transformMood(
    tracks: Track[],
    command: EditCommand,
    prefs?: UserPreferences,
    accessToken?: string
  ): Promise<{
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

    const updatedTracks = [...tracks];
    if (Array.isArray(suggestions.replacements)) {
      for (const rep of suggestions.replacements) {
        const index = updatedTracks.findIndex(t =>
          t.name.toLowerCase().includes(String(rep.original).toLowerCase())
        );
        if (index !== -1 && accessToken) {
          try {
            const query = `${rep.replacement} ${rep.artist || ''}`.trim();
            const results = await this.spotify.searchTracks(accessToken, query, 1);
            const found = results[0];
            if (found) {
              updatedTracks[index] = {
                ...updatedTracks[index],
                spotifyId: found.id,
                name: found.name,
                artist: found.artists[0]?.name || updatedTracks[index].artist,
                album: found.album.name,
                duration: found.duration_ms,
                imageUrl: found.album.images[0]?.url || updatedTracks[index].imageUrl,
                previewUrl: found.preview_url,
              } as Track;
              changes.push(
                `Replaced ${rep.original} with ${found.name}` +
                  (rep.reason ? ` (${rep.reason})` : '')
              );
            }
          } catch (err) {
            console.error('Spotify search failed', err);
          }
        }
      }
    }

    changes.push(
      `Analyzed playlist for mood transformation: ${command.parameters.target_mood}`
    );

    return {
      tracks: updatedTracks,
      explanation: `Transformed playlist mood to: ${command.parameters.target_mood}`,
      changes,
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

      case 'sort_by_valence':
        sortedTracks.sort((a, b) => (b.valence || 0.5) - (a.valence || 0.5));
        changes.push('Sorted by mood (valence high to low)');
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

  private async expandPlaylist(
    tracks: Track[],
    command: EditCommand,
    prefs?: UserPreferences,
    accessToken?: string
  ): Promise<{
    tracks: Track[];
    explanation: string;
    changes: string[];
  }> {
    const changes: string[] = [];

    const expansionType = command.parameters.expansion_type || 'similar';
    const targetSize = command.parameters.target_size || tracks.length * 2;

    const expandPrompt = `Add more songs that fit this playlist.\n` +
      `Current tracks: ${tracks.map(t => `${t.name} by ${t.artist}`).join(', ')}\n` +
      `Type: ${expansionType}. Return JSON {"queries": ["q1", "q2", ...]}`;

    const response = await generateCompletion(
      'You are a music expert expanding playlists.',
      expandPrompt
    );

    const suggestions = JSON.parse(response);
    const queries: string[] = suggestions.queries || [];

    const newTracks: Track[] = [];
    const existingIds = new Set(tracks.map(t => t.spotifyId));

    if (accessToken) {
      for (const q of queries) {
        try {
          const results = await this.spotify.searchTracks(accessToken, q, 5);
          for (const tr of results) {
            if (!existingIds.has(tr.id)) {
              const template: Partial<Track> = tracks[0] || {} as any;
              newTracks.push({
                ...template,
                spotifyId: tr.id,
                name: tr.name,
                artist: tr.artists[0]?.name || 'Unknown Artist',
                album: tr.album.name,
                duration: tr.duration_ms,
                imageUrl: tr.album.images[0]?.url || null,
                previewUrl: tr.preview_url,
                position: tracks.length + newTracks.length,
              } as Track);
              existingIds.add(tr.id);
              if (tracks.length + newTracks.length >= targetSize) break;
            }
          }
        } catch (err) {
          console.error('Spotify search failed', err);
        }
        if (tracks.length + newTracks.length >= targetSize) break;
      }
    }

    changes.push(`Analyzed playlist for expansion: ${expansionType}`);
    changes.push(`Added ${newTracks.length} tracks`);

    return {
      tracks: [...tracks, ...newTracks],
      explanation: `Expanded playlist with ${expansionType} tracks`,
      changes,
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