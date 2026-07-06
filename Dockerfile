# Multi-stage production container setup for Next.js and Prisma
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl sqlite

# Dependencies stage
FROM base AS deps
COPY package*.json ./
RUN npm ci

# Builder stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Run prisma client generator
RUN npx prisma generate
# Build the nextjs bundle
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production
RUN npm run build

# Runner stage
FROM base AS runner
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src

# Expose NextJS port
EXPOSE 3000

# Execute prisma database push and seed, then run NextJS dev/prod server
CMD npx prisma db push && npx prisma db seed && npm run start
