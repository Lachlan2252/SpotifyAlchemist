import { type Track } from "../../../shared/schema";

interface TrackListProps {
  tracks: Track[];
  showArtwork?: boolean;
}

export default function TrackList({ tracks, showArtwork = true }: TrackListProps) {
  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (tracks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <i className="fas fa-music text-4xl mb-4"></i>
        <p>No tracks in this playlist yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tracks.map((track, index) => (
        <div key={track.id} className="flex items-center py-3 px-4 rounded-lg hover-spotify-lightgray group transition-colors">
          <div className="flex items-center justify-center w-8 h-8 text-gray-400 group-hover:text-white">
            <span className="group-hover:hidden text-sm">{index + 1}</span>
            <i className="fas fa-play hidden group-hover:block text-sm"></i>
          </div>
          {showArtwork && (
            <img 
              src={track.imageUrl || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&auto=format&fit=crop&w=40&h=40"} 
              alt="Track artwork" 
              className="w-10 h-10 rounded ml-4 object-cover"
            />
          )}
          <div className={`${showArtwork ? 'ml-4' : 'ml-4'} flex-1`}>
            <p className="text-white font-medium">{track.name}</p>
            <p className="text-gray-400 text-sm">{track.artist}</p>
          </div>
          <div className="text-gray-400 text-sm mr-4">{track.album}</div>
          <div className="text-gray-400 text-sm mr-4">{formatDuration(track.duration)}</div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <button className="text-gray-400 hover:text-white p-2">
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
