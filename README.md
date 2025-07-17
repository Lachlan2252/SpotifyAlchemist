# Promptify - AI-Powered Spotify Playlist Generator

An intelligent playlist generation tool that creates custom Spotify playlists using natural language prompts powered by OpenAI's GPT-4.

## Features

- **AI-Powered Generation**: Create playlists from natural language descriptions
- **Spotify Integration**: Seamless authentication and playlist management
- **Advanced Controls**: Fine-tune audio features, mood, energy levels, and more
- **Smart Curation**: Intelligent track selection based on context and preferences
- **Modern UI**: Clean, responsive interface with Spotify-inspired design
- **Real-time Processing**: Fast playlist generation with live progress updates

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Wouter** for routing
- **TanStack Query** for state management
- **Radix UI** components with shadcn/ui
- **Vite** for build tooling

### Backend
- **Node.js** with Express
- **TypeScript** with ESM modules
- **PostgreSQL** with Drizzle ORM
- **Neon Database** (serverless PostgreSQL)
- **Express Sessions** for authentication

### APIs & Services
- **Spotify Web API** for music data and playlist management
- **OpenAI API** (GPT-4) for intelligent playlist generation
- **OAuth 2.0** for secure Spotify authentication

## Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL database (or use Neon for serverless)
- Spotify Developer Account
- OpenAI API Key

### Environment Variables
Create a `.env` file with:
```
DATABASE_URL=your_postgresql_connection_string
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:5000/api/auth/spotify/callback
OPENAI_API_KEY=your_openai_api_key
```

### Installation
1. Clone the repository
2. Install dependencies: `npm install`
3. Set up your environment variables
4. Run database migrations: `npm run db:push`
5. Start the development server: `npm run dev`

### Spotify App Setup
1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Add redirect URI: `http://localhost:5000/api/auth/spotify/callback`
4. Copy your Client ID and Client Secret to your `.env` file

## Usage

1. Connect your Spotify account
2. Enter a natural language prompt describing your desired playlist
3. Optionally adjust advanced settings (mood, energy, tempo, etc.)
4. Generate your playlist
5. Save it directly to your Spotify library

### Example Prompts
- "Create a chill study playlist with lo-fi beats and ambient sounds"
- "I need epic workout music with heavy bass and high energy"
- "Make me a nostalgic 90s road trip playlist"
- "Dark villain origin story vibes with haunting melodies"

## Development

### Project Structure
```
├── client/          # React frontend
├── server/          # Express backend
├── shared/          # Shared types and schemas
├── components.json  # shadcn/ui configuration
└── package.json     # Dependencies and scripts
```

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run db:push` - Push database schema changes
- `npm run db:studio` - Open database studio
- `npm run electron:dev` - Start the desktop app in development
- `npm run electron:pack` - Build a macOS app bundle (requires macOS)
## Mac Desktop App

Use Electron to run Promptify as a native macOS application.

1. `npm run electron:dev` to launch the app with the dev server.
2. `npm run electron:pack` to create a macOS app bundle (requires macOS).

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

For support, please open an issue on GitHub or contact the maintainers.