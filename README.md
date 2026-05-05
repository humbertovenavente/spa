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
