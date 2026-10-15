import { listarSubbots, getCupo } from '../../lib/subbots.ts';

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
        if (vinculando) lineas.push(`✦ Vinculando » ${vinculando}`);
        if (pausados) lineas.push(`✦ Pausados » ${pausados}`);
        if (caidos) lineas.push(`✦ Caídos » ${caidos}`);
        lineas.push('', `❖ Total de bots activos » *${1 + conectados}*`);

        return sock.sendMessage(chat, { text: caja('BOTS', lineas) }, { quoted: msg });
    }
};
