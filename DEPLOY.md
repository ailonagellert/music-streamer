# 💩 PoopTunes — Self-Hosted Deployment Guide

## Requirements

| Dependency | Minimum version |
|---|---|
| Docker | 24+ |
| Docker Compose | v2 (`docker compose`) |

---

## 1 — Copy the project to your server

```bash
# Option A — rsync
rsync -avz --exclude 'node_modules' --exclude 'data' \
  ./music-streamer/ user@your-server:/opt/pooptunes/

# Option B — git (if you've committed it)
git clone <your-repo-url> /opt/pooptunes
```

---

## 2 — Configure environment

```bash
cd /opt/pooptunes
cp .env.example .env
nano .env          # set HOST_PORT and UPLOAD_LIMIT_MB
```

`.env` options:

| Variable | Default | Description |
|---|---|---|
| `HOST_PORT` | `8080` | Port exposed on your server (firewall this!) |
| `UPLOAD_LIMIT_MB` | `200` | Max MP3 upload size in MB |

---

## 3 — Build and start

```bash
docker compose up -d --build
```

First build takes 2–4 minutes (compiling sqlite3 native bindings + React bundle).

Check everything is healthy:

```bash
docker compose ps
docker compose logs -f
```

App is live at: **http://your-server-ip:8080**

---

## 4 — Put it behind a reverse proxy (recommended)

### Nginx (on the host)

```nginx
server {
    listen 80;
    server_name music.yourdomain.com;

    # Redirect HTTP → HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name music.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/music.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/music.yourdomain.com/privkey.pem;

    client_max_body_size 200m;

    location / {
        proxy_pass         http://127.0.0.1:8080;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}
```

### Traefik (Docker label approach)

Add these labels to the `client` service in `docker-compose.yml`:

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.pooptunes.rule=Host(`music.yourdomain.com`)"
  - "traefik.http.routers.pooptunes.entrypoints=websecure"
  - "traefik.http.routers.pooptunes.tls.certresolver=letsencrypt"
  - "traefik.http.services.pooptunes.loadbalancer.server.port=80"
```

---

## 5 — Data & Backups

All persistent data lives in Docker named volumes:

| Volume | Contents |
|---|---|
| `music_data` | Your MP3 files |
| `db_data` | SQLite database (track metadata) |

**Backup:**
```bash
# Dump volumes to a tar archive
docker run --rm \
  -v pooptunes_music_data:/music \
  -v pooptunes_db_data:/db \
  -v $(pwd)/backup:/backup \
  alpine tar czf /backup/pooptunes-backup-$(date +%Y%m%d).tar.gz /music /db
```

**Restore:**
```bash
docker run --rm \
  -v pooptunes_music_data:/music \
  -v pooptunes_db_data:/db \
  -v $(pwd)/backup:/backup \
  alpine tar xzf /backup/pooptunes-backup-YYYYMMDD.tar.gz -C /
```

---

## 6 — Useful commands

```bash
# Stop everything
docker compose down

# Rebuild after code changes
docker compose up -d --build

# View API logs
docker compose logs -f server

# View nginx logs
docker compose logs -f client

# Open a shell in the API container
docker compose exec server sh

# Check disk usage of volumes
docker system df -v
```

---

## Architecture

```
Browser
  │
  ▼
[nginx :80]  ──── static React SPA (dist/)
  │
  │  /api/*
  ▼
[Node/Express :3001]
  │
  ├── SQLite  (db_data volume)
  └── MP3s    (music_data volume)
```

Both containers run on the internal `pooptunes` bridge network — only nginx is exposed to the host.
