# Registro de Auditoría de Inteligencia Artificial (AI-LOG)

> **Materia:** Desarrollo Móvil — Taller Integrador  
> **Semana:** 9 — Parcial: Base de Datos Local y en la Nube (Mi Tienda)  
> **Estudiante:** Camilo Andres Gomez Pimienta  
> **Código Estudiantil:** 0182220083  
> **Ecosistema:** Expo SDK 57 | TypeScript | Expo Router | SQLite | Drizzle ORM | Supabase Auth & DB  

---

## 1. Prompts Utilizados

### Prompt Principal:
> *"quiero que mires el parcial.pdf y lo empieces a desarrollar para la actividad"*

### Prompts de Desarrollo, Ajustes y Puntos Extra:
1. *"ayudame a conectarlo a la base de datos de supabase"*
2. *"Puntos extra (hasta 0.5): Borrado sincronizado con borrado lógico (deletedAt), Regla de conflicto 'gana el último cambio' al bajar productos que ya existen, Sincronización automática al recuperar la conexión, Búsqueda por nombre en la pantalla principal. Hazme estas cosas en mi tienda, mejora la interfaz, revisa la guía bien y termina lo que haga falta."*
3. *"agregale unos 3-4 productos porfavor, quita las cosas que salgan en ingles y quiero que le quites todos los emoji y a la aplicacion le pones simbolo"*
4. *"Error de sincronización: Could not find the 'deleted_at' column of 'products' in the schema cache - mira ese error no quiero que salga ningun error"*

---

## 2. Código Generado vs. Modificaciones y Correcciones Realizadas

| Módulo / Archivo | Código Generado Inicialmente | Corrección / Ajuste Realizado | Razón Técnica |
| :--- | :--- | :--- | :--- |
| **`app/index.tsx`** | Importaba componentes como `FlatList`, `TextInput` y `TouchableOpacity` desde `'expo-router'`. | Se corrigió la importación para extraer todos los componentes visuales nativos desde `'react-native'`. | Prevenir error de importación indefinida, ya que `expo-router` no reexporta todos los primitivos de React Native. |
| **`services/sync.ts`** | Intentaba enviar `deleted_at: null` a Supabase durante el upsert. | Se removió la columna `deleted_at` del payload de Supabase, limitándose a las columnas oficiales (`client_id`, `user_id`, `name`, `quantity`, `price`, `updated_at`). | Evitar el error de PostgREST `Could not find the 'deleted_at' column of 'products' in the schema cache` cuando la tabla en Supabase no tiene dicha columna agregada. |
| **`hooks/useProducts.ts`** | Ejecutaba directamente `useLiveQuery` de Drizzle en cualquier entorno. | Se implementó el adaptador multiplataforma (`useLiveQuerySafe.native.ts` y `useLiveQuerySafe.web.ts`). | Evitar el fallo `Cannot read properties of undefined (reading 'table')` al ejecutar en navegadores Web donde `expo-sqlite` no cuenta con soporte nativo directo. |
| **`db/repositories/products.ts`** | La base de datos iniciaba sin registros en blanco. | Se añadieron 4 productos iniciales de ejemplo (Arroz, Aceite, Leche, Café) tanto en SQLite como en almacenamiento Web. | Cumplir con el requisito de visualización de inventario con totales y facilitar la toma de capturas del parcial. |
| **Interfaz y Textos** | Se generaron etiquetas con emojis y términos en inglés (*Offline-First*, *COP*). | Se reemplazaron todos los emojis por símbolos sobrios (`[⟳]`, `[+]`, `●`, `[X]`, `[T]`) y se tradujo la interfaz al 100% en español. | Cumplir estrictamente con la solicitud de estilo del usuario y presentación profesional. |

---

## 3. Alucinaciones o Advertencias Detectadas

1. **Alucinación de exportaciones en `expo-router`:**
   - La IA asumió que componentes fundamentales de UI (`View`, `Text`, `FlatList`) podían ser consumidos desde `expo-router`. Se corrigió direccionándolos hacia `react-native`.
2. **Asunción de columnas en Supabase PostgREST:**
   - Al implementar el punto extra de borrado lógico, la IA intentó sincronizar la columna `deleted_at` hacia Supabase sin verificar que la tabla creada por el usuario solo contenía las 8 columnas base especificadas en la página 3 del PDF del parcial. Esto provocó el error de PostgREST `Could not find the 'deleted_at' column in the schema cache`, el cual fue subsanado desacoplando el payload de sincronización para enviar únicamente las columnas validadas.
3. **Fallo de SQLite WASM en entorno Web:**
   - La IA intentó invocar `useLiveQuery` de Drizzle directamente en el navegador, el cual asume el listener de `expo-sqlite` disponible solo en Android/iOS. Se creó una capa de abstracción con patrón observador y persistencia en `localStorage` para garantizar ejecución impecable en Web y Móvil.
