# Parcial: Mi Tienda — App móvil con base de datos local y en la nube

App de inventario offline-first para una tienda de barrio (Doña Rosa en Riohacha). Permite al tendero iniciar sesión, registrar productos aunque no tenga señal ni internet (fuente de verdad SQLite con Drizzle ORM) y respaldar / sincronizar los datos en la nube (Supabase) cuando regrese la conexión.

---

## 1. Información del Estudiante

- **Nombre completo:** Camilo Gómez
- **Código estudiantil:** *(Ingresar tu código aquí)*
- **Materia:** Desarrollo Móvil / Taller Integrador
- **Semana / Evaluación:** Parcial Semana 9 — SQLite Offline-First + Supabase Sync

---

## 2. Cómo ejecutar el proyecto

### Prerrequisitos
- Node.js (v18+)
- Expo CLI / Expo Go instalado en tu dispositivo móvil o emulador

### Pasos de instalación y ejecución

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/camilogo22/parcial-mi-tienda-gomez.git
   cd parcial-mi-tienda-gomez
   ```

2. **Configurar variables de entorno (`.env`):**
   Crea un archivo `.env` en la raíz del proyecto tomando como base `.env.example`:
   ```bash
   cp .env.example .env
   ```
   Añade tus credenciales públicas de Supabase:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=tu-anon-publishable-key
   ```
   > ⚠️ **Nota de seguridad:** El archivo `.env` está en `.gitignore` y **nunca** debe ser subido al repositorio.

3. **Ejecutar el esquema SQL en Supabase:**
   En el panel de tu proyecto de Supabase, ve a **SQL Editor** y ejecuta el script de `supabase/schema.sql` (creación de tabla `products` y políticas RLS).
   > Además, asegúrate de desactivar la opción **"Confirm email"** en *Authentication > Providers > Email* en Supabase para permitir inicio de sesión inmediato al registrarse.

4. **Instalar dependencias:**
   ```bash
   npm install
   ```

5. **Iniciar la aplicación:**
   ```bash
   npx expo start
   ```
   Escanea el código QR con la app Expo Go en tu teléfono (Android o iOS) o presiona `a` para emulador Android / `i` para simulador iOS.

---

## 3. Capturas de Pantalla

A continuación se presentan las 7 evidencias requeridas en el parcial:

### 01. Pantalla de Inicio de Sesión
![Login](capturas/01-login.png)

### 02. Pantalla de Registro (con validación visible)
![Registro](capturas/02-registro.png)

### 03. Pantalla Principal (Inventario, totales e indicadores)
![Principal](capturas/03-principal.png)

### 04. Formulario de Edición de Producto
![Formulario](capturas/04-formulario.png)

### 05. Modo Sin Conexión (Producto creado en modo avión marcado como pendiente)
![Sin Conexión](capturas/05-sin-conexion.png)

### 06. Pantalla Principal Sincronizada (Resultado de subida y descarga)
![Sincronizado](capturas/06-sincronizado.png)

### 07. Panel de Supabase (Tabla `products` con registros y RLS)
![Supabase](capturas/07-supabase.png)

---

## 4. Estado del Proyecto: Qué quedó funcionando y qué faltó

### ✅ Implementado y 100% Funcional:
1. **Autenticación completa con Supabase Auth:**
   - Registro con validación de correo y contraseñas (mínimo 6 caracteres y coincidencia).
   - Inicio de sesión con persistencia segura en `SecureStore` (adaptador por fragmentos `chunked` para evitar desbordamiento del límite de ~2048 bytes).
   - Cierre de sesión y protección estricta de rutas con `Stack.Protected`.
2. **Base de Datos Local Offline-First (SQLite + Drizzle ORM):**
   - Tabla `products` con columnas `id`, `clientId` (UUID único), `name`, `quantity`, `price`, `updatedAt` y `syncedAt`.
   - Migraciones generadas con `drizzle-kit` aplicadas automáticamente al arrancar con `useMigrations`.
   - Repositorio desacoplado `db/repositories/products.ts` y hook reactivo `useProducts` con `useLiveQuery`.
   - CRUD completo: creación, edición y eliminación (con confirmación de seguridad).
   - Cálculos reactivos de total de unidades, valor total monetario del inventario y contador de pendientes.
   - Funcionamiento garantizado 100% en modo avión.
3. **Sincronización Bidireccional (Cloud Sync con Supabase):**
   - Servicio `services/sync.ts` con flujo en dos pasos:
     - **Bajar:** descarga productos del usuario desde Supabase e inserta los que no existan localmente.
     - **Subir:** envía los productos pendientes mediante `upsert` por `client_id` y actualiza `syncedAt` local con el `updatedAt` enviado.
   - Mensaje de resultado en tiempo real en la pantalla principal (`X subidos, Y bajados`) o reporte amigable de desconexión.
4. **Puntos Extra Implementados:**
   - Búsqueda en tiempo real por nombre de producto en la pantalla principal.
   - Regla de resolución de conflictos *"gana el último cambio"* al bajar registros existentes desde la nube.
   - Validación completa en formulario (nombre obligatorio, cantidad y precio enteros $\ge 0$).

### 📌 Notas adicionales:
- No hubo componentes faltantes respecto a la especificación técnica obligatoria.
