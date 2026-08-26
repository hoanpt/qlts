# ==========================================
# STAGE 1: Build Frontend (Vite React TS)
# ==========================================
FROM node:20-alpine AS client-builder
WORKDIR /app/client

ENV NODE_ENV=development
ENV NODE_OPTIONS="--max-old-space-size=2048"

COPY client/package*.json ./
RUN npm install

COPY client/ ./
RUN npm run build

# ==========================================
# STAGE 2: Build Backend (Express TypeScript)
# ==========================================
FROM node:20-alpine AS server-builder
WORKDIR /app/server

ENV NODE_ENV=development
ENV NODE_OPTIONS="--max-old-space-size=2048"

COPY server/package*.json ./
COPY server/prisma ./prisma/
RUN npm install

COPY server/ ./
RUN npx prisma generate
RUN npm run build

# ==========================================
# STAGE 3: Production Runtime
# ==========================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Copy server package and production dependencies
COPY server/package*.json ./server/
COPY server/prisma ./server/prisma/

WORKDIR /app/server
RUN npm install --omit=dev
RUN npx prisma generate

# Copy built server dist & initial database seed data
COPY --from=server-builder /app/server/dist ./dist
COPY server/prisma/initial-seed-data.json* ./prisma/
COPY server/prisma/dev.db* ./prisma/

# Copy built client dist for SPA static serving
COPY --from=client-builder /app/client/dist /app/client/dist

# Create uploads directory and data persistence volume
RUN mkdir -p /app/server/uploads /app/data

EXPOSE 3001

CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/src/index.js"]

