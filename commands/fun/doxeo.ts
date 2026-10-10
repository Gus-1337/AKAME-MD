import { UserJid } from '#simple';

export default {
    command: ['doxeo', 'doxeofake', 'doxxing', 'dox'],
    description: 'Doxeo fake ultra realista',
    category: 'fun',
    group: true,
    run: async ({ chat, m, sock }: any) => {
        let jid = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || m.quoted?.sender;
        let name = 'Usuario';

        if (jid) {
            jid = await UserJid(sock, chat, jid);
            const dbData = (global as any).db.data;
            name = dbData.chats[chat].users?.[jid]?.name || jid.split('@')[0];
        } else {
            return sock.sendMessage(chat, { text: `「✿」 Menciona a alguien para doxear pe\n\n> Ejemplo:.doxeo @usuario` }, { quoted: m });
        }

        const randomIp = () => `${Math.floor(Math.random() * 223) + 1}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
        const randomNum = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

        const operadoras = ["Movistar Perú", "Claro Perú", "Entel Perú", "Bitel", "WOW Perú"];
        const dispositivos = ["Samsung Galaxy A54 - Android 14", "iPhone 13 - iOS 18.1", "Xiaomi Redmi Note 13", "Motorola G84", "Infinix Hot 40", "PC Windows 11 - Chrome 128"];

        const ciudades = [
            { ciudad: "Arequipa, Arequipa - Perú", lat: -16.4090, lon: -71.5374 },
            { ciudad: "Lima Centro, Lima - Perú", lat: -12.0463, lon: -77.0427 },
            { ciudad: "Callao, Callao - Perú", lat: -12.0566, lon: -77.1180 },
            { ciudad: "Pisco, Ica - Perú", lat: -13.7111, lon: -76.2033 },
            { ciudad: "San Juan de Lurigancho, Lima - Perú", lat: -12.0292, lon: -77.0101 },
            { ciudad: "Miraflores, Lima - Perú", lat: -12.1219, lon: -77.0307 },
            { ciudad: "Comas, Cono Norte - Lima", lat: -11.9487, lon: -77.0500 },
            { ciudad: "Villa El Salvador, Cono Sur - Lima", lat: -12.2148, lon: -76.9372 },
            { ciudad: "San Juan de Miraflores, Lima - Perú", lat: -12.1500, lon: -76.9667 },
            { ciudad: "Los Olivos, Lima - Perú", lat: -11.9916, lon: -77.0707 },
            { ciudad: "Iquitos, Loreto - Perú", lat: -3.7491, lon: -73.2538 },
            { ciudad: "Cusco, Cusco - Perú", lat: -13.5320, lon: -71.9675 },
            { ciudad: "Trujillo, La Libertad - Perú", lat: -8.1116, lon: -79.0287 },
        ];

        const loc = ciudades[Math.floor(Math.random() * ciudades.length)];
        const ip = randomIp();

        const texto = `
╭━━━〔 *☠️ DOXEO SYSTEM ☠️* 〕━━━╮
┃
┃ *» Objetivo:* ${name}
┃ *» JID:* ${jid}
┃ *» IP:* ${ip}
┃ *» Operadora:* ${operadoras[Math.floor(Math.random() * operadoras.length)]}
┃ *» Dispositivo:* ${dispositivos[Math.floor(Math.random() * dispositivos.length)]}
┃
┃ *📍 UBICACIÓN DETECTADA*
┃
┃ *» Ciudad:* ${loc.ciudad}
┃ *» Lat:* ${loc.lat}
┃ *» Lon:* ${loc.lon}
┃ *» Google Maps:* https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lon}
┃ *» Precisión:* ${randomNum(5, 120)} metros
┃
┃ *📡 DATOS EXTRA*
┃
┃ *» Puerto abierto:* ${randomNum(3000, 9000)}
┃ *» Ping:* ${randomNum(20, 180)}ms
┃ *» Estado:* Conectado
┃
┃ *⚠️ ESTE DOXEO ES 100% FAKE*
┃ *Generado por el bot, no es real.*
╰━━━━━━━━━━━━━━━━━━━━━━━╯
`.trim();

        await sock.sendMessage(chat, { text: texto }, { quoted: m });
    }
};
