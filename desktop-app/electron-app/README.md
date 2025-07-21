# AI Explainer Desktop

A desktop application built with Electron.js and React, based on the GemmaHackathon frontend. This app provides an AI-powered learning platform with topics, lessons, flashcards, and quizzes.

## Features

- **Topic Exploration**: Browse and search through various learning topics
- **Interactive Lessons**: Learn with structured lessons and key concepts
- **Flashcards**: Review important terms and definitions
- **Quizzes**: Test your knowledge with interactive quizzes
- **Progress Tracking**: Monitor your learning progress and statistics
- **Offline Support**: Works offline with local data storage

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Desktop**: Electron.js
- **Build Tool**: Vite
- **UI Components**: Radix UI, Lucide React Icons
- **Database**: SQLite (connected to v1 backend)

## Prerequisites

- Node.js 18+ 
- npm or yarn
- The v1 backend database (llm_app.db)

## Installation

1. Clone the repository and navigate to the electron-app directory:
```bash
cd electron-app
```

2. Install dependencies:
```bash
npm install
```

3. Make sure the v1 backend database exists:
```bash
# The database should be at ../v1/llm_app.db
ls ../v1/llm_app.db
```

## Development

To run the app in development mode:

```bash
npm run dev
```

This will:
- Start the Vite development server on port 3000
- Launch the Electron app in development mode
- Enable hot reloading for both React and Electron

## Building

To build the app for distribution:

```bash
npm run build
```

This will:
- Build the React app with Vite
- Package the app with Electron Builder
- Create distributable files in the `dist` directory

## Project Structure

```
electron-app/
├── src/
│   ├── components/ui/     # UI components (Button, Card, Input, etc.)
│   ├── lib/              # Utilities and database service
│   ├── types/            # TypeScript type definitions
│   ├── App.tsx           # Main React application
│   ├── index.tsx         # React entry point
│   └── index.css         # Global styles
├── public/               # Static assets
├── main.js               # Electron main process
├── preload.js            # Electron preload script
├── package.json          # Dependencies and scripts
├── vite.config.ts        # Vite configuration
└── tailwind.config.js    # Tailwind CSS configuration
```

## Database Integration

The app is designed to work with the SQLite database from the v1 backend. The database service (`src/lib/database.ts`) provides methods to:

- Get all topics
- Get topic details with lessons, flashcards, and quizzes
- Search topics
- Get database statistics

## Customization

### Adding New Topics

Topics are defined in the database service. To add new topics:

1. Update the `getTopics()` method in `src/lib/database.ts`
2. Add corresponding topic details in `getTopicDetails()`

### Styling

The app uses Tailwind CSS for styling. Custom styles can be added in `src/index.css`.

### UI Components

New UI components can be added in `src/components/ui/` following the existing pattern.

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start Electron app (requires built files)
- `npm run dist` - Create distributable packages

## Troubleshooting

### Common Issues

1. **Database not found**: Make sure the v1 backend database exists at `../v1/llm_app.db`
2. **Port 3000 in use**: Change the port in `vite.config.ts` and update the wait-on URL in package.json
3. **Build errors**: Make sure all dependencies are installed with `npm install`

### Development Tips

- Use the Electron DevTools for debugging (available in development mode)
- Check the console for database connection errors
- The app uses mock data by default - implement actual database queries as needed

## License

MIT License - see LICENSE file for details 