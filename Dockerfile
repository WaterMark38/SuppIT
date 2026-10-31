# SuppIT Phase 4 - local development container (Next.js API + Prisma)
# Neon PostgreSQL remains hosted in the cloud. No database image needed.
FROM node:22-bookworm-slim

# Prisma 6 uses OpenSSL in this Debian-based container.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# If you later commit a package-lock.json, npm ci is used automatically.
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; \
    else npm install --no-audit --no-fund; fi

# Copy the project, but never include .env in this image (see .dockerignore).
COPY . .
EXPOSE 3000

# The env_file in compose.yaml supplies DATABASE_URL and DIRECT_URL at runtime.
CMD ["sh", "-c", "npx prisma generate && npm run dev -- --hostname 0.0.0.0"]
