# --- Stage 1: Build ---
FROM node:20-alpine AS build
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# (Optional) run TypeScript compile or build steps
# RUN npm run build

# --- Stage 2: Runtime ---
FROM node:20-alpine AS runtime
WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl

# Create a non-root user
RUN addgroup -S appgroup && \
	addgroup -g 1020 certgroup && \
	adduser -S appuser -G appgroup && \
	adduser appuser certgroup

# Copy production dependencies and built files
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app .

# Development Only! Install nodeamon
RUN npm install -g nodemon

# Drop to unprivileged user
USER appuser

# Expose port
EXPOSE 3000

# Healthcheck endpoint
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
	CMD wget -qO- http://localhost:3000/health || exit 1

# Entrypoint
# CMD ["node", "bin/www"]

CMD ["nodemon", "--watch", ".", "--exec", "node", "bin/www"]
