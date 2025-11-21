# MacOS Web UI

A web-based operating system interface inspired by macOS, built with React, Vite, and Tailwind CSS.
It features a functional Desktop, Dock, Window Manager, and integrated apps including a Gemini AI Chat widget.

## Features

- **MacOS-like UI**: Desktop, Dock, Menu Bar, and Window management.
- **Gemini AI Widget**: A chat interface powered by Google's Gemini API, featuring a Siri-like aesthetic.
- **System Activation**: Secure setup for API keys.
- **Google Authentication**: Sign in with your Google account.

## Prerequisites

- Node.js (v18 or higher)
- npm

## Installation

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```

## Running the Application

Start the development server and the backend API concurrently:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

## System Activation (First Run)

When you run the application for the first time, you will be presented with a **System Activation** screen. This is required to configure the backend with necessary API keys.

1. **Google OAuth Credentials**:
   - You need a Google Cloud Project with OAuth 2.0 credentials.
   - Enter your `Client ID` and `Client Secret`.
   - Ensure your authorized redirect URIs include `http://localhost:5173`.

2. **Gemini API Key**:
   - Get an API key from [Google AI Studio](https://aistudio.google.com/).
   - Enter your `Gemini API Key`.

3. Click **Activate System**.
   - These settings are securely stored in a local SQLite database (`server/database.sqlite`).
   - You will not need to enter them again unless you reset the database.

## Development

- **Frontend**: React + Vite (located in `src/`)
- **Backend**: Express + SQLite (located in `server/`)
