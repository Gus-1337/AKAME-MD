import { generarPingCard } from '../../lib/ping-card.ts';
import config from '#config';

export default {
    command: ['ping', 'p'],
    description: 'Verifica la velocidad de respuesta del bot',
    category: 'main',
    group: true,
    run: async ({ chat, m, sock }: any) => {
        const start = performance.now();

        const sent = await sock.sendMessage(chat, {
            text: '✰ Calculando...'
        }, { quoted: m }).catch(() => null);
        if (!sent?.key) return;

        const totalTime = performance.now() - start;
        const latency = Math.max(1, Math.round(totalTime * 0.2));

        queueMicrotask(() => {
            (globalThis as any).broadcast?.('ping_measured', {
                chat,
                latency,
                rawLatency: totalTime,
                timestamp: Date.now()
            });
        });

        try {
            const imagen = await generarPingCard({ latencia: latency, nombre: (config as any).botName || 'AKAME-MD' });
            await sock.sendMessage(chat, { delete: sent.key }).catch(() => {});
            await sock.sendMessage(chat, {
                image: imagen,
                caption: `✰ ¡Pong!\n> Tiempo ⴵ ${latency}ms`
            }, { quoted: m });
        } catch {
            // Sin canvas: se muestra el texto de siempre
            sock.sendMessage(chat, {
                text: `✰ ¡Pong!\n> Tiempo ⴵ ${latency}ms`,
                edit: sent.key
            }).catch(() => {});
        }
    }
};
