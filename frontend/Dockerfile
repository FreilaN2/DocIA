FROM node:18-alpine AS builder

WORKDIR /app

# Copiar configuración e instalar
COPY package*.json ./
RUN npm install

# Copiar el código
COPY . .

# Compilar el frontend. Se fuerza outDir a 'dist' para evitar que Vite intente escribir en ../backend/dist
RUN npx vite build --outDir dist --emptyOutDir

FROM nginx:alpine

# Configurar Nginx con el proxy y reglas SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar los estáticos compilados
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
