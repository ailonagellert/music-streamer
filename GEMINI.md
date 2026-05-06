# PoopTunes — Project Rules & Memory

> This file is the authoritative memory for this project.
> Read it before making any changes. Update it when adding features,
> changing conventions, or making architectural decisions.

---

## 🪪 Project Identity

| Key | Value |
|---|---|
| **Name** | PoopTunes |
| **Logo** | 💩 (animated wiggle in header) |
| **Tagline** | Self-hosted music streamer |
| **Theme** | Black & brown — warm, dark, premium |

---

## 🏗️ Architecture Overview

```
Browser
  │
  ▼
[nginx :80]  — serves React SPA (built by Vite)
  │  /api/*
  ▼
[Node/Express :3001]  — REST API
  ├── SQLite  (named volume: db_data)
  └── MP3s    (named volume: music_data → storage/music/)
```

Both containers share the internal `pooptunes` Docker bridge network.
Only nginx is port-exposed to the host.

---

## 📁 Directory Structure

```
music-streamer/
├── docker-compose.yml       # Production compose — single source of truth
├── .env.example             # Template — copy to .env on server
├── .dockerignore            # Root-level Docker ignore
├── DEPLOY.md                # Server deployment guide
├── GEMINI.md                # ← this file
│
├── client/                  # React frontend (Vite + Tailwind)
│   ├── Dockerfile           # 2-stage: node builder → nginx:1.27-alpine
│   ├── nginx.conf           # SPA fallback + /api/ proxy + gzip + security headers
│   ├── vite.config.js       # Vite config (dev proxies /api → localhost:3001)
│   ├── tailwind.config.js
│   └── src/
│       ├── App.jsx           # Root — OAuth callback, routing, ambient trigger
│       ├── index.css         # ALL styles (no Tailwind utilities in components)
│       ├── main.jsx
│       ├── services/
│       │   └── api.js        # Axios instance — baseURL /api
│       ├── hooks/
│       │   └── useOAuth.js   # PKCE helpers, token storage, OAUTH_CONFIGS, buildAuthUrl
│       └── components/
│           ├── LibraryGrid.jsx      # Track card grid (with delete support)
│           ├── Player.jsx           # Bottom now-playing bar (sticky + mobile optimized)
│           ├── AmbientPlayer.jsx    # Web Audio API generative lo-fi music
│           ├── StreamingServices.jsx # OAuth modal + Spotify wizard
│           ├── UploadModal.jsx      # Drag-and-drop MP3 uploader
│           └── FeatureRequest.jsx   # 💡 Floating bubble for AI prompt submissions
│
└── server/                  # Node.js / Express API
    ├── Dockerfile            # node:20-alpine + python3/make/g++ for sqlite3
    ├── server.js             # Express entry — PORT from env
    ├── .env                  # Local dev only — never commit
    ├── routes/
    │   └── api.js            # GET /library, POST /upload, DELETE /tracks/:id, POST /feedback
    ├── controllers/
    │   ├── libraryController.js  # uploadTrack, getLibrary, deleteTrack, submitFeedback
    │   └── streamController.js   # streamAudio (range requests)
    └── config/
        └── db.js             # SQLite init — tracks, playlists, playlist_tracks, feedback tables
```

---

## 🎨 Design System

### Color Palette (CSS custom properties in `index.css`)

```css
--black:        #0a0705   /* page background */
--deep:         #100c09   /* header / player bar */
--surface:      #1a1109   /* inputs, inset panels */
--card:         #221608   /* track cards */
--card-hover:   #2e1f0d
--border:       #3d2a14
--border-soft:  #2a1c0a

--brown-dark:   #6b3a1f
--brown:        #8b4a1f
--brown-mid:    #a0612a   /* primary accent */
--brown-light: #c4853d
--amber:        #d4a853
--gold:         #e8c56a

--text-primary:   #f5e6cc  /* warm cream */
--text-secondary: #b89060
--text-muted:     #6b4e2a

--accent-glow:  #c4853d44  /* box-shadow glow tint */
```

### Typography
- Font: **Inter** from Google Fonts (400 / 500 / 600 / 700 / 900)
- Loaded via `@import` at the very top of `index.css` — MUST stay before `@tailwind` directives

### CSS Rules
- **All styles live in `src/index.css`** — no Tailwind utility classes in JSX
- Use BEM-ish class names (`.service-card`, `.service-card.service-connected`)
- Animations use `@keyframes` defined in `index.css`
- Spotify brand color: `#1DB954` — used only for Spotify wizard elements

---

## 🔌 API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/library` | Returns all tracks `[{id, title, artist, album, duration}]` |
| `POST` | `/api/upload` | Multer single file (`track` field) — reads ID3, saves to SQLite |
| `DELETE` | `/api/tracks/:id` | Deletes track from DB and removes file from disk |
| `POST` | `/api/feedback` | Saves a feature request / prompt to the DB |
| `GET` | `/api/stream/:id` | Range-request audio streaming from `storage/music/` |

### Upload constraints (server/routes/api.js)
- Field name: `track`
- Accepted: `audio/mpeg` or `.mp3` extension
- Max size: `UPLOAD_LIMIT_MB` env var (default 200 MB)

---

## 🗄️ Database Schema (SQLite)

```sql
CREATE TABLE tracks (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT NOT NULL,
  artist     TEXT,
  album      TEXT,
  genre      TEXT,
  duration   REAL,
  filePath   TEXT NOT NULL,        -- relative path: storage/music/...
  mimeType   TEXT,
  createdAt  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE playlists (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  name      TEXT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE playlist_tracks (
  playlist_id  INTEGER REFERENCES playlists(id),
  track_id     INTEGER REFERENCES tracks(id),
  track_order  INTEGER
);

CREATE TABLE feedback (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  content   TEXT NOT NULL,
  status    TEXT DEFAULT 'pending',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

DB path: `server/storage/database.sqlite` (bind-mounted via `db_data` volume)

---

## 🔑 OAuth / Streaming Services

Implemented in `src/hooks/useOAuth.js` and `src/components/StreamingServices.jsx`.

### OAUTH_CONFIGS (keyed by service ID)

| ID | Name | Flow | Secret needed? | Special |
|---|---|---|---|---|
| `spotify` | Spotify | PKCE | ❌ | **Guided wizard** (3 steps) |
| `tidal` | Tidal | PKCE | ❌ | |
| `youtube` | YouTube Music | PKCE (Google) | ❌ | |
| `amazon` | Amazon Music | Auth code | ✅ | |
| `deezer` | Deezer | Auth code | ✅ | |
| `soundcloud` | SoundCloud | Auth code | ✅ | |
| `apple` | Apple Music | MusicKit dev token | ❌ | `devToken: true` |

### Token storage
- Keys: `pt_oauth_<svcId>` → `localStorage` (JSON with `savedAt`, `expires_in`)
- PKCE verifier: `pt_pkce_verifier_<svcId>`
- State: `pt_oauth_state_<svcId>`
- Pending service: `pt_last_oauth_svc`
- Client creds: `pt_client_<svcId>`

### OAuth callback
- Redirect URI: `window.location.origin + '/callback'`
- Handled in `App.jsx` `useEffect` on mount — detects `?code=` + `?state=` params
- Cleans URL with `window.history.replaceState`
- Shows a toast notification (`.oauth-toast`) on success/error

---

## 🎹 Ambient Music Player

Component: `src/components/AmbientPlayer.jsx`

- **Active when**: library is empty AND no track is currently playing
- **Engine**: Web Audio API (no external deps)
- **Sound design**:
  - Triangle oscillators × 3 per voice (detuned at -4/0/+4 cents for chorus)
  - Low-pass filter at 900 Hz
  - Delay-based reverb (1.2s delay, 0.45 feedback, 600 Hz LPF on return)
  - Vinyl noise (highpass-filtered white noise at 8 kHz, gain 0.18)
- **Chord progression**: Am7 → Fmaj7 → Cmaj7 → G7 at 68 BPM, 8 beats per chord

---

## 🐳 Docker / Deployment

### Compose services

| Service | Image | Port | Volume |
|---|---|---|---|
| `server` | `pooptunes-server:latest` | internal 3001 | `music_data`, `db_data` |
| `client` | `pooptunes-client:latest` | `HOST_PORT:80` | — |

### Environment variables (.env)

| Variable | Default | Effect |
|---|---|---|
| `HOST_PORT` | `3005` | Host port for the UI |
| `UPLOAD_LIMIT_MB` | `200` | Multer file size limit |

---

## ✨ Vibe Coding Guidelines

1. **AI-First Logic**: Keep components modular and state-driven. When adding features, describe the "vibe" and "function" clearly in your prompt.
2. **CSS-Only Visuals**: Avoid utility classes. Keep the "Black & Brown" design tokens central in `index.css`.
3. **Low Friction**: Docker is the source of truth. If a native module is added, update the Dockerfile immediately.
4. **Interactive Polish**: Every action should have a hover state, an animation, or a transition.

---

## 🚧 Potential Future Features

- [ ] Playlist creation / management UI (DB tables already exist)
- [ ] Album art display (music-metadata can extract cover art)
- [ ] Shuffle / repeat controls in Player
- [ ] Search / filter in LibraryGrid
- [ ] Visual audio frequency visualizer in Player
- [ ] Multi-user support (auth layer)
- [ ] Native mobile wrapper (Capacitor/Cordova)
