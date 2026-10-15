import { pedirUtil } from '#popcat';

export default {
    command: ['clima', 'tiempo'],
    description: 'Clima actual y pronóstico de una ciudad',
    category: 'tools',
    run: async ({ chat, m, sock, args, text }: any) => {
        const ciudad = (args?.join(' ') || text || '').trim();
        if (!ciudad) {
            return sock.sendMessage(chat, { text: '   ׄ  ✿  Escribe una ciudad. Ej: *.clima Lima*' }, { quoted: m });
        }
        try {
            const [lugar] = await pedirUtil('weather', { q: ciudad });
            const ahora = lugar.current;
            const dias = (lugar.forecast || []).slice(0, 3)
                .map((d: any) => `📅 ${d.day}: ${d.low}°C – ${d.high}°C, ${d.skytextday}`);
            return sock.sendMessage(chat, {
                text: [
                    '˚₊· ͟͟͞͞➳❥ *CLIMA*',
                    '───────────────',
                    `📍 *${lugar.location.name}*`,
                    `🌡️ ${ahora.temperature}°C (sensación ${ahora.feelslike}°C)`,
                    `☁️ ${ahora.skytext}`,
                    `💧 Humedad ${ahora.humidity}%  ·  🌬️ ${ahora.windspeed}`,
                    '───────────────',
                    ...dias,
                    '───────────────'
                ].join('\n')
            }, { quoted: m });
        } catch (e: any) {
            return sock.sendMessage(chat, { text: `✿ No encontré esa ciudad.\n> ${e.message}` }, { quoted: m });
        }
    }
};
