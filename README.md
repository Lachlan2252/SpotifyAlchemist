# Promptify - AI-Powered Spotify Playlist Generator

An intelligent playlist generation tool that creates custom Spotify playlists using natural language prompts powered by OpenAI's GPT-4.

## Features

- **AI-Powered Generation**: Create playlists from natural language descriptions
- **Spotify Integration**: Seamless authentication and playlist management
- **Advanced Controls**: Fine-tune audio features, mood, energy levels, and more
- **Smart Curation**: Intelligent track selection based on context and preferences
- **Modern UI**: Clean, responsive interface with Spotify-inspired design
- **Real-time Processing**: Fast playlist generation with live progress updates
- **Follow-up Prompts**: Refine an existing playlist using additional prompts
- **Emoji Mood Detection**: Prompts containing emojis automatically set the vibe
- **Synonym Support**: Words like "hype" or "banger" imply high energy
- **Cover Art Suggestions**: GPT proposes ideas for playlist artwork
- **Export Tools**: Download playlists as JSON, CSV, or plain text

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

The project is a typical Node + React monorepo. Follow these steps to get a local
environment running.

### 1. Prerequisites

- **Node.js 18+**
- **PostgreSQL** (you can also use [Neon](https://neon.tech/) for a free
  serverless database)
- **Spotify Developer account** for OAuth credentials
- **OpenAI API key** for playlist generation

### 2. Clone & Install

```bash
git clone https://github.com/your-username/promptify.git
cd promptify
npm install
```

### 3. Configure Environment

1. Copy `.env.example` to `.env`:

   ```bash
   cp .env.example .env
   ```

2. Fill in the values:
   - `DATABASE_URL` – connection string to your PostgreSQL database
   - `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` – from the Spotify
     Developer Dashboard
   - `SPOTIFY_REDIRECT_URI` – OAuth callback URL
   - Either `OPENAI_API_KEY` or `OPENAI_API_KEY_ENV_VAR` must provide your OpenAI API key (the app will fail to start if neither is set)
   - `SESSION_SECRET` – any random string

### 4. Database Setup

Run the migrations to create the required tables:

```bash
npm run db:push
```

### 5. Start the App

Launch the development server which runs both the API and the React client:

```bash
npm run dev
```

Open <http://localhost:5000> in your browser and you should see Promptify.

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
