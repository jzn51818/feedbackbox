# ============================================================
# Stage 1: deps — install production + dev dependencies
# ============================================================
FROM node:20-alpine AS deps

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Copy package manager files
COPY package.json package-lock.json* ./
# If using yarn, copy yarn.lock instead:
# COPY package.json yarn.lock* ./
# If using pnpm, copy pnpm-lock.yaml instead:
# COPY package.json pnpm-lock.yaml* ./

# Copy Prisma schema (needed for postinstall generate)
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for build)
RUN npm ci

# ============================================================
# Stage 2: builder — build the Next.js application
# ============================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy the rest of the application source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Set environment variables for build
# These are build-time only; runtime values come from ECS task definition
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"

# Build Next.js
RUN npm run build

# ============================================================
# Stage 3: runner — minimal production image
# ============================================================
FROM node:20-alpine AS runner

WORKDIR /app

# Install only what's needed at runtime
RUN apk add --no-cache libc6-compat openssl

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the standalone output
COPY --from=builder /app/.next/standalone ./
# Copy static assets
COPY --from=builder /app/.next/static ./.next/static
# Copy public folder (if it exists)
COPY --from=builder /app/public ./public

# Copy Prisma files needed at runtime (for migrations on startup)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Set correct permissions
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Runtime environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

EXPOSE 3000

# Start the server
# Option A: Just start the server (migrations run separately)
CMD ["node", "server.js"]

# Option B: Run migrations then start (hackathon convenience)
# CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
