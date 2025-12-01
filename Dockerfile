# ---- Build stage ----
FROM node:18-alpine AS build
WORKDIR /app

# Force rebuild - 2025-12-01 19:46
ARG CACHE_BUST=20251201-1946

# Install deps
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./
RUN if [ -f package-lock.json ]; then npm ci; \
    elif [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
    elif [ -f pnpm-lock.yaml ]; then npm i -g pnpm && pnpm install --frozen-lockfile; \
    else npm install; fi

# Copy source
COPY . .

# Build-time Vite environment (passed via --build-arg in Cloud Build)
ARG NODE_ENV=production
ARG VITE_API_BASE_URL=https://ichiban-backend-248630813908.us-central1.run.app
ARG VITE_API_PREFIX=/api
ARG VITE_USE_MOCK=false
ENV NODE_ENV="$NODE_ENV" \
    VITE_API_BASE_URL="$VITE_API_BASE_URL" \
    VITE_API_PREFIX="$VITE_API_PREFIX" \
    VITE_USE_MOCK="$VITE_USE_MOCK"

# Clean any existing build artifacts and cache
RUN rm -rf dist node_modules/.vite

# Build Vite app
RUN npm run build

# ---- Runtime stage ----
FROM nginx:1.25-alpine AS runtime

# Cloud Run expects the app to listen on $PORT (default 8080).
# We set nginx to listen on 8080 via provided nginx.conf
ENV PORT=8080

# Static files location
COPY --from=build /app/dist /usr/share/nginx/html

# Custom nginx config with SPA fallback
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
