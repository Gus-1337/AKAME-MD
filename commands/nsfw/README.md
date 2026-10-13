# NSFW 🔞

Categoría NSFW de **AKAME-MD**, usando la API de Delirius:
`https://api.delirius.online/nsfw/*` y `https://api.delirius.online/reactions/*`

La API tiene **dos formas distintas** de entregar el contenido y `lib/nsfw.ts` maneja
las dos:

| Familia | Qué responde | Función |
|---|---|---|
| `/nsfw/*` | El **binario directo** | `fetchNsfwMedia` / `sendNsfwMedia` |
| `/reactions/*` | **JSON** con el enlace (`data.url`) y el archivo en `cdn.delirius.online` | `fetchReactionMedia` / `sendReactionMedia` |

En los dos casos el tipo real se decide por *magic bytes*, porque la API manda
`Content-Type` incorrecto en algunos endpoints (`/nsfw/boobs` y `/nsfw/corean` responden
`image/png` con datos JPEG).

**Dos trampas de `/reactions/*`, ya resueltas en la librería:**

1. El enlace viene en `http://` y el CDN responde **301 con una página HTML** para eso,
   así que se reescribe a `https://` antes de descargar.
2. La ruta del enlace dice si el contenido es apto para todo público o no:
   `.../reaction/sfw/...` es SFW y `.../reaction/nsfw/...` es 18+.
   La librería lo expone en `media.rating`.

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
| `.nsfwrandom` | `.horny` | Random de los 4 de `/nsfw/*` | cualquiera |

### Reactions 18+ (`/reactions/*`)

| Comando | Aliases | Endpoint |
|---|---|---|
| `.anal` | — | `/reactions/anal` |
| `.blowjob` | `.mamelada` | `/reactions/blowjob` |
| `.cum` | — | `/reactions/cum` |
| `.fuck` | `.follar` | `/reactions/fuck` |
| `.nekonsfw` | `.nekohentai` | `/reactions/nekonsfw` |
| `.pussylick` | — | `/reactions/pussylick` |
| `.solo` | `.solonsfw` | `/reactions/solo` |
| `.yuri` | `.yurinsfw` | `/reactions/yuri` |

Son las **8 reactions que el CDN marca como 18+** (su enlace dice
`/reaction/nsfw/...`). El catálogo completo está en `REACTION_CATALOG` de
`lib/nsfw.ts`, con el rating de cada una; `NSFW_REACTION_ENDPOINTS` filtra las 18+ y
`randomNsfwReaction()` elige una al azar.

### Reactions aptas para todo público

`.poke` (aliases `.poking`, `.codear`) es la única con comando propio. Su enlace dice
`/reaction/sfw/poke/`, o sea que el contenido **no** es 18+, pero vive en esta categoría
a pedido, así que la puerta de `.nsfw on` también lo cubre.

Quedan 32 reactions SFW sin comando (en `REACTION_CATALOG` por si quieres agregarlas):
`angry, bite, blush, bonk, bully, confy, cringe, cry, cuddle, dance, eevee, fluff,
handhold, happy, highfive, hug, kick, kill, kiss, lay, lick, nekosfw, nom, pat, pout,
slap, smile, smug, tail, tickle, wink, yeet`.

> Nota: el nombre `.nsfw` a secas es el interruptor de admin, por eso el de contenido
> aleatorio es `.nsfwrandom`.

## Agregar un comando nuevo

Si Delirius agrega otro endpoint, basta con crear un archivo acá:

De `/nsfw/*` (binario directo):

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

De `/reactions/*` (JSON con enlace), igual pero con la otra función:

```ts
import { sendReactionMedia } from '#nsfw';

export default {
    command: ['nuevareaccion'],
    description: 'Descripción para el menú',
    category: 'nsfw',
    nsfw: true,
    group: false,

    run: async (ctx: any) => sendReactionMedia(ctx, 'NOMBRE_DE_LA_REACTION', 'Etiqueta')
};
```

Y agrega el nombre a `NSFW_ENDPOINTS` si quieres que entre en el random de `.nsfwrandom`,
o a `REACTION_ENDPOINTS` si es una reaction (ese catálogo tiene 30, solo `.poke` tiene
comando propio por ahora).

**Ojo con los nombres de archivo:** `index.ts` registra los plugins con
`path.basename(fullPath)`, sin la carpeta. Dos archivos con el mismo nombre en carpetas
distintas se pisan entre sí — por eso el interruptor es `commands/admin/nsfw.ts` y el de
contenido es `commands/nsfw/nsfwrandom.ts`.

## Archivos

- `lib/nsfw.ts` → descarga, reintentos, detección de tipo, guardia de 15 MB
- `commands/admin/nsfw.ts` → interruptor `.nsfw on` / `.nsfw off`
- `handler.ts` → puerta que bloquea la categoría en grupos con NSFW apagado
