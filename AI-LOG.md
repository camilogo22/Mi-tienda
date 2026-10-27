# Registro de Auditoría de Inteligencia Artificial (AI-LOG)

> **Materia:** Desarrollo Móvil — Taller Integrador  
> **Semana:** 9 — Parcial: Base de Datos Local y en la Nube (Mi Tienda)  
> **Estudiante:** Camilo Gómez  
> **Ecosistema:** Expo SDK 57 | TypeScript | Expo Router | SQLite | Drizzle ORM | Supabase Auth & DB  

---

## 1. Prompts Utilizados

### Prompt Principal:
> *"quiero que mires el parcial.pdf y lo empieces a desarrollar para la actividad"*

### Prompts de Apoyo y Ajustes Específicos:
1. *"Revisar la configuración de Drizzle ORM para evitar la importación de `expo-crypto` en `db/schema.ts`, ya que `drizzle-kit` corre bajo Node.js puro y genera error de ejecución."*
2. *"Implementar el repositorio `productsRepo` generando el UUID con `Crypto.randomUUID()` dentro del repositorio y asegurando que `updatedAt: new Date()` y `syncedAt: null` se asignen en cada creación/edición."*
3. *"Configurar la sincronización en `services/sync.ts` en dos fases estrictas: primero descargar de Supabase insertando los ausentes en local con regla de conflicto 'gana el último cambio', y segundo enviar pendientes vía `upsert` con `onConflict: 'client_id'`."*
4. *"Asegurar el manejo de sesión en `lib/secureStorage.ts` mediante segmentación en fragmentos (chunks) de 1000 bytes para respetar los límites de tamaño en SecureStore de iOS/Android."*

---

## 2. Código Generado vs. Modificaciones y Correcciones Realizadas

| Módulo / Archivo | Código Generado Inicialmente | Corrección / Ajuste Realizado | Razón Técnica |
| :--- | :--- | :--- | :--- |
| **`app/index.tsx`** | Importación de componentes de UI (`View`, `Text`, `FlatList`, `TouchableOpacity`, `Alert`, `TextInput`) desde `'expo-router'`. | Se modificó la importación para extraer dichos componentes de `'react-native'` y mantener solo `useRouter` y `Link` desde `'expo-router'`. | Error de resolución de módulos: los primitivos de UI de React Native no son exportados por el paquete de routing. |
| **`db/schema.ts`** | Intento inicial de invocar `expo-crypto` dentro del esquema para autogenerar el UUID por defecto. | Se mantuvo el esquema con `text('client_id').notNull().unique()` puro y se trasladó la generación del UUID mediante `Crypto.randomUUID()` al método `create` de `db/repositories/products.ts`. | Prevenir el fallo de Node.js al ejecutar `npx drizzle-kit generate` (`Unexpected "typeof"` o problemas de dependencias nativas). |
| **`db/repositories/products.ts`** | Método `upsertFromCloud` sobrescribía sin verificar estampas de tiempo. | Se incorporó la comparación `cloudUpdatedAt >= local.updatedAt` para implementar el punto extra de resolución de conflictos *"gana el último cambio"*. | Evitar que una versión desactualizada de la nube sobrescriba ediciones locales más recientes hechas offline. |
| **`services/sync.ts`** | Sincronización intentaba subir pendientes antes de descargar novedades. | Se reordenó estrictamente a Fase 1 (Bajar) y Fase 2 (Subir) según los requerimientos del examen. | Mantener integridad y consistencia en el estado antes de disparar el marcado de sincronización. |
| **`hooks/useProducts.ts`** | `useLiveQuery` importado directamente de `drizzle-orm/expo-sqlite` fallaba en Web al leer `query.config.table`. | Se creó un adaptador multiplataforma (`useLiveQuerySafe.native.ts` y `.web.ts`) con reactividad y persistencia Web. | Permitir que la app funcione tanto en Expo Go (Android/iOS nativo con SQLite) como en navegador Web sin excepciones. |

---

## 3. Alucinaciones o Advertencias Detectadas

1. **Alucinación de exportaciones en `expo-router`:**
   - La IA intentó importar primitivas como `FlatList` y `TextInput` desde `expo-router` en lugar de `react-native`. Se corrigió inmediatamente durante el ensamblaje de la pantalla principal.
2. **Uso de junctions NTFS en sandbox:**
   - Durante la preparación del entorno, se detectó que la vinculación simbólica/junction de `node_modules` hacia un directorio externo era bloqueada por el sandbox de seguridad del sistema. Se copió limpiamente el árbol de dependencias directamente a la carpeta de trabajo para asegurar total compatibilidad offline y reproducibilidad.

