import React, { useState } from 'react';
import PromptForm from './PromptForm.jsx';
import TrackCard from './TrackCard.jsx';
import { generatePlaylist } from './api.js';

export default function App() {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (prompt) => {
    if (!prompt) return;
    setLoading(true);
    try {
      const data = await generatePlaylist(prompt);
      setTracks(data.tracks);
    } catch (err) {
      alert('Failed to generate playlist');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="w-full max-w-xl space-y-4">
      <PromptForm onSubmit={handleSubmit} loading={loading} />
      <div className="space-y-2">
        {tracks.map((t, i) => (
          <TrackCard key={i} track={t} />
        ))}
      </div>
    </div>
  );
}
