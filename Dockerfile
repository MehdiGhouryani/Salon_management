# =============================================================================
# NobatAra production image — multi-stage, non-root, graceful shutdown
# Build:  docker build -t nobatara:latest .
# Run:    docker run --env-file .env.production -p 8080:8080 nobatara:latest
# =============================================================================

# ---------- Stage 1: dependencies (locked install, cached) ----------
FROM node:24-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---------- Stage 2: production build ----------
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json tsconfig.json vite.config.ts index.html ./
COPY src ./src
RUN npm run build

# ---------- Stage 3: runtime (production dependency tree only) ----------
FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Phase 19 (approach B — minimum runtime deps): tsx lives in "dependencies"
# because the CMD runs the TypeScript server directly (zero-transpile-drift
# design); every other tool (vite, react, test runners, types) is a
# devDependency. Installing with --omit=dev yields ONLY express, cookie-parser,
# dotenv, pg, tsx + their transitive deps — no dev-only tools ship in the image.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY tsconfig.json ./
COPY server ./server
COPY scripts ./scripts
COPY --from=build /app/dist ./dist

# Non-root runtime user
RUN groupadd -r nobatara && useradd -r -g nobatara nobatara && \
    chown -R nobatara:nobatara /app
USER nobatara

EXPOSE 8080

# Health check hits the liveness endpoint (DB-independent by design)
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8080/api/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# tsx forwards SIGTERM to the Node process; server/index.ts drains HTTP +
# database pool before exiting (graceful shutdown verified).
CMD ["npx", "tsx", "server.ts"]
