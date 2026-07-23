# 🚀 Despliegue Independiente en Dokploy (FinaFini)

Esta guía explica cómo desplegar los dos proyectos (**Backend** y **Frontend**) de forma independiente en **Dokploy**, utilizando sus respectivos archivos `Dockerfile` y puertos expuestos personalizados.

---

## 📂 Puertos y Archivos Docker por Proyecto

### 1. Backend (`/backend`)
- **Puerto expuesto:** `3056`
- **`backend/Dockerfile`**: Construye la API Node.js/Express en el puerto `3056`.
- **`backend/.dockerignore`**: Excluye `node_modules` y archivos temporales.

### 2. Frontend (`/frontend`)
- **Puerto expuesto:** `8094`
- **`frontend/Dockerfile`**: Build Multi-stage (Node.js 20 -> Nginx Alpine) en el puerto `8094`.
- **`frontend/nginx.conf`**: Configuración Nginx escuchando en el puerto `8094` con soporte para React Router SPA.
- **`frontend/.dockerignore`**: Excluye `node_modules` y la carpeta `dist`.

---

## 🛠️ Pasos para Desplegar en Dokploy

### 🔹 Paso 1: Desplegar el Backend en Dokploy
1. Entra a tu panel de **Dokploy**.
2. Ve a **Projects** -> Selecciona tu proyecto (`finafini`).
3. Haz clic en **Create Application** -> Nombre: `finafini-backend`.
4. En la pestaña **Source**:
   - Conecta tu repositorio Git.
   - **Branch**: `main` (o tu rama activa).
   - **Build Type**: `Dockerfile`.
   - **Dockerfile Path**: `./backend/Dockerfile`.
   - **Context Path**: `./backend`.
5. En la pestaña **Environment**:
   Agrega las variables de entorno necesarias:
   ```env
   PORT=3056
   NODE_ENV=production
   DB_URL=postgresql://galeotekbd:galeotek1029bd@82.208.23.125:7007/finafini
   JWT_SECRET=finafini_super_secret_jwt_key_2026
   ```
6. En la pestaña **Network / Port**:
   - Configura el puerto interno del contenedor: **`3056`**.
   - Asigna tu dominio o subdominio (ej: `api.finafini.com`).
7. Haz clic en **Deploy**.

---

### 🔹 Paso 2: Desplegar el Frontend en Dokploy
1. En Dokploy, haz clic en **Create Application** -> Nombre: `finafini-frontend`.
2. En la pestaña **Source**:
   - Conecta tu repositorio Git.
   - **Branch**: `main`.
   - **Build Type**: `Dockerfile`.
   - **Dockerfile Path**: `./frontend/Dockerfile`.
   - **Context Path**: `./frontend`.
3. En la pestaña **Build Args**:
   - Agrega la variable para conectar con el backend:
     `VITE_API_URL=https://api.finafini.com/api` *(reemplaza con la URL pública de tu backend)*.
4. En la pestaña **Network / Port**:
   - Configura el puerto interno del contenedor: **`8094`**.
   - Asigna tu dominio o subdominio (ej: `app.finafini.com`).
5. Haz clic en **Deploy**.

---

## 🧪 Comprobación de Construcción Local

Si deseas probar la imagen Docker de cada proyecto localmente:

### Probar Backend:
```bash
cd backend
docker build -t finafini-backend .
docker run -p 3056:3056 finafini-backend
```

### Probar Frontend:
```bash
cd frontend
docker build --build-arg VITE_API_URL=http://localhost:3056/api -t finafini-frontend .
docker run -p 8094:8094 finafini-frontend
```
