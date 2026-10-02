# Usar node:20-slim (Debian) en lugar de Alpine para máxima compatibilidad con esbuild y Rollup
FROM node:20-slim AS builder

WORKDIR /app/frontend

# Copiar solo el package.json para forzar a generar dependencias desde cero para Linux
COPY package.json ./
RUN npm install

# Copiar el código del frontend
COPY . .

# Memoria ajustada a 800MB (suficiente para Vite sin reventar un VPS de 1GB)
ENV NODE_OPTIONS="--max-old-space-size=800"

# Construir el proyecto usando el script original
RUN npm run build

FROM nginx:alpine

# Configurar Nginx con el proxy y reglas SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar los estáticos compilados desde la ruta que Vite generó
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
