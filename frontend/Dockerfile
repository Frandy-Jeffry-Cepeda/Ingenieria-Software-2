# syntax=docker/dockerfile:1

# ---------- 1) Build del bundle de Vite ----------
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Por defecto el frontend habla con /api (proxy de nginx hacia el backend).
# Si el backend vive en otro dominio, pasar --build-arg VITE_API_URL=https://api.midominio.com
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ---------- 2) Servido estático con nginx ----------
FROM nginx:1.27-alpine AS runtime

# Host:puerto del backend dentro de la red de Docker
ENV BACKEND_ORIGIN=backend:3000 \
    NGINX_ENVSUBST_FILTER=BACKEND_ORIGIN

COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/healthz || exit 1
