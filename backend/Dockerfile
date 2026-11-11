# syntax=docker/dockerfile:1
FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-alpine
WORKDIR /app
RUN apk add --no-cache curl
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
ENV NODE_ENV=production
ENV PORT=8081
EXPOSE 8081
HEALTHCHECK --interval=10s --timeout=5s --start-period=45s --retries=5 \
  CMD curl -sf http://localhost:8081/actuator/health | grep -q '"status":"UP"' || exit 1
CMD ["node", "dist/main"]
