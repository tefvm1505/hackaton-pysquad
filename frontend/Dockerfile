# ---- 1) Compilar el frontend ----
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite escribe esta URL en el JavaScript al compilar (no se lee al arrancar el contenedor).
# "/api" es relativo: el navegador llama al mismo dominio y nginx reenvía al backend.
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ---- 2) Servir con nginx ----
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
