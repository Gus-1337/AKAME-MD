<div align="center">

<img src="img/flower.webp" alt="🌸" width="88">

<img src="img/banner-anim.webp" alt="AKAME-MD" width="100%">

# ⚔️ AKAME-MD

**Un bot de WhatsApp con estilo, potencia y personalidad.**

[![Node](https://img.shields.io/badge/Node-%3E%3D22.6.0-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Baileys](https://img.shields.io/badge/Baileys-WhatsApp%20API-25D366?logo=whatsapp&logoColor=white)](https://github.com/WhiskeySockets/Baileys)
[![License](https://img.shields.io/badge/licence-MIT-red)]()

</div>

---

## 📋 Índice

- [✨ Características](#-características)
- [📂 Categorías de comandos](#-categorías-de-comandos)
- [📱 Instalación en Termux](#-instalación-en-termux)
- [💻 Instalación en PC](#-instalación-en-pc)
- [⚙️ Configuración](#-configuración)
- [▶️ Ejecutar](#-ejecutar)
- [👤 Autor](#-autor)

---

## ✨ Características

- ⚡ Bot rápido y ligero construido con **TypeScript** y **Baileys**
- 🎵 Descargas de YouTube, TikTok, Instagram, Facebook y más
- 🖼️ Generador de logos, stickers y perfiles personalizados
- 🤖 Herramientas con IA integrada
- 🛡️ Sistema de administración de grupos (antilink, antispam, bienvenidas...)
- 🎮 Comandos de diversión, economía y personalidad
- 🌸 Temática anime con comandos tipo *reaction*

## 📂 Categorías de comandos

| Categoría | Descripción |
|---|---|
| 🛡️ `admin` | Kick, promote, mute, antilink, antispam, welcome, bye, alertas |
| 🌸 `anime` | hug, kiss, slap, pat, kill, dance y muchas más reacciones |
| ⬇️ `download` | play, ytmp3, ytmp4, TikTok, Instagram, Facebook, APK, letras |
| 💰 `economy` | Sistema de economía y recompensas |
| 🎉 `fun` | Comandos para divertirse en grupo |
| 🎨 `logomaker` | Creador de logos y textos con estilo |
| 📌 `main` | menu, ping, infobot, creador, status |
| 👑 `owner` | Comandos exclusivos del dueño del bot |
| 👤 `perfil` | Perfiles personalizados |
| 🖼️ `stickers` | Creación y gestión de stickers |
| 🛠️ `tools` | IA, toimg, tomp3, ship, medidores, chistes, inspect y más |

## 📱 Instalación en Termux

1. **Actualiza los paquetes de Termux**

```bash
pkg update && pkg upgrade
```

2. **Instala las dependencias necesarias**

```bash
pkg install git nodejs ffmpeg -y
```

> ⚠️ Requerido **Node.js >= 22.6.0**. Con el lanzador incluido el bot **ya funciona en Node 22** (agrega los flags solo). Verifica con `node -v`; si es menor, actualiza con `pkg install nodejs -y`.

3. **Clona el repositorio**

```bash
git clone https://github.com/Gus-1337/AKAME-MD.git
cd AKAME-MD
```

4. **Instala las dependencias del bot**

```bash
npm install
```

5. **Ejecuta el bot** *(escanea el código QR con WhatsApp)*

```bash
npm start
```

> 💡 Para mantenerlo corriendo en segundo plano puedes usar `termux-wake-lock` o ejecutarlo dentro de una sesión de `tmux`/`screen`.

## 💻 Instalación en PC

1. **Clona el repositorio**

```bash
git clone https://github.com/Gus-1337/AKAME-MD.git
cd AKAME-MD
```

2. **Instala las dependencias** *(requiere Node.js >= 23, no funciona con Node 22)*

```bash
npm install
```

## ⚙️ Configuración

Edita el archivo [`config.ts`](config.ts) con tus datos (número del bot, prefijo, datos del creador, etc.).

## ▶️ Ejecutar

```bash
npm start        # modo producción
npm run dev      # modo desarrollo (recarga automática)
npm run build    # verificar tipos (tsc --noEmit)
```

> 🧠 **¿Node 22 o Node 23?** El bot corre TypeScript directo, y en Node 22 eso
> necesita flags (`--experimental-strip-types` y `--experimental-sqlite`).
> El lanzador (`scripts/lanzar.mjs`) detecta tu versión y los agrega solo
> cuando hacen falta, así que **`npm start` funciona igual en Node 22.6+ y en
> Node 23/24+**. Si prefieres correrlo a mano en Node 22:
>
> ```bash
> node --experimental-strip-types --experimental-sqlite index.ts
> ```

Al iniciar, escanea el **código QR** con WhatsApp y ¡listo! 🗡️

---

<div align="center">

**AKAME-MD** — hecho con ❤️ y pétalos rojos 🌹

👤 Autor: **Gus** — [@Gus-1337](https://github.com/Gus-1337)

</div>
