FROM node:24-alpine AS build

WORKDIR /app

# Install dependencies first for better caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the source code
COPY . .

# Build the Vite frontend application
RUN npm run build

# Stage 2: Production environment
FROM node:24-alpine

# Patch OS-level vulnerabilities
RUN apk update && apk upgrade --no-cache && rm -rf /usr/local/lib/node_modules/npm/node_modules/tar

WORKDIR /app

# Copy built frontend assets
COPY --from=build /app/dist ./dist

# Copy backend source code and dependencies
COPY --from=build /app/server ./server
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package-lock.json ./package-lock.json
COPY --from=build /app/node_modules ./node_modules

# Expose the API and UI port
EXPOSE 8080

# Use production env by default (can be overridden)
ENV NODE_ENV=production
ENV PORT=8080

# Health check to ensure server is running
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/health || exit 1

# Start the server (NOT using npm run dev or vite)
CMD ["node", "server/index.cjs"]
