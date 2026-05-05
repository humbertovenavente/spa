# Gastos Familiares

SPA Angular 18 + Tailwind CSS para gestionar gastos familiares.

## Funcionalidades

- Agregar miembros de la familia (nombre, aporte mensual, método de pago)
- Crear el presupuesto mensual total y dividirlo automáticamente entre todos
- Cada miembro tiene un **link único** (`/#/pagar/:memberId`) donde:
  - Registra cuánto pagó
  - Sube foto del comprobante
  - Selecciona método de pago
  - Ve cuánto le falta y cuánto lleva acumulado
- Resumen global con barra de progreso y estado por persona
- Persistencia local con `localStorage` (no hay backend)

## Cómo correr

```bash
npm install
npm start
```

Se abrirá en http://localhost:4200

## Stack

- Angular 18 (standalone components + signals)
- Tailwind CSS 3
- Router con hash routing (links compartibles funcionan en file-server)
- Backend Express + Mongoose, MongoDB Atlas

## Despliegue en Vercel

El proyecto está listo para Vercel:

- Frontend: Angular se construye con `ng build` → `dist/gastos-familiares/browser`
- Backend: serverless function en `api/[...slug].mjs` (Express + Mongoose)
- Configuración en `vercel.json`

**Variables de entorno requeridas en el dashboard de Vercel** (Settings → Environment Variables):
- `MONGODB_URI` — connection string de MongoDB Atlas
- `DB_NAME` — `spa`
- `ALLOWED_ORIGINS` (opcional) — coma-separados, ej. `https://tu-dominio.vercel.app`

El frontend (`src/app/api.config.ts`) detecta el host:
- En `localhost` pega al backend local en `:3001`
- En cualquier otro host pega a `https://spa-pink-nine.vercel.app/api` (mismo dominio en producción)

## Backend local (alternativa)

Para correr el backend Express directo en tu máquina (sin Vercel):

```bash
cd server
cp .env.example .env  # editar con tu MONGODB_URI
npm install
npm start             # http://localhost:3001
```
