const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const app = express();
app.use(cors());
app.use(express.json());

async function getSpotifyToken() {
  const creds = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64');
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${creds}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });
  if (!res.ok) {
    throw new Error('Failed to get Spotify token');
  }
  const data = await res.json();
  return data.access_token;
}

function msToMin(ms) {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

async function analyzePrompt(prompt) {
  const system = `You extract musical preferences from a user prompt. ` +
    `Return JSON with fields: genres (array of up to 5), mood (string), energy (0-1 number).`;
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: prompt }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7
  });
  const json = JSON.parse(completion.choices[0].message.content);
  return json;
}

app.post('/generate', async (req, res) => {
  const { prompt } = req.body || {};
  if (!prompt || !prompt.trim()) {
    return res.status(400).json({ message: 'Prompt required' });
  }
  try {
    const params = await analyzePrompt(prompt);
    const token = await getSpotifyToken();
    const query = new URLSearchParams({
      limit: '10',
      seed_genres: (params.genres || []).slice(0,5).join(',') || 'pop',
      target_energy: params.energy || 0.5
    });
    const recRes = await fetch('https://api.spotify.com/v1/recommendations?' + query.toString(), {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!recRes.ok) throw new Error('Spotify recommendations failed');
    const recData = await recRes.json();
    const tracks = recData.tracks.map(t => ({
      title: t.name,
      artist: t.artists.map(a => a.name).join(', '),
      spotify_url: t.external_urls.spotify,
      cover_url: t.album.images[0]?.url,
      duration: msToMin(t.duration_ms)
    }));
    res.json({ playlist_url: null, tracks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to generate playlist' });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`server listening on ${port}`));
