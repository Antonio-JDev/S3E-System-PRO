# Backend Dockerfile - Multi-stage build

# Base stage
FROM node:20-alpine AS base
WORKDIR /app

# Install system dependencies for Puppeteer
RUN apk add --no-cache \
    libc6-compat \
    openssl \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    && rm -rf /var/cache/apk/*

# Install dependencies only when needed
FROM base AS deps
COPY package*.json ./
# Install dependencies (using npm install to handle lock file sync issues)
RUN npm install

# Development stage
FROM base AS development
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3001
RUN npm install -g tsx
RUN npx prisma generate
CMD ["npm", "run", "dev"]

# Builder stage - Compile TypeScript and generate Prisma
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Generate Prisma Client - retry logic for network issues
ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
# Try to generate Prisma Client with retries, but fail if all attempts fail
RUN (npx prisma generate || (sleep 5 && npx prisma generate) || (sleep 10 && npx prisma generate)) && echo "✅ Prisma Client generated successfully"
RUN npm run build

# Production stage
FROM base AS production
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV CHROMIUM_PATH=/usr/bin/chromium-browser

# Copy package files
COPY package*.json ./
# Copy node_modules from deps stage (includes all dependencies)
COPY --from=deps /app/node_modules ./node_modules

# Install tsx globally for running seed script
RUN npm install -g tsx

# Generate Prisma Client for production
COPY prisma ./prisma
# Copy Prisma binaries from builder stage (already downloaded there)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
# Try to generate, but if it fails due to network, use cached binaries
ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
RUN npx prisma generate || echo "⚠️ Prisma generate failed, using cached binaries from builder stage"

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Create uploads directories
RUN mkdir -p /app/uploads/logos /app/uploads/pdf-customization /app/uploads/tarefas-obra /app/uploads/temp

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Change ownership
RUN chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# ✅ COMANDO DE INICIALIZAÇÃO - Executa migrações, seed e inicia a aplicação
CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx prisma/seed.ts && node dist/app.js"]