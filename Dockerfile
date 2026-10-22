# Imagen del frontend de Stockly: se compila con Vite y la sirve nginx (solo archivos estáticos).
# Etapa 1: compilar. VITE_API_URL queda fija dentro del JavaScript al compilar.
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# "/api" = misma dirección que la página; Caddy manda /api/* a la API
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Etapa 2: solo nginx + los archivos compilados (la imagen final no lleva Node ni node_modules)
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
