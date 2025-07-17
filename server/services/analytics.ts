export interface PlaylistAnalytics {
  genreDistribution: Record<string, number>;
  releaseYearRange: [number, number] | null;
  averageBpm: number | null;
  averageEnergy: number | null;
}

import { type Track } from "@shared/schema";

export function analyzePlaylist(tracks: Track[]): PlaylistAnalytics {
  const genreDistribution: Record<string, number> = {};
  let minYear: number | undefined;
  let maxYear: number | undefined;
  let bpmTotal = 0;
  let bpmCount = 0;
  let energyTotal = 0;
  let energyCount = 0;

  for (const track of tracks) {
    if (track.releaseDate) {
      const year = parseInt(track.releaseDate.slice(0, 4));
      if (!isNaN(year)) {
        if (minYear === undefined || year < minYear) minYear = year;
        if (maxYear === undefined || year > maxYear) maxYear = year;
      }
    }
    if (typeof track.tempo === "number") {
      bpmTotal += track.tempo;
      bpmCount++;
    }
    if (typeof track.energy === "number") {
      energyTotal += track.energy;
      energyCount++;
    }
    const genres = (track.genres as string[] | undefined) || [];
    for (const g of genres) {
      genreDistribution[g] = (genreDistribution[g] || 0) + 1;
    }
  }

  return {
    genreDistribution,
    releaseYearRange:
      minYear !== undefined && maxYear !== undefined ? [minYear, maxYear] : null,
    averageBpm: bpmCount > 0 ? Math.round(bpmTotal / bpmCount) : null,
    averageEnergy: energyCount > 0 ? Number((energyTotal / energyCount).toFixed(2)) : null,
  };
}
