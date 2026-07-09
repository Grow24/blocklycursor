# Multi-stage build for PBMP (Blockly + Express API)
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/

RUN npm install && npm install --prefix client && npm install --prefix server

COPY client ./client
COPY server ./server
COPY schemas ./schemas
COPY pbmp-implementation-pack ./pbmp-implementation-pack

RUN npm run build --prefix client

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
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
