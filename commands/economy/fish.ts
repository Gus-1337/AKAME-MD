import fs from 'fs';
import path from 'path';
import { GANANCIA_BASE } from '#shop';
import { UserJid } from '#simple';
import { activeEffectsLine, coinMultiplier, effectiveCooldown, titulo, money, formatDuration, ecoUser, bloqueadoPorAdmin } from '#shop';
import config from '#config';
import { saveDB } from '#db';

// Cada pez tiene la MISMA probabilidad (1 de 25). El peso sale al azar dentro de su rango.
const PECES = [
    // Mar peruano
    { nombre: 'Anchoveta 🐟', coins: 100, min: 0.02, max: 0.1, img: 'anchoveta' },
    { nombre: 'Sardina peruana 🐟', coins: 120, min: 0.05, max: 0.3, img: 'sardina' },
    { nombre: 'Pejerrey 🐟', coins: 250, min: 0.1, max: 0.5, img: 'sardina' },
    { nombre: 'Caballa 🐟', coins: 220, min: 0.3, max: 1.2, img: 'caballa' },
    { nombre: 'Jurel 🐟', coins: 260, min: 0.4, max: 2.5, img: 'jurel' },
    { nombre: 'Bonito 🐟', coins: 350, min: 1.5, max: 5, img: 'atun' },
    { nombre: 'Lenguado 🐟', coins: 400, min: 0.5, max: 2, img: 'trucha' },
    { nombre: 'Corvina 🐟', coins: 500, min: 1, max: 5, img: 'caballa' },
    { nombre: 'Cangrejo de roca 🦀', coins: 450, min: 0.1, max: 0.5, img: 'cangrejo' },
    { nombre: 'Pulpo común 🐙', coins: 800, min: 0.5, max: 3, img: 'pulpo' },
    { nombre: 'Calamar gigante 🦑', coins: 900, min: 2, max: 12, img: 'calamar' },
    { nombre: 'Pez globo 🐡', coins: 700, min: 0.2, max: 1, img: 'pez-globo' },
    { nombre: 'Langosta espinosa 🦞', coins: 1000, min: 0.3, max: 2, img: 'langosta' },
    { nombre: 'Mero 🐟', coins: 1200, min: 5, max: 40, img: 'mero' },
    { nombre: 'Atún aleta amarilla 🐟', coins: 1600, min: 10, max: 60, img: 'atun' },
    { nombre: 'Tiburón azul 🦈', coins: 1500, min: 20, max: 100, img: 'tiburon' },
    { nombre: 'Pez espada 🗡️', coins: 1800, min: 30, max: 150, img: 'pez-espada' },
    { nombre: 'Raya látigo 🐟', coins: 2500, min: 10, max: 50, img: 'pez-luna' },
    // Ríos de la Amazonía
    { nombre: 'Camarón de río 🦐', coins: 300, min: 0.02, max: 0.1, img: 'camaron' },
    { nombre: 'Pez payaso 🐠', coins: 300, min: 0.02, max: 0.1, img: 'pez-payaso' },
    { nombre: 'Gamitana 🐟', coins: 1400, min: 3, max: 15, img: 'trucha' },
    { nombre: 'Dorado 🌟', coins: 1000, min: 2, max: 10, img: 'pez-dorado' },
    { nombre: 'Paiche 🐟', coins: 4000, min: 30, max: 150, img: 'orca' },
    // Grandes
    { nombre: 'Cachalote 🐋', coins: 12000, min: 15000, max: 45000, img: 'cachalote' },
    { nombre: 'Ballena jorobada 🐳', coins: 10000, min: 15000, max: 30000, img: 'ballena' }
];

// Tamaño según dónde cae el peso dentro del rango del pez
const TAMANOS = [
    { clave: 'pequeno', etiqueta: 'Pequeño', hasta: 0.25, factor: 1 },
    { clave: 'mediano', etiqueta: 'Mediano', hasta: 0.6, factor: 1.5 },
    { clave: 'grande', etiqueta: 'Grande', hasta: 0.9, factor: 2.2 },
    { clave: 'gigante', etiqueta: 'Gigante', hasta: 1.01, factor: 3.5 }
];

const RUTA_IMG = path.join(process.cwd(), 'img', 'pesca');
const cacheImg: Record<string, Buffer | null> = {};
const imagenDePez = (slug: string): Buffer | null => {
    const clave = `pez-${slug}`;
    if (!(clave in cacheImg)) {
        const ruta = path.join(RUTA_IMG, `${slug}.jpg`);
        cacheImg[clave] = fs.existsSync(ruta) ? fs.readFileSync(ruta) : null;
    }
    return cacheImg[clave];
};
const imagenDeTamano = (clave: string): Buffer | null => {
    if (!(clave in cacheImg)) {
        const ruta = path.join(RUTA_IMG, `${clave}.jpg`);
        cacheImg[clave] = fs.existsSync(ruta) ? fs.readFileSync(ruta) : null;
    }
    return cacheImg[clave];
};

const sacarPez = () => PECES[Math.floor(Math.random() * PECES.length)];

const pesoAlAzar = (pez: { min: number; max: number }) => {
    const ratio = Math.random();
    const kg = pez.min + (pez.max - pez.min) * ratio;
    return { kg, ratio };
};

const tamanoDe = (ratio: number) => TAMANOS.find((t) => ratio < t.hasta) || TAMANOS[TAMANOS.length - 1];

const formatoKg = (kg: number) => (kg < 10 ? kg.toFixed(2) : kg.toLocaleString('es-PE', { maximumFractionDigits: 1 })) + ' kg';

export default {
    command: ['fish', 'pescar'],
    description: 'Pesca y gana',
    category: 'economy',
    group: true,
    run: async ({ chat, m, sock, sender, usedPrefix, prefix }: any) => {
        const p = usedPrefix || prefix || (config as any).prefix || '.';
        const reply = (t: string) => sock.sendMessage(chat, { text: t }, { quoted: m });
        try {
            if (bloqueadoPorAdmin(chat)) return reply(`「 ꕤ 」 Los comandos de *Economía* están bloqueados. Un admin puede usar *${p}onlyadmin off*.`);
            const jid = await UserJid(sock, chat, sender);
            const user = ecoUser(chat, jid);
            if (!user) return reply('「 ꕤ 」 Error: La base de datos no está inicializada.');
            const coin = (config as any)?.coin || '¥enes';

            const cooldown = effectiveCooldown(user, 2 * 60 * 1000);
            const diff = Date.now() - (user.lastFish || 0);
            if (user.lastFish && diff < cooldown) {
                return reply(`「 ꕤ 」 La caña necesita secarse, vuelve en *${formatDuration(cooldown - diff)}*.`);
            }

            const pez = sacarPez();
            const { kg, ratio } = pesoAlAzar(pez);
            const tamano = tamanoDe(ratio);
            const ganancia = Math.round(pez.coins * tamano.factor * coinMultiplier(user) * GANANCIA_BASE);

            user.coins = (user.coins || 0) + ganancia;
            user.lastFish = Date.now();
            if (!user.inventory) user.inventory = {};
            user.inventory[pez.nombre] = (user.inventory[pez.nombre] || 0) + 1;
            saveDB(chat, jid);

            const texto =
                `${titulo('PESCA')}\n\n` +
                `   ✧ Pez » *${pez.nombre}*\n` +
                `   ✦ Peso » *${formatoKg(kg)}*\n` +
                `   ✿ Tamaño » *${tamano.etiqueta}*\n` +
                `\n` +
                `♡ Ganaste › *+${money(ganancia)}* ${coin}\n` +
                `♡ Saldo › *${money(user.coins)}* ${coin}` +
                activeEffectsLine(user) +
                `\n\n> ✧ Vuelve en un rato, la caña se seca 🎣`;

            // Imagen del pez; si todavía no tiene la suya, la del tamaño
            const foto = imagenDePez(pez.img) || imagenDeTamano(tamano.clave);
            if (foto) {
                return sock.sendMessage(chat, { image: foto, caption: texto }, { quoted: m });
            }
            return reply(texto);
        } catch (e) {
            console.error('Error en fish:', e);
            return reply('「 ꕤ 」 Ocurrió un error al pescar.');
        }
    }
};
