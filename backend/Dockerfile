FROM node:20-alpine AS base

WORKDIR /app

# Copiar archivos de definición de dependencias
COPY package*.json ./

# Instalar dependencias de producción
RUN npm ci --only=production

# Copiar código fuente del backend
COPY . .

# Crear carpeta para cargas de archivos si no existe
RUN mkdir -p uploads

EXPOSE 3056

ENV PORT=3056
ENV NODE_ENV=production

CMD ["node", "src/app.js"]
