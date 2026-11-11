# syntax=docker/dockerfile:1
FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG EXPO_PUBLIC_API_URL=http://localhost:8082
ARG EXPO_PUBLIC_SPRING_DEV_TOKEN=
ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL
ENV EXPO_PUBLIC_SPRING_DEV_TOKEN=$EXPO_PUBLIC_SPRING_DEV_TOKEN
RUN npx expo export --platform web

FROM nginx:alpine
RUN apk add --no-cache curl
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -sf http://localhost/ > /dev/null || exit 1
