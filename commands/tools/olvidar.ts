import fs from 'fs'
const memoryFile = './sara_memory.json'

export default {
    command: ['olvidar', 'olvida', 'resetsara'],
    description: 'Borra memoria de Sara',
    category: 'tools',
    run: async ({ chat, m, sock }) => {
        const sender = m.sender
        let memoryDB = {}
        if (fs.existsSync(memoryFile)) {
            try { memoryDB = JSON.parse(fs.readFileSync(memoryFile, 'utf-8')) } catch {}
        }

        if (memoryDB[sender]) {
            delete memoryDB[sender]
            fs.writeFileSync(memoryFile, JSON.stringify(memoryDB, null, 2))
            await sock.sendMessage(chat, { text: `listo bro, ya le borré TODO lo que sabía de ti 🗑️🌸 ahora está en 0` }, { quoted: m })
        } else {
            await sock.sendMessage(chat, { text: `ya está limpia bro, no tenía nada tuyo` }, { quoted: m })
        }
    },
}