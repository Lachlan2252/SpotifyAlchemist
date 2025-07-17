export async function generatePlaylist(prompt) {
  const res = await fetch('http://localhost:3001/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });
  if (!res.ok) throw new Error('API error');
  return res.json();
}
