# Página de vinculación en Render

Esta carpeta se despliega en **Render** (gratis). Sirve la página de vinculación y reenvía todo al bot, que corre en HiddenCloud.

## Pasos en Render

1. Entra a render.com y crea un **New → Web Service**.
2. Conecta el repo `Gus-1337/AKAME-MD`.
3. Configura:
   - **Root Directory:** `web-vinculacion`
   - **Runtime:** Node
   - **Build Command:** `npm install` (o déjalo vacío)
   - **Start Command:** `npm start`
   - **Instance Type:** Free
4. En **Environment**, agrega la variable:
   - `SECRETO` = una clave larga que tú inventes (solo tú y el bot la conocen).
5. Crea el servicio. Render te da un link fijo como `https://tu-app.onrender.com`.

## En HiddenCloud (el bot)

Agrega estas variables al `.env` del servidor (no las subas a GitHub):

- `VINCULAR_REGISTRO_URL` = `https://tu-app.onrender.com/api/registrar`
- `VINCULAR_SECRETO` = la misma clave que pusiste en `SECRETO`

Luego reinicia el servidor. El bot avisa su link a Render automáticamente y lo renueva cada 3 minutos.

## Notas

- La página en Render se duerme si nadie la usa, y tarda unos segundos en despertar. Eso no afecta al bot.
- Si el bot se apaga, la página muestra "El bot está despertando" hasta que vuelva.
