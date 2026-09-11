# Inventario Frontend

Interfaz web para el sistema de gestión de inventario. Consume la API REST de `inventario-api`.

## Stack

- **Framework:** React + Vite (JavaScript)
- **Estilos:** TailwindCSS v4 + shadcn/ui (Base UI, preset Vega)
- **Routing:** react-router-dom
- **Llamadas a la API:** axios + @tanstack/react-query
- **Estado de autenticación:** Context API (nativo)
- **Iconos:** lucide-react

## Requisitos previos

- Node.js (LTS)
- El backend (`inventario-api`) corriendo en `http://localhost:3000`, con CORS habilitado para `http://localhost:5173`

## Instalación y arranque

```bash
npm install
npm run dev
```

La app queda disponible en `http://localhost:5173`.

## Estructura de carpetas

```
src/
├── api/              → cliente axios (client.js) + funciones por dominio (auth, categories, products, movements, reports)
├── context/          → AuthContext (token, usuario, login/logout, persistencia en localStorage)
├── components/
│   ├── ui/             → componentes de shadcn/ui
│   └── layout/         → Sidebar, Topbar, Layout (con soporte responsivo vía Sheet en móvil)
├── pages/            → Login, Register, Dashboard, Categories, Products, Movements, Reports
├── routes/           → AppRoutes (react-router-dom) y ProtectedRoute
```

## Diseño

Dashboard oscuro (fondo `#0B0A14`, cards `#151325`, acento morado `#8B7CF6`), con sidebar fijo en desktop que se convierte en panel deslizante (`Sheet`) en móvil/tablet. Breakpoints de Tailwind: 1 columna de cards en móvil, 2 en tablet, 3–4 en desktop.

## Autenticación

- El login guarda el JWT y los datos del usuario en `localStorage`, disponibles vía el hook `useAuth()`.
- Todas las llamadas hechas con el cliente `api` (`src/api/client.js`) incluyen el token automáticamente mediante un interceptor de axios.
- Las rutas dentro del `Layout` están protegidas por `ProtectedRoute`: sin token válido, redirige a `/login`.
- El registro público siempre crea usuarios `EMPLOYEE`; no devuelve token, así que redirige a `/login` tras crear la cuenta.

## Notas de compatibilidad (shadcn con Base UI)

Esta versión de la CLI de shadcn usa **Base UI** en vez de Radix como librería de primitivos, lo que cambia algunos patrones respecto a tutoriales/documentación más antiguos:

- **Componer un trigger con un componente propio:** usar la prop `render` en vez de `asChild` para evitar `<button>` anidados (ej. `<DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>`).
- **`DropdownMenuLabel` / `DropdownMenuItem`** deben ir envueltos en `<DropdownMenuGroup>`, o lanzan `MenuGroupContext is missing`.
- **`Select`** necesita la prop `items={[{ value, label }, ...]}` en el componente `<Select>` para que `SelectValue` muestre el texto legible en vez del `value` crudo.

## Pendientes

- Formularios con validación en el cliente (actualmente solo se valida en el backend)
- Manejo de expiración de token (detectar 401 y redirigir a login automáticamente)
- Gráficos visuales en Reportes/Dashboard (actualmente son tablas y números, sin charts)
- Deploy

## 7. Frontend (inventario-frontend/)

Proyecto separado, al mismo nivel que el backend (`inventario-api/`).

### Stack

| Capa | Tecnología |
|---|---|
| Framework | React + Vite (JavaScript, sin TS) |
| Estilos | TailwindCSS + shadcn/ui |
| Routing | react-router-dom |
| Llamadas a la API | axios + @tanstack/react-query |
| Estado global (auth) | Context API (nativo) |
| Iconos | Tabler Icons |

### Dirección visual (aprobada)

Dashboard oscuro estilo "admin panel", inspirado en una referencia con sidebar fijo + cards de métricas + gráficos + tabla. Mockup de referencia: `mockup-dashboard.html`.

- **Paleta:** fondo casi negro con tinte morado (`#0B0A14`), cards (`#151325`) con borde sutil (`#221F3B`, sin sombras), acento morado (`#8B7CF6`).
- **Layout:** sidebar fijo en desktop (logo, nav: Dashboard/Productos/Categorías/Movimientos/Reportes, perfil de usuario abajo) + topbar (buscador, notificaciones, avatar) + contenido principal.
- **Responsividad (mobile-first, breakpoints de Tailwind):**
  - Móvil (< 768px): sidebar oculto por defecto, se despliega como overlay con botón de menú hamburguesa. Cards en 1 columna. Tabla con scroll horizontal.
  - Tablet (768–1024px): cards en 2 columnas, gráficos apilados.
  - Desktop (> 1024px): layout completo, sidebar fijo, cards en 4 columnas, gráficos lado a lado.
- **Contenido del dashboard:** métricas (total productos, stock bajo, valor de inventario, movimientos hoy), gráfico de barras de movimientos (entradas vs salidas), dona de stock por categoría, tabla de productos con stock bajo (badges Crítico/Bajo/Normal según `minStock`).

### Progreso

- [x] Definición de stack y dirección visual (mockup aprobado)
- [x] Inicialización del proyecto (Vite + React + JS)
- [x] Tailwind + shadcn/ui configurados (preset Vega, paleta oscura/morada personalizada)
- [x] Estructura de carpetas
- [x] Routing base (react-router-dom) + rutas protegidas (ProtectedRoute)
- [x] Context de autenticación (login, token, usuario, persistencia en localStorage)
- [x] Cliente axios (interceptor de token) + React Query configurados
- [x] Layout principal (sidebar + topbar responsivo, Sheet para móvil)
- [x] Pantalla de login y registro, conectadas al backend real
- [x] Botón de logout en el Topbar (DropdownMenu con datos del usuario)
- [x] Dashboard con métricas reales (total productos, stock bajo, valor de inventario) vía useQuery
- [x] CRUD de categorías (UI) — tabla + Dialog crear/editar + AlertDialog confirmación de borrado
- [x] CRUD de productos (UI) — con selector de categoría (usando prop `items` de Select), stock no editable en update
- [x] Registro de movimientos (UI) — formulario IN/OUT/ADJUSTMENT, invalida products y reports al crear
- [x] Reportes (UI) — valor de inventario, stock bajo, movimientos filtrados por rango de fechas

### Notas técnicas del frontend

- **shadcn CLI nueva versión (con "Base UI" y presets con nombre — Vega, Nova, Mira, etc.):** requiere `jsconfig.json` con alias `@/*` (proyecto JS, no TS) + `resolve.alias` en `vite.config.js`. En ESM, `__dirname` no existe — reconstruir con `path.dirname(fileURLToPath(import.meta.url))`.
- **Tailwind v4 + shadcn:** las variables de color (`--background`, `--card`, etc.) deben ir dentro de un bloque `@theme inline` (que las mapea a `--color-*`) para que clases como `bg-background` funcionen. Sin ese bloque, los estilos no se aplican aunque las variables existan.
- **`useState` con inicialización perezosa** (`useState(() => localStorage.getItem(...))`) para leer `localStorage` al iniciar el AuthContext, evitando el antipatrón de `setState` síncrono dentro de un `useEffect`.
- **CORS:** el paquete `cors` se instaló en el backend desde el principio pero nunca se activó — hay que agregar `app.use(cors({ origin: "http://localhost:5173" }))` en `app.ts`, antes de los routers, para que el navegador permita peticiones cross-origin del frontend (puerto 5173) al backend (puerto 3000).
- **shadcn con Base UI (no Radix) — patrón `render` en vez de `asChild`:** al componer un trigger con un componente propio (ej. `Button` dentro de `DropdownMenuTrigger`), `asChild` puede duplicar el `<button>` (uno propio del primitivo + el de tu componente), causando `<button>` anidado (HTML inválido) y warnings de `nativeButton`. La forma correcta en Base UI es `<DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>{contenido}</DropdownMenuTrigger>` — se le pasa el componente como prop `render` (la plantilla del elemento final) y el contenido real va como children, sin anidar. Aplica el mismo criterio a otros primitivos de este stack (`Sheet`, `Select`, `Popover`, etc.) si aparece un error similar.
- **`DropdownMenuLabel`/`DropdownMenuItem` deben ir dentro de `DropdownMenuGroup`** en esta versión — sin ese envoltorio, lanza `MenuGroupContext is missing`.
- **`ProtectedRoute`:** componente que revisa `token` del AuthContext y redirige con `<Navigate to="/login" replace />` si no existe. Ojo al probar: un token de una sesión anterior persiste en `localStorage` entre recargas — usar `localStorage.clear()` en la consola del navegador para probar el caso "sin sesión" de verdad.
- **`useQuery` vs `useMutation`:** `useQuery` se dispara automáticamente al montar el componente (para leer datos: dashboard, listados), `useMutation` se dispara manualmente con `.mutate()` (para crear/actualizar/eliminar: login, register, formularios). Cada `useQuery` necesita una `queryKey` única para el cache de React Query.
- **`inventory-value` es `stock × price` sumado, no solo la suma de precios** — con un solo producto de stock alto, el total puede parecer "raro" a primera vista si no se recuerda esa fórmula.
- **Register no devuelve token** (a diferencia de Login) — tras un registro exitoso, se redirige a `/login` para que el usuario inicie sesión con sus nuevas credenciales.
- **`queryClient.invalidateQueries({ queryKey: [...] })`**: tras cualquier `useMutation` que cree/edite/borre datos, hay que invalidar manualmente el/los `queryKey` afectados — React Query no detecta solo que los datos cambiaron. Un mismo mutation puede necesitar invalidar varias keys (ej. crear un movimiento afecta `["movements"]`, `["products"]` y `["reports"]` a la vez, porque cambia el stock).
- **Un solo Dialog para crear y editar**: se controla con un estado (`editingX = null` → creando; con objeto → editando), evitando duplicar el formulario. El `open` de `Dialog`/`AlertDialog` se maneja con `useState` propio en vez de `DialogTrigger`/`asChild`, para evitar los problemas de anidación de botones de Base UI.
- **Conversión de tipos de inputs**: los `<Input type="number">` de HTML siempre devuelven `string` — hay que convertir explícitamente con `Number(...)` antes de mandar al backend, o Zod rechaza la petición.
- **shadcn `Select` con Base UI requiere la prop `items`:** sin pasar `items={[{ value, label }, ...]}` directamente al componente `<Select>`, `SelectValue` muestra el `value` crudo (ej. un UUID) en vez del texto legible (`label`), aunque los `SelectItem` internos estén bien escritos. Es un requisito adicional de esta variante Base UI que no existía en la versión Radix clásica de shadcn.
- **`queryKey` con parámetros dinámicos** (ej. `["reports", "movements", from, to]`): incluir los filtros dentro de la key hace que React Query trate cada combinación de filtros como una consulta distinta y vuelva a pedir datos cuando cambian — si se omiten de la key, el cache no se refresca al cambiar el filtro.

---

## 8. Cómo seguimos trabajando (metodología)

Para cada nueva funcionalidad:
1. Se explica el concepto/flujo antes de tocar código.
2. Se identifican los pasos en texto plano (en español, sin sintaxis) antes de programar.
3. Se escribe primero el **Service** (lógica pura), después el **Controller**, después las **Routes**.
4. Se dan pistas de qué método/función se necesita (sin el código completo) para que el usuario lo escriba.
5. Se revisa lo escrito, se corrige, y se explica el porqué de cada corrección.
6. Se prueba el flujo completo antes de pasar al siguiente módulo.

Objetivo: que el usuario entienda cada pieza para depender cada vez menos de la IA a futuro.