# Release Guide

This guide explains how to create and manage releases for Spotify Alchemist desktop app.

## Automated Release Process

The repository now includes an automated release workflow that builds the macOS DMG file and uploads it to GitHub Releases.

### Creating a Release

1. **Tag a new version**:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **GitHub Actions will automatically**:
   - Build the web application
   - Create a macOS DMG file for both Intel and Apple Silicon Macs
   - Upload the DMG to GitHub Releases
   - Generate release notes with installation instructions

### Manual Release (Alternative)

You can also trigger a release manually:

1. Go to GitHub Actions tab
2. Select "Build and Release Desktop App" workflow
3. Click "Run workflow"
4. Enter the version (e.g., v1.0.0)
5. Click "Run workflow"

## Testing Releases Locally

For development and testing purposes, you can test the build process locally:

```bash
npm run release:test
```

**Note**: This will only create the web build on non-macOS systems. The DMG build requires macOS.

## Release Assets

Each release includes:
- `SpotifyAlchemist.dmg` - macOS installer (Universal - supports both Intel and Apple Silicon)

## Installation Instructions

Users can install the app by:
1. Downloading the DMG file from the releases page
2. Opening the DMG file
3. Dragging the app to the Applications folder
4. Launching from Applications or Spotlight

## Version Management

- Use semantic versioning (e.g., v1.0.0, v1.0.1, v1.1.0)
- Tag format should be `v{major}.{minor}.{patch}`
- The workflow is triggered by any tag starting with `v`

## Troubleshooting

### Build Failures

If the build fails:
1. Check the GitHub Actions logs
2. Ensure all dependencies are properly specified
3. Verify the electron-builder configuration in package.json

### DMG Issues

If the DMG creation fails:
1. Check that the icon file exists at `electron/assets/icon.png`
2. Verify the entitlements file is present
3. Ensure electron-builder is properly configured

## Configuration Files

- `.github/workflows/release.yml` - GitHub Actions workflow
- `package.json` - electron-builder configuration
- `electron/entitlements.mac.plist` - macOS entitlements
- `scripts/test-release.sh` - Local testing script