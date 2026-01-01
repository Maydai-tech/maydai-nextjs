# Dockerfile pour MaydAI Next.js
# Multi-stage build optimise pour la production

# ============================================
# STAGE 1: Dependencies
# ============================================
FROM node:20-alpine AS deps
WORKDIR /app

# Copier les fichiers de dependances
COPY package.json package-lock.json ./

# Installer TOUTES les dependances (y compris devDependencies pour le build)
RUN npm ci

# ============================================
# STAGE 2: Builder
# ============================================
FROM node:20-alpine AS builder
WORKDIR /app

# Copier les dependances installees
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variables d'environnement pour le build
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_COOKIEYES_ID

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_COOKIEYES_ID=$NEXT_PUBLIC_COOKIEYES_ID

# Desactiver la telemetrie Next.js
ENV NEXT_TELEMETRY_DISABLED=1

# Build de l'application
RUN npm run build

# ============================================
# STAGE 3: Runner (Production)
# ============================================
FROM node:20-alpine AS runner
WORKDIR /app

# Variables d'environnement production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Creer un utilisateur non-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copier les fichiers necessaires
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Changer les permissions
RUN chown -R nextjs:nodejs /app

# Utiliser l'utilisateur non-root
USER nextjs

# Exposer le port
EXPOSE 3000

# Demarrer l'application
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
