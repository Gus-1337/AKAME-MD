# Página de vinculación de subbots

Página para que alguien vincule su subbot con un código de 8 caracteres, sin entrar al chat.
Vive en **Render** (servicio web gratis) y el bot principal la atiende desde HiddenCloud.

## Cómo funciona

1. La persona escribe su número en la página y pide el código.
2. Render guarda el pedido.
3. El bot principal pregunta a Render cada 3 segundos si hay pedidos nuevos (`lib/vincular-puente.ts`).
4. El bot crea el subbot, genera el código y se lo devuelve a Render.
5. La página muestra el código y se actualiza sola hasta que el subbot se conecta.

Como el bot consulta a Render todo el tiempo, Render no se duerme y no hace falta túnel.
El bot sale hacia Render, así que el link de la página es fijo.

## Configurar Render (una vez)

1. En Render: **New → Web Service** y conecta el repo `Gus-1337/AKAME-MD`.
2. **Root Directory:** `web-vinculacion`
3. **Runtime:** Node
4. **Build Command:** `echo listo`
5. **Start Command:** `node server.mjs`
6. **Instance type:** Free
7. En **Environment** agrega:
   - `VINCULAR_SECRETO` = una clave larga que tú inventes (guárdala)

## Configurar el bot (HiddenCloud, en `.env`)

- `VINCULAR_RENDER_URL` = link del servicio de Render, ej. `https://akame-vincular.onrender.com`
- `VINCULAR_SECRETO` = la **misma** clave que pusiste en Render

Si falta alguna de las dos, el puente no arranca y el bot lo dice en la consola.
Solo arranca en el bot principal; los subbots no lo usan.

## Rutas

| Ruta | Quién la usa | Qué hace |
|---|---|---|
| `GET /` | Navegador | Página de vinculación |
| `POST /api/vincular` | Página | Crea un pedido `{ numero }` |
| `GET /api/estado/:id` | Página | Estado del pedido (`pendiente`, `codigo`, `conectado`, `caido`, `error`) |
| `GET /api/bot/pendientes` | Bot (con `x-secreto`) | Pedidos sin atender |
| `POST /api/bot/respuesta` | Bot (con `x-secreto`) | Devuelve el código o el error |
| `POST /api/bot/estado` | Bot (con `x-secreto`) | Avisa `conectado`, `caido` o `expirado` |

Reglas: 1 pedido por número cada 60 s. Los pedidos se borran a los 15 min.
