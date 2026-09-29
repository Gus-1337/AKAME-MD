import fetch from 'node-fetch'
import fs from 'fs'

const memoryFile = './sara_memory.json'

function getMemory() {
    if (!fs.existsSync(memoryFile)) return {}
    try {
        return JSON.parse(fs.readFileSync(memoryFile, 'utf-8'))
    } catch { return {} }
}
function saveMemory(db) {
    fs.writeFileSync(memoryFile, JSON.stringify(db, null, 2))
}

export default {
    command: ['sara'],
    description: 'Sara tu amiga de confianza',
    category: 'tools',
    run: async ({ chat, m, sock, args }) => {
        const text = args.join(' ')
        const sender = m.sender
        if (!text) return sock.sendMessage(chat, { text: `Holaaa soy Sara 💌 cuéntame lo que sea` }, { quoted: m })

        try {
            await sock.sendPresenceUpdate('composing', chat)
            await new Promise(r => setTimeout(r, 3000))

            let memoryDB = getMemory()
            if (!memoryDB[sender]) memoryDB[sender] = []
            memoryDB[sender].push(text)
            if (memoryDB[sender].length > 12) memoryDB[sender].shift()
            saveMemory(memoryDB)

            const historial = memoryDB[sender].join(' | ')
            const lower = text.toLowerCase()
            const esTarea = ['que es', 'qué es', 'explica', 'como hacer', 'cómo hacer', 'tarea', 'codigo', 'resume'].some(p => lower.includes(p))

            let prompt = esTarea
               ? `Eres Sara, IA amigable e inteligente. Responde claro y útil. Memoria: "${historial}"`
                : `Eres Sara, 19 años, dulce, humana. Hablas como chica real por WhatsApp: minúsculas, jaja, ayy, tmb, emojis 🌸💌🥺. Recuerdas: "${historial}". Si no hay memoria no inventes. Responde corto y natural.`

            const res = await fetch(`https://api.delirius.online/ia/gptprompt?text=${encodeURIComponent(text)}&prompt=${encodeURIComponent(prompt)}`)
            const json = await res.json()

            await sock.sendPresenceUpdate('paused', chat)
            await sock.sendMessage(chat, { text: `${json.data}` }, { quoted: m })

        } catch (err) {
            await sock.sendMessage(chat, { text: `ayy error: ${err.message} 🥺` }, { quoted: m })
        }
    },
}