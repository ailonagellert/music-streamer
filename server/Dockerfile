FROM node:20-alpine

WORKDIR /app

# Install build tools needed for sqlite3 native bindings
RUN apk add --no-cache python3 make g++

# Dependencies first — cached layer unless package.json changes
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Source code
COPY . .

# Pre-create storage directories (bind-mounted at runtime)
RUN mkdir -p storage/music storage

EXPOSE 3001

# Run as non-root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app
USER appuser

CMD ["node", "server.js"]
