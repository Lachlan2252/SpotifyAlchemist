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
- **Advanced Editing**: Filter by BPM, mood or artist, remove duplicates and non-English tracks

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
- **Express Sessions** for authentication

### APIs & Services
- **Spotify Web API** for music data and playlist management
- **OpenAI API** (GPT-4) for intelligent playlist generation
- **OAuth 2.0** for secure Spotify authentication

### Backend / API Flow
1. **Pull playlist data** using the Spotify API to get track IDs along with
   metadata and existing audio features.
2. **Analyze tracks** via Spotify's `/audio-features` endpoint to obtain BPM,
   energy, valence, danceability, instrumentalness and other metrics.
3. **Modify the playlist** based on the user's prompt:
   - Remove songs outside the desired mood, genre, year or BPM range
   - Reorder or group tracks
   - Replace tracks with similar recommendations that match the target vibe
   - Expand the playlist with additional matching songs
4. **Return** the updated playlist object or create the modified playlist
   directly in the user's Spotify library.

## Getting Started

The project is a typical Node + React monorepo. If you just want to try it out,
follow the quick start below. For a more detailed guide, see the full
instructions that follow.

### Quick Start

```bash
git clone https://github.com/your-username/promptify.git
cd promptify
npm install
cp .env.example .env   # fill in Spotify and OpenAI keys
npm run db:push        # set up the database
npm run dev
```

Then open <http://localhost:5000> in your browser and sign in with Spotify.

---

Follow the steps below if you need more explanation or are setting up for
development.

### 1. Prerequisites

- **Node.js 18+**
- **PostgreSQL** (local or remote instance)
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
   - You can also provide the OpenAI key later from the Preferences panel in the web UI

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
- `npm run release:test` - Test the release build process

### Release Process

To create a new release with a downloadable DMG file:

1. **Create a tag**: `git tag v1.0.0 && git push origin v1.0.0`
2. **GitHub Actions will automatically**:
   - Build the web app
   - Create a macOS DMG file
   - Upload the DMG to GitHub Releases
   - Generate release notes

Alternatively, you can manually trigger a release using the GitHub Actions workflow dispatch feature.

The DMG file will be available at: https://github.com/Lachlan2252/SpotifyAlchemist/releases

## macOS Desktop App

Spotify Alchemist is now available as a native macOS desktop application with a fluid, modern UI that takes full advantage of macOS features.

### Download

**📥 [Download the latest release](https://github.com/Lachlan2252/SpotifyAlchemist/releases/latest)**

The DMG file is automatically built and uploaded to GitHub Releases whenever a new version is tagged. Simply download the latest `SpotifyAlchemist.dmg` file from the releases page.

### Desktop Features
- **Native macOS Integration**: Full macOS menu bar, dock support, and window management
- **Fluid UI**: Smooth animations, transitions, and glass morphism effects
- **Dark Mode Support**: Automatic dark mode detection and theme switching
- **Retina Display Optimized**: Crystal clear graphics on all Mac displays
- **Keyboard Shortcuts**: Full keyboard navigation and shortcuts
- **Window Management**: Proper minimize, maximize, and close behavior
- **Vibrancy Effects**: Beautiful translucent backgrounds that adapt to the desktop
- **Smooth Animations**: Spring-loaded animations and fluid transitions
- **Native Notifications**: macOS-style notifications and alerts

### Installation

#### Option 1: Download Pre-built App
1. Visit the [Releases](https://github.com/Lachlan2252/SpotifyAlchemist/releases) page
2. Download the latest `SpotifyAlchemist.dmg` file
3. Open the DMG and drag the app to your Applications folder
4. Launch from Applications or Spotlight

#### Option 2: Build from Source
```bash
# Clone the repository
git clone https://github.com/Lachlan2252/SpotifyAlchemist.git
cd SpotifyAlchemist

# Install dependencies
npm install

# Build the app
npm run electron:pack
```

### Development

To develop the desktop app:

```bash
# Start development server
npm run dev

# In another terminal, start the electron app
npm run electron:dev
```

---

## Web Version

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

For support, please open an issue on GitHub or contact the maintainers.
