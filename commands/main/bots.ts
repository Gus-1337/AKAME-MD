import fs from 'fs';
import path from 'path';
import { listarSubbots, getCupo } from '../../lib/subbots.ts';

/** Nombre que el dueño puso con .setname (si no tiene, se muestra un número de orden). */
const nombreDe = (id: string, n: number): string => {
    try {
        const perfil = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'subbots', id, 'perfil.json'), 'utf8'));
        const nombre = String(perfil?.nombre || '').trim();
        if (nombre && nombre !== 'AKAME Subbot') return nombre;
    } catch {}
    return `Subbot #${n}`;
};

const caja = (titulo: string, lineas: string[]) =>
    `˚₊· ͟͟͞͞➳❥ *${titulo}*\n───────────────\n${lineas.join('\n')}\n───────────────\n> AKAME-MD 🌸`;

const tiempoActivo = (seg: number): string => {
    const d = Math.floor(seg / 86400);
    const h = Math.floor((seg % 86400) / 3600);
    const m = Math.floor((seg % 3600) / 60);
    return [d && `${d}d`, h && `${h}h`, `${m}m`].filter(Boolean).join(' ');
};

export default {
    command: ['bots'],
    description: 'Muestra cuántos bots (principal y subbots) están conectados',
    category: 'main',
    run: async (ctx: any) => {
        const { sock, msg, chat } = ctx;

        const lista = listarSubbots();
        const cupo = getCupo();
        const cuenta = (estado: string) => lista.filter((s) => s.estado === estado).length;
        const conectados = cuenta('conectado');
        const vinculando = cuenta('emparejando');
        const pausados = cuenta('pausado');
        const caidos = cuenta('caido');

        const lineas = [
            `✧ Bot principal » ✅ en línea`,
            `✦ Tiempo activo » ${tiempoActivo(Math.floor(process.uptime()))}`,
            '',
            `✩ Subbots conectados » *${conectados}/${cupo}*`,
        ];
        const conectadosLista = lista.filter((s) => s.estado === 'conectado');
        conectadosLista.forEach((s, i) => lineas.push(`   ꒰ ${i + 1} ꒱ ${nombreDe(s.id, i + 1)}`));
        if (vinculando) lineas.push(`✦ Vinculando » ${vinculando}`);
        if (pausados) lineas.push(`✦ Pausados » ${pausados}`);
        if (caidos) lineas.push(`✦ Caídos » ${caidos}`);
        lineas.push('', `❖ Total de bots activos » *${1 + conectados}*`);

        return sock.sendMessage(chat, { text: caja('BOTS', lineas) }, { quoted: msg });
    }
};
