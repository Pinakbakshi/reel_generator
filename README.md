# Reel Generator

A web application project for experimenting with AI-assisted short-form video/reel generation. Confirm the supported generation workflow, providers, and current feature set by inspecting the source and project configuration.

## Setup

1. Install a supported Node.js LTS version.
2. Install dependencies using the lockfile-aware command appropriate to the package manager (for npm projects, `npm ci` when a compatible lockfile is present).
3. Copy the documented example environment file, if one exists, and configure required API keys locally.
4. Start the development server using the script defined in `package.json`.
5. Build and test a production bundle before deployment.

## Security

- Never commit API keys, access tokens, or generated private media.
- Keep provider calls server-side when credentials must remain secret.
- Validate uploaded files and generated output, set size/time limits, and handle provider failures.
- Check the rights and consent for source media, voices, music, and likenesses used in generated videos.

## Project quality checklist

Document the required environment variables, supported Node version, available scripts, provider costs/limits, and output formats. Add tests for validation, provider errors, and failure recovery. README instructions should match the current implementation.
