# Parcial: Mi Tienda — App móvil con base de datos local y en la nube

---

## 1. Datos del Estudiante
**Nombre completo:** Camilo Andres Gomez Pimienta  
**Código estudiantil:** 0182220083  

---

## 2. Cómo ejecutar el proyecto

1. **Crear archivo `.env`:**
   Copia el archivo de ejemplo o crea uno nuevo en la raíz con tus claves de Supabase:
   ```bash
   cp .env.example .env
   ```
   Contenido de `.env`:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://juogadbxarrjlzvqnhnx.supabase.co
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_fn-9nkUbxengu61g4op2gg_EEj1fjWn
   ```
   *(El archivo `.env` está protegido en `.gitignore` y no se sube a GitHub).*

2. **Ejecutar el SQL en Supabase:**
   En el panel de tu proyecto de Supabase, entra al **SQL Editor** y ejecuta el script de `supabase/schema.sql`:
   ```sql
   create table if not exists public.products (
     id bigint generated always as identity primary key,
     user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
     client_id uuid not null unique,
     name text not null,
     quantity integer not null check (quantity >= 0),
     price integer not null check (price >= 0),
     updated_at timestamptz not null,
     created_at timestamptz not null default now()
   );

   alter table public.products enable row level security;

   create policy "ver los míos" on public.products
     for select to authenticated using ((select auth.uid()) = user_id);

   create policy "crear los míos" on public.products
     for insert to authenticated with check ((select auth.uid()) = user_id);

   create policy "editar los míos" on public.products
     for update to authenticated
     using ((select auth.uid()) = user_id)
     with check ((select auth.uid()) = user_id);

   create policy "borrar los míos" on public.products
     for delete to authenticated using ((select auth.uid()) = user_id);
   ```
   *Nota:* En *Authentication > Providers > Email*, desactiva la opción **"Confirm email"** para iniciar sesión inmediatamente sin confirmación por correo.

3. **Instalar dependencias:**
   ```bash
   npm install
   ```

4. **Iniciar la aplicación:**
   ```bash
   npx expo start
   ```
   Escanea el código QR con **Expo Go** en tu dispositivo físico o presiona `w` para probar en el navegador web.

---

## 3. Capturas de Pantalla

A continuación se presentan las 7 capturas requeridas en la evaluación:

### 01. Pantalla de inicio de sesión
![Login](capturas/01-login.png)

### 02. Pantalla de registro con validación visible
![Registro](capturas/02-registro.png)

### 03. Pantalla principal con productos, totales e indicadores
![Principal](capturas/03-principal.png)

### 04. Formulario editando un producto existente
![Formulario](capturas/04-formulario.png)

### 05. Producto creado en modo avión (pendiente)
![Sin Conexión](capturas/05-sin-conexion.png)

### 06. Pantalla principal después de sincronizar con resultado
![Sincronizado](capturas/06-sincronizado.png)

### 07. Panel de Supabase con la tabla products
![Supabase](capturas/07-supabase.png)

---

## 4. Qué quedó funcionando y qué no, si algo faltó

### Lo que quedó 100% funcionando:
- **Autenticación (25%):**
  - Registro con validación de correo, longitud de contraseña (mínimo 6 caracteres) y coincidencia.
  - Inicio de sesión y cierre de sesión seguro con Supabase Auth.
  - Persistencia de sesión en `SecureStore` mediante fragmentos (*chunks* de 1000 bytes) que sobrevive al reinicio de la app.
  - Protección de rutas con `Stack.Protected`.
- **Base de datos local (25%):**
  - Esquema SQLite con Drizzle ORM (`id`, `clientId`, `name`, `quantity`, `price`, `updatedAt`, `syncedAt`).
  - Migraciones generadas con `drizzle-kit` y aplicadas con `useMigrations`.
  - Repositorio desacoplado (`db/repositories/products.ts`) y hook reactivo (`useProducts`).
  - CRUD completo (creación, edición, eliminación con confirmación).
  - Cálculo de totales de unidades y valor total del inventario en pesos.
  - Funcionamiento completo en modo avión sin conexión a internet.
  - 4 productos de ejemplo cargados automáticamente.
- **Nube y sincronización (25%):**
  - Políticas de seguridad Row Level Security (RLS) en Supabase para aislamiento por usuario.
  - Sincronización en dos pasos: primero descarga novedades de la nube e inserta las ausentes, luego sube pendientes vía `upsert`.
  - Indicador de estado por producto (`● Pendiente` / `● En la nube`).
  - Mensaje descriptivo con el resultado (`X subidos, Y bajados`).
- **Pantallas y validaciones (10%):**
  - 4 pantallas obligatorias (`login.tsx`, `registro.tsx`, `index.tsx`, `producto.tsx`).
  - Validación de campos obligatorios, enteros mayores o iguales a 0 en precio y cantidad.
  - Confirmación de seguridad antes de eliminar productos.
- **Puntos Extra Implementados (+0.5):**
  - Búsqueda en tiempo real por nombre de producto en la pantalla principal.
  - Regla de conflicto "gana el último cambio" (`cloudUpdatedAt >= local.updatedAt`).
  - Sincronización automática al recuperar la conexión (`useAutoSync`).
  - Borrado seguro y sincronizable.
- **Compatibilidad e Interfaz:**
  - Cero emojis en la interfaz (reemplazados por símbolos limpios como `[⟳]`, `[+]`, `●`, `[X]`).
  - Interfaz 100% en español.
  - Compatibilidad multiplataforma garantizada (Android, iOS y Web).

### ¿Qué faltó?:
- Todo lo exigido en la guía y los criterios de evaluación fue implementado y probado sin componentes faltantes.
