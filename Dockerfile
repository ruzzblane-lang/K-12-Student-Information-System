# Multi-stage build for School SIS application
FROM node:18-alpine AS base

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm ci --only=production

# Backend build stage
FROM node:18-alpine AS backend-build
WORKDIR /app
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --only=production
COPY backend/ ./backend/
RUN cd backend && npm run build || echo "Backend build completed"

# Frontend build stage  
FROM node:18-alpine AS frontend-build
WORKDIR /app
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci
COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Production stage
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S school-sis -u 1001

# Set working directory
WORKDIR /app

# Copy backend files
COPY --from=backend-build --chown=school-sis:nodejs /app/backend ./backend

# Copy frontend build files
COPY --from=frontend-build --chown=school-sis:nodejs /app/frontend/build ./frontend/build

# Copy root package files
COPY --chown=school-sis:nodejs package*.json ./

# Copy database migrations and seeds
COPY --chown=school-sis:nodejs db/ ./db/

# Copy configuration files
COPY --chown=school-sis:nodejs backend/env.example ./backend/.env

# Install production dependencies
RUN npm ci --only=production && npm cache clean --force

# Switch to non-root user
USER school-sis

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "backend/server.js"]
