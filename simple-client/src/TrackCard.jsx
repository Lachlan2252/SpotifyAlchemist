import React from 'react';

export default function TrackCard({ track }) {
  return (
    <div className="flex items-center space-x-3 bg-gray-800 p-2 rounded">
      <img src={track.cover_url} alt="cover" className="w-12 h-12 object-cover" />
      <div className="flex-1">
        <p className="font-medium">{track.title}</p>
        <p className="text-sm text-gray-400">{track.artist}</p>
      </div>
      <a href={track.spotify_url} target="_blank" rel="noreferrer" className="text-green-400">
        Open
      </a>
    </div>
  );
}
