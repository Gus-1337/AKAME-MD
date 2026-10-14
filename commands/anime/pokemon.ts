import axios from 'axios'
import { UserJid } from '#simple'
import config from '#config'

const TIEMPO_RECLAMO = 60000
const MAX_ID = 1025
const coinName = (config as any)?.coin || 'coins'

// Rareza según la especie: legendarios y míticos valen más
const RAREZAS: Record<string, { icono: string; valor: number }> = {
    'Común': { icono: '⚪', valor: 1000 },
    'Rara': { icono: '🔵', valor: 3000 },
    'Épica': { icono: '🟣', valor: 8000 },
    'Legendaria': { icono: '🟡', valor: 20000 }
}

const TIPOS: Record<string, string> = {
    normal: 'Normal', fire: 'Fuego', water: 'Agua', electric: 'Eléctrico', grass: 'Planta',
    ice: 'Hielo', fighting: 'Lucha', poison: 'Veneno', ground: 'Tierra', flying: 'Volador',
    psychic: 'Psíquico', bug: 'Bicho', rock: 'Roca', ghost: 'Fantasma', dragon: 'Dragón',
    dark: 'Siniestro', steel: 'Acero', fairy: 'Hada'
}

// Pokémon esperando captura por chat (compartido con .cpk)
export const pokePendientes: Map<string, any> = (global as any).pokePendientes || ((global as any).pokePendientes = new Map())

const normalize = (x: string) => String(x).split('@')[0].split(':').pop()?.replace(/[^\d]/g, '') || ''

export function rarezaDe(species: any): string {
    if (species?.is_legendary || species?.is_mythical) return 'Legendaria'
    const tasa = Number(species?.capture_rate ?? 255)
    if (tasa <= 45) return 'Épica'
    if (tasa <= 120) return 'Rara'
    return 'Común'
}

export function nombreEs(species: any, fallback: string): string {
    const n = species?.names?.find((x: any) => x.language?.name === 'es')?.name
    return n || fallback.charAt(0).toUpperCase() + fallback.slice(1)
}

export default {
    command: ['pokemon', 'pk', 'rp'],
    description: 'Encuentra un Pokémon salvaje (luego usa .cpk para atraparlo)',
    category: 'gacha',
    run: async ({ chat, m, sock, sender }: any) => {
        const jid = UserJid(sock, chat, sender || m.sender) || sender || m.sender
        const dueno = normalize(jid)

        const activo = pokePendientes.get(chat)
        if (activo) {
            return sock.sendMessage(chat, {
                text: `🌿 Ya hay un Pokémon esperando captura de @${activo.dueno}\n> Espera a que lo atrape o pase el tiempo`,
                mentions: [activo.jid]
            }, { quoted: m })
        }

        await sock.sendMessage(chat, { react: { text: '🌿', key: m.key } }).catch(() => null)

        try {
            const id = Math.floor(Math.random() * MAX_ID) + 1
            const [{ data: p }, { data: s }] = await Promise.all([
                axios.get(`https://pokeapi.co/api/v2/pokemon/${id}`, { timeout: 15000 }),
                axios.get(`https://pokeapi.co/api/v2/pokemon-species/${id}`, { timeout: 15000 })
            ])

            const nombre = nombreEs(s, p.name)
            const tipos = (p.types || []).map((t: any) => TIPOS[t.type.name] || t.type.name).join(' / ')
            const rareza = rarezaDe(s)
            const info = RAREZAS[rareza]
            const imagen = p.sprites?.other?.['official-artwork']?.front_default || p.sprites?.front_default

            const pendiente: any = { jid, dueno, id, nombre, tipos, rareza, valor: info.valor, icono: info.icono, imagen, timeout: null }
            pendiente.timeout = setTimeout(async () => {
                if (pokePendientes.get(chat) !== pendiente) return
                pokePendientes.delete(chat)
                await sock.sendMessage(chat, {
                    text: `💨 *${nombre}* se escapó... nadie lo atrapó a tiempo`
                }).catch(() => null)
            }, TIEMPO_RECLAMO)
            pokePendientes.set(chat, pendiente)

            await sock.sendMessage(chat, {
                image: { url: imagen },
                caption:
                    `˚₊· ͟͟͞͞➳❥ *${nombre}* #${String(id).padStart(3, '0')}\n\n` +
                    `> ¡Un Pokémon salvaje apareció!\n\n` +
                    `✧ Tipo › *${tipos}*\n` +
                    `✦ Rareza › *${info.icono} ${rareza}*\n` +
                    `✩ Valor › *${info.valor.toLocaleString('es-PE')}* ${coinName}\n\n` +
                    `✐ Responde este mensaje con *.cpk* para atraparlo.`
            }, { quoted: m })

            await sock.sendMessage(chat, { react: { text: '✅', key: m.key } }).catch(() => null)
        } catch {
            await sock.sendMessage(chat, { react: { text: '❌', key: m.key } }).catch(() => null)
            return sock.sendMessage(chat, { text: '✿ No pude encontrar un Pokémon ahora, intenta de nuevo' }, { quoted: m })
        }
    }
}
