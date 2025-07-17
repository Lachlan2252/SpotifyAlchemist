# Contributing to Promptify

Thank you for your interest in contributing to Promptify! This document provides guidelines for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/promptify.git`
3. Install dependencies: `npm install`
4. Set up your environment variables (see README.md)
5. Start the development server: `npm run dev`

## Development Setup

### Prerequisites
- Node.js 18+
- PostgreSQL database (or use Neon for serverless)
- Spotify Developer Account
- OpenAI API Key

### Environment Variables
Create a `.env` file with all required variables as described in the README.md

### Database Setup
Run `npm run db:push` to set up the database schema.

## Code Style

- Use TypeScript for all new code
- Follow the existing code style and patterns
- Use Tailwind CSS for styling
- Keep components small and focused
- Write meaningful commit messages

## Testing

- Test your changes locally before submitting
- Ensure the app works with real Spotify and OpenAI APIs
- Test mobile responsiveness

## Submitting Changes

1. Create a new branch: `git checkout -b feature/your-feature-name`
2. Make your changes
3. Commit your changes: `git commit -m "Add your feature"`
4. Push to your fork: `git push origin feature/your-feature-name`
5. Create a Pull Request

## Pull Request Guidelines

- Provide a clear description of what your changes do
- Include any relevant screenshots or demos
- Link to any related issues
- Ensure your code follows the project's style guidelines
- Make sure all tests pass

## Code Review Process

- All pull requests will be reviewed by maintainers
- Changes may be requested before merging
- Please be patient and responsive to feedback

## Questions?

If you have questions about contributing, please open an issue or contact the maintainers.
