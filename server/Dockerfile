# Jeleboo backend — Bun runtime.
# Railway (or any Docker host) builds this from the `server/` root directory.
# The SQLite file must live on a persistent volume: mount one at /data and set
# DATABASE_PATH=/data/jeleboo.sqlite (see README.md deploy notes).

FROM oven/bun:1 AS runtime

WORKDIR /app

# Install production dependencies first for better layer caching.
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Source (bun:sqlite, Express) — no compile step needed.
COPY src ./src

ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000

CMD ["bun", "src/server.ts"]