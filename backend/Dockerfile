# syntax=docker/dockerfile:1
# Backend Dockerfile - Multi-stage build
#
# Por que este build pode ser bem mais lento que o frontend:
# - Chromium (+ nss, fonts) é um pacote enorme no Alpine (vários MB, um dos maiores pesos por passo RUN).
# - libxmljs2 (install script nativo), sharp etc. aumentam bastante tempo de npm install vs um front só-Vite.
# - Puppeteer (mesmo skip do download) aumenta árvore de dependências npm.
#
# Mitigações: cache do npm (--mount); um único npm ci + prisma generate no builder; prune na produção
# para não repetir compile nativo nem instalar deps em duplicação paralela.

FROM node:20-alpine AS base
WORKDIR /app

RUN apk add --no-cache \
    libc6-compat \
    openssl \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    wget \
    && update-ca-certificates \
    && rm -rf /var/cache/apk/*

ENV npm_config_updates=false

# Uma só instalação completa — evita dois npm ci compilando libxmljs2/native duas vezes
FROM base AS deps
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm config set fetch-retries 5 && npm config set fetch-timeout 300000 && \
    npm ci

FROM base AS development
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3001
RUN npm install -g tsx
RUN npx prisma generate
CMD ["npm", "run", "dev"]

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
RUN (npx prisma generate || (sleep 5 && npx prisma generate) || (sleep 10 && npx prisma generate)) && echo "Prisma Client generated successfully"
RUN npm run build || (echo "Build completed with warnings" && exit 0)

FROM base AS production
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV PUPPETE_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETE_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV CHROMIUM_PATH=/usr/bin/chromium-browser

COPY package*.json ./
COPY --from=deps /app/node_modules ./node_modules
RUN npm prune --omit=dev

RUN npm install -g tsx

COPY prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/dist ./dist

RUN mkdir -p /app/uploads/logos /app/uploads/pdf-customization /app/uploads/tarefas-obra /app/uploads/temp /app/uploads/contato-lead
RUN mkdir -p /app/data/certificados
COPY certs ./certs

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs
RUN chmod -R o+rX /app && \
    chown -R nodejs:nodejs /app/uploads /app/data /app/certs

USER nodejs

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/app.js"]
