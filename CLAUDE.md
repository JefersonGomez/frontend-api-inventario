# Instrucciones — inventario-frontend

Antes de leer esto, ya deberías haber leído `../MEMORY.md` (carpeta padre) y `../CLAUDE.md`. Este archivo son las convenciones específicas de este repo.

---

## Stack

React + Vite (JavaScript, no TS) + TailwindCSS v4 + shadcn/ui (Base UI, preset Vega) + react-router-dom + axios + @tanstack/react-query + react-i18next.

---

## Convenciones (seguir siempre, sin excepción)

- Páginas con **named export** (`export function X()`), nunca `export default` — `AppRoutes.jsx` importa todo como named exports.
- shadcn/ui en este proyecto usa **Base UI, no Radix** — nunca usar `asChild`, siempre `render={<Componente />}` en cualquier Trigger (`DialogTrigger`, `AlertDialogTrigger`, `DropdownMenuTrigger`, etc.). `asChild` causa `<button>` anidado y error de hidratación.
- Cada ruta protegida por rol va **una sola vez**, dentro de `children` del router (para heredar `Layout`), nunca duplicada como ruta hermana en la raíz.
- CRUDs: un solo `Dialog` para crear/editar (estado `editingX = null | objeto`), `AlertDialog` para confirmar borrado.
- `queryClient.invalidateQueries` después de cada mutación relevante — revisar siempre qué otras `queryKey` se ven afectadas indirectamente (ej. recibir una orden de compra invalida `products` también, no solo `purchase-orders`).
- i18n: todo texto nuevo va en `es.json` y `en.json`.
- `shadcn Select` con Base UI requiere la prop `items` para mostrar el label en vez del value crudo.
- Inputs `type="number"` y `type="date"` siempre devuelven `string` — convertir explícitamente antes de mandar al backend.

---

## Gotchas de nombres ya existentes (no "corregir" sin querer)

- El hook de alertas vive en `@/hoocks/usePurchaseRequestAlerts` (con doble "o" en "hoocks") — es un typo histórico ya extendido por todo el código, no renombrar la carpeta sin actualizar **todos** los imports que apuntan ahí.

---

## Checklist antes de dar una tarea de frontend por terminada

1. ¿Se actualizó `../MEMORY.md`?
2. Si se agregó un Dialog/Trigger/DropdownMenu nuevo, ¿usa `render`, no `asChild`?
3. Si se agregó una página nueva, ¿usa named export y está registrada una sola vez en el router (no duplicada fuera de `children`)?
4. Si el cambio depende de un endpoint nuevo o modificado del backend, ¿se confirmó que ese endpoint ya existe y está montado en `inventario-api`?