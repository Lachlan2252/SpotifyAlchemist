interface LoadingModalProps {
  isOpen: boolean;
}

export default function LoadingModal({ isOpen }: LoadingModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="spotify-gray rounded-xl p-8 text-center max-w-md mx-4">
        <div className="w-16 h-16 bg-gradient-to-br from-spotify-green to-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
          <i className="fas fa-magic text-white text-2xl animate-pulse"></i>
        </div>
        <h3 className="text-xl font-semibold mb-2">Creating Your Playlist</h3>
        <p className="text-gray-400 mb-4">AI is analyzing your prompt and finding the perfect tracks...</p>
        <div className="w-full bg-gray-600 rounded-full h-2">
          <div className="spotify-green h-2 rounded-full loading-bar"></div>
        </div>
      </div>
    </div>
  );
}
