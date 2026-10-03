import fs from 'fs'
import path from 'path'

export default {
  command: ['setprefix', 'setbotprefix'],
  category: 'owner',
  owner: true,

  run: async ({ chat, m, sock, args, usedPrefix }) => {
    if (!global.db.data.settings) global.db.data.settings = {}
    const settings = global.db.data.settings
    const current = settings.globalPrefix?? '.'
    const defaultPrefix = ["."]

    const value = args.join(' ').trim()

    if (!value) {
      const lista = current === 1
      ? '`sin prefijos`'
        : (Array.isArray(current)? current : [current]).map(p => `\`${p}\``).join(', ')
      return await sock.sendMessage(chat, {
        text: `✿ Elige un método de prefijos.\n\n> *○ Multi* :: ${usedPrefix}setprefix *#/!*\n> *○ Reset* :: ${usedPrefix}setprefix *reset*\n> *○ No-Prefix* :: ${usedPrefix}setprefix *noprefix*\n\n✤ Actualmente: ${lista}`
      }, { quoted: m })
    }

    if (value.toLowerCase() === 'reset') {
      settings.globalPrefix = "."
      return await sock.sendMessage(chat, { text: `❖ Prefijos restaurados a *.*` }, { quoted: m })
    }

    if (value.toLowerCase() === 'noprefix') {
      settings.globalPrefix = 1
      return await sock.sendMessage(chat, { text: `❖ Modo sin prefijos activado.\nAhora escribe *menu* sin prefijo.` }, { quoted: m })
    }

    // split seguro
    let graphemes
    try {
      const { default: GraphemeSplitter } = await import('grapheme-splitter')
      graphemes = new GraphemeSplitter().splitGraphemes(value)
    } catch {
      graphemes = [...value]
    }

    const lista = []
    for (const g of graphemes) {
      if (/^[a-zA-Z0-9\s]+$/.test(g)) continue
      if (!lista.includes(g)) lista.push(g)
    }

    if (lista.length === 0) {
      return await sock.sendMessage(chat, { text: '✿ Usa símbolos. Ej: #/!' }, { quoted: m })
    }
    if (lista.length > 6) {
      return await sock.sendMessage(chat, { text: '✿ Máximo 6 prefijos.' }, { quoted: m })
    }

    // ESTO ES LO IMPORTANTE: solo guardamos en DB, NO TOCAMOS config.js
    settings.globalPrefix = lista.length === 1? lista[0] : lista

    return await sock.sendMessage(chat, {
      text: `✤ Prefijo cambiado a *${lista.join(' ')}* correctamente.\nAhora puedes usar: ${lista.map(p => p+'menu').join(', ')}`
    }, { quoted: m })
  }
      }
