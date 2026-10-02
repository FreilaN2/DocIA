FROM node:18-alpine AS builder

WORKDIR /app/frontend

# Copiar configuración e instalar
COPY package*.json ./
RUN npm install

# Copiar el código del frontend
COPY . .

# Crear el directorio destino que espera Vite (../backend/dist)
RUN mkdir -p /app/backend/dist

# Incrementar la memoria máxima de Node para evitar Out Of Memory en VPS pequeños
ENV NODE_OPTIONS="--max-old-space-size=1024"

# Construir el proyecto usando el script original
RUN npm run build

FROM nginx:alpine

# Configurar Nginx con el proxy y reglas SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar los estáticos compilados desde la ruta que Vite generó
COPY --from=builder /app/backend/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
