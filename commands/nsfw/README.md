# NSFW 🔞

Categoría NSFW de **AKAME-MD**, usando la API de Delirius: `https://api.delirius.online/nsfw/*`

> La API entrega el **binario directo** (no un JSON con la URL), así que `lib/nsfw.ts`
> lo descarga y lo manda como adjunto. El tipo real se decide por *magic bytes* porque
> la API manda `Content-Type` incorrecto en algunos endpoints (`/nsfw/boobs` y
> `/nsfw/corean` responden `image/png` con datos JPEG).

## Comandos

| Comando | Aliases | Qué manda | Endpoint |
|---|---|---|---|
| `.nsfwtiktok` | `.nstiktok`, `.nsfwvideo` | Video mp4 | `/nsfw/tiktok` |
| `.girls` | `.chicas`, `.nsfwgirls` | Imagen | `/nsfw/girls` |
| `.boobs` | `.tetas`, `.nsfwboobs` | Imagen | `/nsfw/boobs` |
| `.corean` | `.coreanas`, `.nsfwcorean` | Imagen | `/nsfw/corean` |
| `.nsfw` | `.nsfwrandom`, `.horny` | Random de los 4 | cualquiera |

## Activar la categoría en un grupo

La categoría viene **apagada por defecto**. Un administrador (con el bot de admin) hace:

```
.nsfwon on     → activa
.nsfwon off    → desactiva
.nsfwon        → muestra el estado
```

El estado se guarda en la columna `chats.nsfw` de `database/database.db` (sqlite).

Mientras esté apagado, `handler.ts` bloquea cualquier comando con `nsfw: true` dentro
del grupo. El owner del bot pasa siempre, y en chat privado no hay puerta.

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
entre en el random de `.nsfw`.

## Archivos

- `lib/nsfw.ts` → descarga, reintentos, detección de tipo, guardia de 15 MB
- `commands/admin/nsfwon.ts` → toggle de administrador
- `handler.ts` → puerta que bloquea la categoría en grupos con NSFW apagado
