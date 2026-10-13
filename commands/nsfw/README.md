# NSFW 🔞

Categoría NSFW de **AKAME-MD**, usando la API de Delirius: `https://api.delirius.online/nsfw/*`

> La API entrega el **binario directo** (no un JSON con la URL), así que `lib/nsfw.ts`
> lo descarga y lo manda como adjunto. El tipo real se decide por *magic bytes* porque
> la API manda `Content-Type` incorrecto en algunos endpoints (`/nsfw/boobs` y
> `/nsfw/corean` responden `image/png` con datos JPEG).

## Activar / desactivar la categoría

La categoría viene **apagada por defecto**. El interruptor es un comando de **admin**
(`commands/admin/nsfw.ts`), así que solo lo puede usar un administrador y con el bot de admin:

```
.nsfw on     → activa todos los comandos NSFW del grupo
.nsfw off    → los desactiva
.nsfw        → muestra el estado y la lista
```

También responden `.nsfwon on` / `.nsfwoff off` como alias.

El estado se guarda en la columna `chats.nsfw` de `database/database.db` (sqlite).
Mientras esté apagado, `handler.ts` bloquea **todos** los comandos marcados con
`nsfw: true` dentro del grupo. El owner del bot pasa siempre y en chat privado no hay puerta.

## Comandos de contenido

| Comando | Aliases | Qué manda | Endpoint |
|---|---|---|---|
| `.nsfwtiktok` | `.nstiktok`, `.nsfwvideo` | Video mp4 | `/nsfw/tiktok` |
| `.girls` | `.chicas`, `.nsfwgirls` | Imagen | `/nsfw/girls` |
| `.boobs` | `.tetas`, `.nsfwboobs` | Imagen | `/nsfw/boobs` |
| `.corean` | `.coreanas`, `.nsfwcorean` | Imagen | `/nsfw/corean` |
| `.nsfwrandom` | `.horny` | Random de los 4 | cualquiera |

> Nota: el nombre `.nsfw` a secas es el interruptor de admin, por eso el de contenido
> aleatorio es `.nsfwrandom`.

## Agregar un comando nuevo

Si Delirius agrega otro endpoint, basta con crear un archivo acá:

```ts
import { sendNsfwMedia } from '#nsfw';

export default {
    command: ['nuevocomando'],
    description: 'Descripción para el menú',
    category: 'nsfw',
    nsfw: true,
    group: false,

    run: async (ctx: any) => sendNsfwMedia(ctx, 'NOMBRE_DEL_ENDPOINT', 'Etiqueta 🔞')
};
```

Y agrega el nombre del endpoint a `NSFW_ENDPOINTS` en `lib/nsfw.ts` si quieres que
entre en el random de `.nsfwrandom`.

**Ojo con los nombres de archivo:** `index.ts` registra los plugins con
`path.basename(fullPath)`, sin la carpeta. Dos archivos con el mismo nombre en carpetas
distintas se pisan entre sí — por eso el interruptor es `commands/admin/nsfw.ts` y el de
contenido es `commands/nsfw/nsfwrandom.ts`.

## Archivos

- `lib/nsfw.ts` → descarga, reintentos, detección de tipo, guardia de 15 MB
- `commands/admin/nsfw.ts` → interruptor `.nsfw on` / `.nsfw off`
- `handler.ts` → puerta que bloquea la categoría en grupos con NSFW apagado
