# ---- Build stage ----
FROM node:18-alpine AS build
WORKDIR /app

# Install deps
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./
RUN if [ -f package-lock.json ]; then npm ci; \
    elif [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
    elif [ -f pnpm-lock.yaml ]; then npm i -g pnpm && pnpm install --frozen-lockfile; \
    else npm install; fi

# Copy source
COPY . .

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
