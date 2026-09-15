# ─────────────────────────────────────────────────────────────
# Image de production Para Beauregard (PostgreSQL)
# Build : docker build -t para-beauregard .
# Run   : docker run -p 3000:3000 -e DATABASE_URL="postgresql://…" -e SESSION_SECRET="…" para-beauregard
# Health: GET /api/health (200 = ok, 503 = DB KO, version incluse)
# ─────────────────────────────────────────────────────────────

FROM node:22-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Prisma query engine needs OpenSSL on Alpine
RUN apk add --no-cache openssl

# Dépendances seules (cache Docker optimal)
FROM base AS deps
COPY package.json package-lock.json ./
# postinstall (scripts/prisma.mjs) runs in the builder stage, where scripts/ exists
RUN npm ci --ignore-scripts

# Build (génère le client Prisma PostgreSQL + bundle Next output:standalone)
FROM base AS builder
# Placeholder PostgreSQL URL: only selects the Prisma provider at build time.
# No database is contacted during the build and nothing is persisted in the runtime image.
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# SESSION_SECRET is only needed while Next collects page data; the placeholder is
# scoped to this RUN and never persisted into the runtime image.
RUN SESSION_SECRET=docker-build-only-placeholder npm run build

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

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]
