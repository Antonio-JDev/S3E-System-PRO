# Frontend Dockerfile - Multi-stage build

# Base stage
FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
COPY package*.json ./
# Configurar npm para redes lentas (retries, timeout maior)
RUN npm config set fetch-retries 5 && npm config set fetch-timeout 300000
# Usar legacy-peer-deps para compatibilidade com React 19
RUN npm install --legacy-peer-deps

# Development stage
FROM base AS development
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# Builder stage - Build for production
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build args with defaults
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL

# Build the application
RUN npm run build

# Production stage with nginx
FROM nginx:alpine AS production
WORKDIR /usr/share/nginx/html

# Install curl for healthcheck
RUN apk add --no-cache curl

# Remove default nginx config first
RUN rm -f /etc/nginx/conf.d/default.conf

# Copy nginx config
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from builder
COPY --from=builder /app/dist .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nginx_user -u 1001 -G nodejs && \
    chown -R nginx_user:nodejs /usr/share/nginx/html && \
    chown -R nginx_user:nodejs /var/cache/nginx && \
    chown -R nginx_user:nodejs /var/log/nginx && \
    chown -R nginx_user:nodejs /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown nginx_user:nodejs /var/run/nginx.pid

USER nginx_user

EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
