# Multi-stage build for PBMP (Blockly + Express API)
# Note: Zeabur often injects NODE_ENV=production during build, which would
# skip client tools — always force a full client install in the builder stage.
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/

# Skip root postinstall here; install each package tree explicitly
RUN npm install --ignore-scripts \
  && NPM_CONFIG_PRODUCTION=false npm install --prefix client --include=dev \
  && npm install --prefix server --omit=dev

COPY client ./client
COPY server ./server
COPY schemas ./schemas
COPY pbmp-implementation-pack ./pbmp-implementation-pack

RUN npm run build --prefix client

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
# Zeabur injects PORT; do NOT set PORT=${WEB_PORT} in dashboard (stays literal).
# Keep dashboard PORT=3000 and Networking container port = 3000 (must match).
ENV PORT=3000
ENV PBMP_DATA_DIR=/app/data/requirements
ENV PBMP_LMS_DATA_DIR=/app/data/lms

COPY server/package.json ./server/
RUN npm install --prefix server --omit=dev

COPY server ./server
COPY schemas ./schemas
COPY pbmp-implementation-pack ./pbmp-implementation-pack
COPY --from=builder /app/client/dist ./client/dist

RUN mkdir -p /app/data/requirements /app/data/lms

EXPOSE 3000

CMD ["node", "server/index.js"]
