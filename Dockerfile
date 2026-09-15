# ─────────────────────────────────────────────────────────────
# Image de production THIQTI.MA
# Build : docker build -t thiqti-ma .
# Run   : docker run -p 3000:3000 -e DATABASE_URL="…" -e SESSION_SECRET="…" thiqti-ma
# Health: GET /api/health (200 = ok, 503 = DB KO, version incluse)
# ─────────────────────────────────────────────────────────────

FROM node:22-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Dépendances seules (cache Docker optimal)
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# Build (génère Prisma client + bundle Next output:standalone)
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

# Runtime minimal : fichiers standalone + public
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# DB SQLite locale (smoke test CI) : dossier pré-créé et inscriptible
# par l'utilisateur non-root nextjs (sinon Permission denied au run).
RUN mkdir -p /app/data \
  && chown nextjs:nodejs /app/data

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]