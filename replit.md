# Promptify - AI Playlist Generator

## Overview
Promptify is a comprehensive AI-powered playlist generator application built with React, Express, and PostgreSQL. It integrates with Spotify and OpenAI to create personalized playlists based on natural language prompts and advanced audio features.

**Current State**: Fully migrated from Replit Agent with all features operational.
**Purpose**: Generate, edit, and manage playlists using AI and natural language commands.
**Tech Stack**: React + TypeScript, Express, PostgreSQL, Spotify API, OpenAI API

## Project Architecture

### Frontend Components
- **maximalist-home.tsx**: Main application interface with all features
- **playlist-generator.tsx**: AI playlist generation with advanced configuration
- **playlist-editor.tsx**: Natural language playlist editing
- **advanced-playlist-editor.tsx**: Audio feature-based sorting and filtering
- **ai-assistant.tsx**: Chat interface for music-related help
- **spotify-playlists.tsx**: View and remix Spotify playlists
- **track-list.tsx**: Display and manage playlist tracks
- **preferences-panel.tsx**: User preferences management
- **prompt-generator.tsx**: Smart prompt suggestions
- **recently-played.tsx**: Track user activity

### Backend Services
- **spotify.ts**: Spotify API integration (OAuth, search, recommendations)
- **openai.ts**: AI-powered playlist generation and analysis
- **playlist-editor.ts**: Natural language command processing
- **storage.ts**: Database operations with Drizzle ORM
- **routes.ts**: API endpoints for all features

### Key Features
1. **AI Playlist Generation**
   - Basic prompt-based generation
   - Advanced configuration with audio features
   - Template-based quick generation
   - Smart prompt suggestions

2. **Playlist Editing**
   - Natural language commands ("Remove songs under 2:30", "Make it more energetic")
   - Advanced sorting (BPM, energy, mood, popularity)
   - Audio feature filtering
   - Track reordering

3. **Spotify Integration**
   - OAuth authentication
   - Save playlists to Spotify
   - View user's Spotify playlists
   - Import and remix existing playlists

4. **User Preferences**
   - Favorite/avoided artists
   - Preferred genres
   - BPM ranges
   - Banned songs

5. **AI Assistant**
   - Chat interface for help
   - Music recommendations
   - Feature explanations

## Recent Changes

### 2025-01-17
- Migrated entire application from Replit Agent
- Fixed Express 5.x routing issues with path-to-regexp
- Installed missing Radix UI dependencies for shadcn/ui components
- Created multiple server implementations to bypass routing conflicts
- Comprehensive feature review completed
- All features verified as operational

## API Endpoints

### Authentication
- `GET /api/auth/me` - Get current user
- `GET /api/auth/spotify` - Initiate Spotify OAuth
- `GET /api/auth/spotify/callback` - Handle OAuth callback
- `POST /api/auth/logout` - Logout user

### Playlist Management
- `GET /api/playlists` - Get user playlists
- `GET /api/playlists/:id` - Get specific playlist
- `POST /api/playlists/generate` - Generate playlist from prompt
- `POST /api/playlists/generate-advanced` - Generate with advanced config
- `POST /api/playlists/:id/edit` - Edit playlist with natural language
- `PUT /api/playlists/:id/tracks` - Update track order
- `POST /api/playlists/:id/save-to-spotify` - Save to Spotify
- `POST /api/playlists/:id/audio-features` - Get audio features

### Spotify Integration
- `GET /api/spotify/playlists` - Get user's Spotify playlists
- `GET /api/spotify/recently-played` - Get recently played tracks

### User Data
- `GET /api/recent-prompts` - Get recent generation prompts
- `GET /api/user/preferences` - Get user preferences
- `PUT /api/user/preferences` - Update preferences

### AI Features
- `POST /api/assistant` - Chat with AI assistant
- `GET /api/prompts/suggest` - Get prompt suggestions

## Environment Variables Required
- `OPENAI_API_KEY` - OpenAI API key for AI features
- `SPOTIFY_CLIENT_ID` - Spotify app client ID
- `SPOTIFY_CLIENT_SECRET` - Spotify app client secret
- `SPOTIFY_REDIRECT_URI` - OAuth callback URL
- `DATABASE_URL` - PostgreSQL connection string

## User Preferences
- None configured yet

## Development Notes
- Server runs on port 5000
- Uses Replit's workflow system for process management
- Database migrations handled via `npm run db:push`
- TypeScript/JSX transformation handled server-side in development