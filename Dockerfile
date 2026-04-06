# ---- deps ----
FROM node:20-alpine AS deps
WORKDIR /app
# bcrypt requires native compilation
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---- build (frontend) ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- production ----
FROM node:20-alpine AS prod
WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Production node_modules
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./

# Backend + shared data (server imports from src/data/)
COPY server ./server
COPY src/data ./src/data

# Built frontend
COPY --from=build /app/dist ./dist

USER appuser

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "server/index.js"]
