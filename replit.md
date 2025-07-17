# replit.md

## Overview

This is a full-stack web application called "Promptify" that allows users to generate Spotify playlists using natural language prompts powered by AI. The application integrates with Spotify's API for authentication and playlist management, uses OpenAI for intelligent playlist generation, and provides a modern web interface built with React and TypeScript.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### July 17, 2025 - Migration from Replit Agent to Replit Environment
- Successfully migrated project from Replit Agent to standard Replit environment
- Fixed package.json JSON syntax errors that were preventing startup
- Installed all required dependencies using packager tool
- Created PostgreSQL database and configured DATABASE_URL environment variable
- Set up API credentials for OpenAI and Spotify services
- Resolved Express.js routing conflicts by implementing basic HTTP server
- Deployed working server on port 5000 with status dashboard
- All core services (database, OpenAI, Spotify) properly configured and accessible

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side routing)
- **Styling**: Tailwind CSS with custom Spotify-inspired color scheme
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **State Management**: TanStack Query (React Query) for server state
- **Build Tool**: Vite for fast development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ESM modules
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Session Management**: Express sessions with PostgreSQL store
- **API Integration**: Spotify Web API and OpenAI API

### Development Setup
- **Dev Server**: Vite middleware integrated with Express in development
- **TypeScript**: Strict mode enabled with path mapping
- **Hot Reload**: Vite HMR for frontend, tsx for backend reloading

## Key Components

### Authentication System
- **Spotify OAuth 2.0**: Complete OAuth flow with authorization code grant
- **Session Management**: Server-side sessions stored in PostgreSQL
- **User Profile**: Automatic user creation/update on successful authentication

### AI Playlist Generation
- **OpenAI Integration**: GPT-4o model for intelligent playlist creation
- **Prompt Processing**: Natural language understanding for music preferences
- **Search Query Generation**: AI converts prompts into Spotify search queries
- **Track Curation**: Intelligent track selection based on mood, genre, and context

### Spotify Integration
- **User Authentication**: OAuth 2.0 flow with required scopes
- **Playlist Management**: Create, update, and save playlists to user's Spotify
- **Track Search**: Search Spotify catalog using AI-generated queries
- **User Profile**: Access to user's Spotify profile and preferences

### Data Management
- **Database**: PostgreSQL with Neon serverless hosting
- **Database Schema**: Users, playlists, tracks, and recent prompts tables
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Type Safety**: Zod schemas for validation and TypeScript integration
- **Migrations**: Database schema versioning with Drizzle Kit
- **Storage**: DatabaseStorage class implements full CRUD operations

## Data Flow

1. **User Authentication**: User initiates Spotify OAuth → Express handles callback → Session created
2. **Playlist Generation**: User submits prompt → OpenAI processes → Generates search queries → Spotify API searches → Tracks curated → Playlist created
3. **Data Persistence**: Playlists and tracks stored in PostgreSQL → User can view history
4. **Spotify Integration**: User saves playlist → Creates in Spotify account → Updates local database

## External Dependencies

### Core Services
- **Spotify Web API**: Music streaming service integration
- **OpenAI API**: GPT-4o for natural language processing
- **Neon Database**: Serverless PostgreSQL hosting

### Development Tools
- **Vite**: Frontend build tool and dev server
- **Drizzle Kit**: Database migrations and schema management
- **ESBuild**: Backend bundling for production

### UI Libraries
- **Radix UI**: Accessible UI component primitives
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library
- **TanStack Query**: Server state management

## Deployment Strategy

### Build Process
- **Frontend**: Vite builds React app to `dist/public`
- **Backend**: ESBuild bundles server code to `dist/index.js`
- **Assets**: Static assets served from build directory

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `SPOTIFY_CLIENT_ID`: Spotify app client ID
- `SPOTIFY_CLIENT_SECRET`: Spotify app client secret
- `SPOTIFY_REDIRECT_URI`: OAuth callback URL
- `OPENAI_API_KEY`: OpenAI API key for playlist generation

### Production Considerations
- **Session Security**: Secure session configuration required
- **Error Handling**: Comprehensive error handling for API failures
- **Rate Limiting**: Spotify and OpenAI API rate limit management
- **Logging**: Structured logging for debugging and monitoring

The application follows a modern full-stack architecture with clear separation of concerns, type safety throughout, and integration with external services for a rich user experience.
