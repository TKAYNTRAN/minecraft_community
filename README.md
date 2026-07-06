# Minecraft Seed Manager

A web application for managing and sharing Minecraft seeds with the community.

## Features

- User registration and authentication
- Post creation with seed information (version, seed code)
- Optional image uploads (1-5 images)
- Optional detailed description
- Tag system (max 4 tags): Dungeon, Stronghold, Mansion, Monument, Pillager Outpost, Mineshaft, Ruined Portal, Igloo, Ravine, Ancient City
- Dashboard to view all posts
- Like functionality
- Favorites page to view liked posts
- Sorting by likes and date
- Filtering by version and tags

## Tech Stack

- Frontend: React.js
- Backend: Node.js with Express
- Database: PostgreSQL

## Installation

1. Install dependencies for all projects:
```bash
npm run install-all
```

2. Set up PostgreSQL database and update connection string in `backend/config/database.js`

3. Start the development servers:
```bash
npm run dev
```

The frontend will run on http://localhost:3000
The backend will run on http://localhost:5000
