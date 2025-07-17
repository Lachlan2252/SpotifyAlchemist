import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface EditMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  changes?: string[];
}

interface PlaylistEditorProps {
  playlistId: number;
  onPlaylistUpdate: (playlist: any) => void;
}

const EXAMPLE_COMMANDS = [
  "Remove all songs under 2:30",
  "Make this playlist feel more energetic",
  "Sort by BPM descending",
  "Add more indie rock songs",
  "Remove songs from before 2010",
  "Make this feel like a 90s road trip",
  "Turn this into a workout playlist",
  "Add more female vocalists",
  "Remove slow songs",
  "Make this sound like a coffee shop playlist"
];

export default function PlaylistEditor({ playlistId, onPlaylistUpdate }: PlaylistEditorProps) {
  const [command, setCommand] = useState("");
  const [messages, setMessages] = useState<EditMessage[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const editPlaylist = useMutation({
    mutationFn: async (command: string) => {
      const response = await apiRequest(`/api/playlists/${playlistId}/edit`, {
        method: "POST",
        body: { command },
      });
      return response;
    },
    onSuccess: (data) => {
      const assistantMessage: EditMessage = {
        id: Date.now().toString(),
        type: 'assistant',
        content: data.explanation,
        timestamp: new Date(),
        changes: data.changes,
      };
      setMessages(prev => [...prev, assistantMessage]);
      
      onPlaylistUpdate(data.playlist);
      queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
      
      toast({
        title: "Playlist Updated",
        description: data.explanation,
      });
    },
    onError: (error: any) => {
      const errorMessage: EditMessage = {
        id: Date.now().toString(),
        type: 'assistant',
        content: `Sorry, I couldn't process that command: ${error.message}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Command Failed",
        description: error.message || "Please try rephrasing your command",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;

    const userMessage: EditMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: command,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    editPlaylist.mutate(command);
    setCommand("");
  };

  const useExampleCommand = (example: string) => {
    setCommand(example);
    setIsExpanded(true);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isExpanded) {
    return (
      <div className="spotify-gray rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">AI Playlist Editor</h3>
            <p className="text-sm text-gray-400">Edit your playlist with natural language commands</p>
          </div>
          <Button
            onClick={() => setIsExpanded(true)}
            className="bg-spotify-green hover:bg-green-600 text-white"
          >
            <i className="fas fa-edit mr-2"></i>
            Start Editing
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {EXAMPLE_COMMANDS.slice(0, 6).map((example, index) => (
            <button
              key={index}
              onClick={() => useExampleCommand(example)}
              className="text-left p-3 rounded-lg bg-spotify-darkgray hover:bg-spotify-lightgray transition-colors text-sm"
            >
              "{example}"
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="spotify-gray rounded-xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">AI Playlist Editor</h3>
          <p className="text-sm text-gray-400">Chat with AI to edit your playlist</p>
        </div>
        <Button
          onClick={() => setIsExpanded(false)}
          variant="outline"
          className="border-gray-600 text-white hover:bg-gray-600"
        >
          <i className="fas fa-times mr-2"></i>
          Minimize
        </Button>
      </div>

      {/* Chat Messages */}
      <div className="bg-spotify-darkgray rounded-lg p-4 mb-4 h-64 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 mt-8">
            <i className="fas fa-comments text-2xl mb-2"></i>
            <p>Type a command to start editing your playlist</p>
            <p className="text-sm mt-2">Examples: "Remove slow songs" or "Add more energy"</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs md:max-w-md px-4 py-2 rounded-lg ${
                    message.type === 'user'
                      ? 'bg-spotify-green text-white'
                      : 'bg-spotify-lightgray text-gray-200'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  {message.changes && (
                    <div className="mt-2 text-xs opacity-90">
                      {message.changes.map((change, index) => (
                        <div key={index} className="flex items-center mt-1">
                          <i className="fas fa-check text-green-400 mr-2"></i>
                          {change}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Command Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="e.g., 'Remove songs under 3 minutes' or 'Make this more upbeat'"
          className="flex-1 bg-spotify-darkgray border-gray-600 text-white placeholder-gray-400"
          disabled={editPlaylist.isPending}
        />
        <Button
          type="submit"
          disabled={editPlaylist.isPending || !command.trim()}
          className="bg-spotify-green hover:bg-green-600 text-white"
        >
          {editPlaylist.isPending ? (
            <i className="fas fa-spinner animate-spin"></i>
          ) : (
            <i className="fas fa-paper-plane"></i>
          )}
        </Button>
      </form>

      {/* Quick Commands */}
      <div className="mt-4">
        <p className="text-sm text-gray-400 mb-2">Quick commands:</p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_COMMANDS.slice(0, 4).map((example, index) => (
            <button
              key={index}
              onClick={() => setCommand(example)}
              className="text-xs px-3 py-1 rounded-full bg-spotify-darkgray hover:bg-spotify-lightgray transition-colors"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}