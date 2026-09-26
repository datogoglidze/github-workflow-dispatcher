FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_API_BASE_URL=http://localhost:8000
ARG VITE_BASE_PATH=/
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_BASE_PATH=$VITE_BASE_PATH
RUN npm run build

FROM nginx:stable-alpine
ARG VITE_BASE_PATH=/
ENV VITE_BASE_PATH=$VITE_BASE_PATH
COPY docker-entrypoint.d/40-web-config.sh /docker-entrypoint.d/40-web-config.sh
RUN sed -i 's/\r$//' /docker-entrypoint.d/40-web-config.sh && chmod +x /docker-entrypoint.d/40-web-config.sh
COPY --from=build /app/dist /opt/web-dist
