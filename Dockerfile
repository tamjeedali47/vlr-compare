# syntax=docker/dockerfile:1

# Production image for the Next.js web app.
# Multi-stage: each stage starts clean, and only the final "runner" stage
# ships. Build with:  docker build -t vlr-compare-web .

ARG NODE_VERSION=24

# --- deps: install node_modules from the lockfile -------------------------
# Kept separate so this layer is cached until package*.json changes.
FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- builder: compile the app ---------------------------------------------
FROM node:${NODE_VERSION}-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- runner: minimal runtime image ----------------------------------------
FROM node:${NODE_VERSION}-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Don't run as root inside the container.
RUN addgroup -S nodejs -g 1001 && adduser -S nextjs -u 1001 -G nodejs

# The standalone output contains server.js plus only the traced
# dependencies; static assets and public/ must be copied alongside it.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
