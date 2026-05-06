# 💩 PoopTunes: The Vibe-Coding Music Streamer

> **"It's not just a streamer, it's a mood."**

Welcome to **PoopTunes**, a self-hosted music streamer designed specifically for the **Vibe Coding** era. This repo isn't just code; it's a canvas for you and your AI agent to build the ultimate personal audio sanctuary.

![PoopTunes Mockup](https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&q=80&w=1200)

## 🎨 The Vibe
PoopTunes is built with a **Premium Dark & Brown** aesthetic—warm, cozy, and slightly irreverent. It’s designed to look like a high-end chocolate shop that happens to play lo-fi beats.

- **Frontend**: React + Vite + Vanilla CSS (No Tailwind utility clutter)
- **Backend**: Node.js + Express + SQLite
- **Infrastructure**: Docker Compose (One command to rule them all)

## 🛠️ The Vibe Coder's Toolkit

To start vibe coding with PoopTunes, you'll need a few essentials:

1. **Docker Desktop**: The heart of the operation. PoopTunes runs in containers so you don't have to worry about installing databases or Node versions manually. [Download here](https://www.docker.com/products/docker-desktop/).
2. **VS Code / Cursor**: You need a place to view your code and talk to your AI. We recommend [VS Code](https://code.visualstudio.com/) with an AI extension, or [Cursor](https://cursor.com/) for the ultimate vibe coding experience.
3. **Git**: To clone this repo and save your progress.
4. **An AI Partner**: This project is designed to be built *with* an AI. Whether it's the built-in agent in your IDE or a browser-based pair programmer, keep them open!

## 🚀 Quick Start (Vibe in 60 Seconds)

1. **Clone the Repo**:
   - Open **VS Code**.
   - Click the **Source Control** icon (or press `Ctrl+Shift+G`).
   - Click **Clone Repository** and enter: `https://github.com/ailonagellert/music-streamer.git`
   - Select an empty folder on your computer to save the project.
   - When prompted, click **Open** to load the workspace.
   - Open a terminal in VS Code (`Ctrl+` ` ` `) and type: `cd music-streamer`
2. **Environment Setup**:
   Copy the example environment file to create your own configuration:
   ```bash
   cp .env.example .env
   ```
   *(On Windows, you can just copy and paste the file and rename it to `.env`)*
3. **Launch**:
   ```bash
   docker compose up -d --build
   ```
4. **Enjoy**: Open `http://localhost:3005` (or whatever port you set in `.env`).

## 🛠️ Built for Vibe Coding
This repository is optimized for **AI-First Development**. We keep the styles in `index.css` and the logic clean so you can say things like:

> *"Hey Gemini, add a 'Zen Mode' that hides the library and shows a pulsing 💩 emoji that reacts to the music's frequency."*

### 💡 Prompt Ideas to Get You Started
- **Visuals**: "Make the background move with a slow, brown gradient flow."
- **Features**: "Add a 'Brown Noise' generator button to the player."
- **Social**: "Add a 'Share' button that copies a link to the current timestamp of the song."
- **Discovery**: "Add a 'Surprise Me' button that plays a random track with a high-energy transition."

See [PROMPTS.md](./PROMPTS.md) for a full list of inspiration.

## 📂 Architecture
- `/client`: The React SPA. Beautiful, responsive, and icon-driven.
- `/server`: The Express API. Handles MP3 streaming, ID3 metadata parsing, and SQLite storage.
- `/storage`: Where your music and database live (persisted via Docker volumes).

## 📜 Project Rules
We follow the **Vibe First** principle. Check [GEMINI.md](./GEMINI.md) for the project's "mental model"—keep it here so your AI agent always knows the vibe, the tech stack, and the conventions.

## 🤝 Contributing
If you've vibe-coded something cool, open a PR! We love new animations, better audio processing, and anything that makes the experience more "premium."

---
*Made with 💩 and ❤️ by the Vibe Coding Community.*
