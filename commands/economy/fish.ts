import fs from 'fs';
import path from 'path';
import { GANANCIA_BASE } from '#shop';
import { UserJid } from '#simple';
import { activeEffectsLine, coinMultiplier, effectiveCooldown, titulo, money, formatDuration, ecoUser, bloqueadoPorAdmin } from '#shop';
import config from '#config';
import { saveDB } from '#db';
import { canaDe, tirarRatio } from '../../lib/canas.ts';

// Cada pez tiene la MISMA probabilidad (1 de 25). El peso sale al azar dentro de su rango;
// la caña equipada hace más probable un peso grande (ver lib/canas.ts).
const PECES = [
    { nombre: 'Anchoveta 🐟', coins: 120, min: 0.05, max: 0.3 },
    { nombre: 'Sardina 🐟', coins: 150, min: 0.2, max: 1 },
    { nombre: 'Camarón 🦐', coins: 350, min: 0.05, max: 0.5 },
    { nombre: 'Pez Payaso 🐠', coins: 300, min: 0.1, max: 0.5 },
    { nombre: 'Caballa 🐟', coins: 220, min: 0.5, max: 2 },
    { nombre: 'Jurel 🐟', coins: 260, min: 0.5, max: 3 },
    { nombre: 'Cangrejo 🦀', coins: 500, min: 0.2, max: 2 },
    { nombre: 'Trucha 🐠', coins: 400, min: 0.5, max: 4 },
    { nombre: 'Calamar 🦑', coins: 700, min: 0.5, max: 5 },
    { nombre: 'Pulpo 🐙', coins: 800, min: 1, max: 6 },
    { nombre: 'Pez Globo 🐡', coins: 900, min: 0.5, max: 3 },
    { nombre: 'Langosta 🦞', coins: 1000, min: 0.5, max: 4 },
    { nombre: 'Atún 🐟', coins: 1100, min: 5, max: 30 },
    { nombre: 'Mero 🐟', coins: 1200, min: 5, max: 40 },
    { nombre: 'Pez Espada 🗡️', coins: 1300, min: 10, max: 60 },
    { nombre: 'Tiburón 🦈', coins: 1500, min: 20, max: 150 },
    { nombre: 'Pez Ángel 🐠', coins: 1800, min: 0.5, max: 3 },
    { nombre: 'Pez Dorado 🌟', coins: 2000, min: 1, max: 5 },
    { nombre: 'Pez Luna 🌙', coins: 2500, min: 50, max: 500 },
    { nombre: 'Orca 🐋', coins: 3500, min: 1000, max: 6000 },
    { nombre: 'Ballena 🐳', coins: 3000, min: 500, max: 3000 },
    { nombre: 'Cachalote 🐋', coins: 4000, min: 2000, max: 15000 },
    { nombre: 'Pez Sirena 🧜', coins: 6000, min: 3, max: 10 },
    { nombre: 'Pez Dragón 🐉', coins: 8000, min: 5, max: 25 },
    { nombre: 'Kraken 🦑', coins: 10000, min: 300, max: 1500 }
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
const imagenDeTamano = (clave: string): Buffer | null => {
    if (!(clave in cacheImg)) {
        const ruta = path.join(RUTA_IMG, `${clave}.jpg`);
        cacheImg[clave] = fs.existsSync(ruta) ? fs.readFileSync(ruta) : null;
    }
    return cacheImg[clave];
};

const sacarPez = () => PECES[Math.floor(Math.random() * PECES.length)];

const pesoAlAzar = (pez: { min: number; max: number }, ratio: number) => {
    const kg = pez.min + (pez.max - pez.min) * ratio;
    return { kg, ratio };
};

const tamanoDe = (ratio: number) => TAMANOS.find((t) => ratio < t.hasta) || TAMANOS[TAMANOS.length - 1];

const formatoKg = (kg: number) => (kg < 10 ? kg.toFixed(2) : kg.toFixed(1)) + ' kg';

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

            const cana = canaDe(user);
            const pez = sacarPez();
            const { kg, ratio } = pesoAlAzar(pez, tirarRatio(cana));
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
                `   ⌁ Caña » *${cana.nombre}* ${cana.emoji}\n\n` +
                `♡ Ganaste › *+${money(ganancia)}* ${coin}\n` +
                `♡ Saldo › *${money(user.coins)}* ${coin}` +
                activeEffectsLine(user) +
                `\n\n> ✧ Vuelve en un rato, la caña se seca 🎣`;

            const foto = imagenDeTamano(tamano.clave);
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
