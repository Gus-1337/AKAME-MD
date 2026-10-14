const caja = (titulo: string, lineas: string[]) =>
    `˚₊· ͟͟͞͞➳❥ *${titulo}*\n───────────────\n${lineas.join('\n')}\n───────────────\n> ${(globalThis as any).botName || 'AKAME-MD'} 🌸`;

const tiempo = (seg: number): string => {
    const d = Math.floor(seg / 86400);
    const h = Math.floor((seg % 86400) / 3600);
    const m = Math.floor((seg % 3600) / 60);
    const s = Math.floor(seg % 60);
    return [d && `${d}d`, h && `${h}h`, m && `${m}m`, `${s}s`].filter(Boolean).join(' ');
};

const rendimiento = (ms: number): string =>
    ms < 300 ? '🟢 Excelente' : ms < 800 ? '🟡 Bien' : '🔴 Lenta';

export default {
    command: ['ping', 'p'],
    description: 'Verifica la velocidad de respuesta del bot',
    category: 'main',
    group: true,
    run: ({ chat, m, sock }: any) => {
        const inicio = performance.now();

        sock.sendMessage(chat, {
            text: caja('PING', ['✧ Midiendo...'])
        }, { quoted: m }).then((sent: any) => {
            if (!sent?.key) return;

            // Tiempo real de ida y vuelta: desde que se envía hasta que WhatsApp confirma el mensaje
            const latencia = Math.max(1, Math.round(performance.now() - inicio));
            const memoriaMB = (process.memoryUsage().rss / 1024 / 1024).toFixed(0);

            sock.sendMessage(chat, {
                text: caja('PONG', [
                    `✧ Respuesta » ${latencia} ms`,
                    `✦ Estado » ${rendimiento(latencia)}`,
                    `✩ Encendido » ${tiempo(process.uptime())}`,
                    `❖ Memoria » ${memoriaMB} MB`
                ]),
                edit: sent.key
            }).catch(() => {});

            queueMicrotask(() => {
                broadcast('ping_measured', {
                    chat,
                    latency: latencia,
                    rawLatency: latencia,
                    timestamp: Date.now()
                });
            });
        }).catch(() => {});
    }
};
