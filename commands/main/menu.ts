import config from '#config';

const ord = ['main', 'owner', 'info', 'download', 'profile', 'admin', 'stickers', 'tools', 'ia', 'utils', 'fun', 'game', 'economy', 'gacha', 'subbot', 'anime', 'nsfw', 'otros', 'logo'];
const idx = new Map(ord.map((c, i) => [c, i]));
const emojis: any = {
    'main': '🌸', 'owner': '👑', 'info': '💮', 'download': '🎀', 'profile': '💖',
    'admin': '🛡️', 'stickers': '✨', 'tools': '🌷', 'ia': '🤖', 'utils': '🍓',
    'fun': '💕', 'game': '🎮', 'economy': '💸', 'gacha': '🪭', 'subbot': '🧩',
    'anime': '🦋', 'nsfw': '💋', 'otros': '🌺', 'logo': '🎨'
};

// Estilo de lista: bloque por categoría con ♡ y ➪ / ✦ (igual que la lista de referencia)
const bloqueCategoria = (titulo: string, cmds: { cmd: string; desc: string }[], p: string, emoji: string) => {
    let t = `┏━━〔 ♡ ${emoji} ${titulo.toUpperCase()} ♡ 〕━━⬣\n\n`;
    for (const x of cmds) t += `┃ ♡ ➪ ${p}${x.cmd}\n┃ ✦ ${x.desc}\n┃\n`;
    t += `┗━━━━━━━━━━━━━━━⬣\n\n`;
    return t;
};

export default {
    command: ['menu', 'help', 'comandos'],
    description: 'Lista de comandos por categoría',
    category: 'main',
    group: true,
    run: async (ctx: any) => {
        const { sock, msg, chat, args, usedPrefix, prefix, sender } = ctx;
        const p = usedPrefix || prefix || (config as any).prefix || '.';
        const plg = global.plugins || {};
        const perfilSub = (global as any).subbotPerfil;
        // En un subbot, el menú usa el nombre que puso su dueño
        const marcaMenu = String(perfilSub?.nombre || 'AKAME').toUpperCase();
        const marcaPie = perfilSub?.nombre || 'AKAME-MD';
        const mainBanner = perfilSub?.banner || (config as any).banner;
        const banners = (config as any).banners || {};

        const cats: Map<string, any[]> = new Map();
        let tot = 0;

        for (const k of Object.keys(plg)) {
            const item = plg[k];
            if (!item?.command) continue;
            tot++;
            const cat = (item.category || 'otros').toLowerCase();
            if ((global as any).esSubbot && (cat === 'owner' || cat === 'subbot')) continue;
            if (!cats.has(cat)) cats.set(cat, []);
            const mainCmd = Array.isArray(item.command)? item.command[0] : item.command;
            if (!cats.get(cat)!.some(x => x.cmd === mainCmd)) {
                cats.get(cat)!.push({ cmd: mainCmd, desc: item.description || item.desc || 'Sin descripción' });
            }
        }

        const scats = Array.from(cats.keys()).sort((a,b)=>{
            const ia = idx.has(a)? idx.get(a)! : 999;
            const ib = idx.has(b)? idx.get(b)! : 999;
            return ia!==ib? ia-ib : a.localeCompare(b);
        });
        for (const c of scats) cats.get(c)!.sort((a,b)=>a.cmd.localeCompare(b.cmd));
        const carg = args[0]?.toLowerCase();

        const senderJid = sender || msg.key?.participant || chat;
        const userName = msg.pushName || 'Usuario';

        if (carg && cats.has(carg)) {
            const cmds = cats.get(carg)!;
            const cemo = emojis[carg] || '♡';
            const bannerCat = banners[carg] || mainBanner;
            let txt = `┏━━〔 ♡ ${cemo} ${carg.toUpperCase()} ♡ 〕━━⬣\n`;
            txt += `┃ ✧ Total » ${cmds.length} comandos\n`;
            txt += `┗━━━━━━━━━━━━━━━⬣\n\n`;
            for (const x of cmds) txt += `┃ ♡ ➪ ${p}${x.cmd}\n┃ ✦ ${x.desc}\n┃\n`;
            txt += `\n> ♡ Escribe el comando y disfruta ♡`;
            return await sock.sendMessage(chat, {
                image: bannerCat? { url: bannerCat } : undefined,
                caption: txt,
                title: `♡ ${carg.toUpperCase()} ♡`,
                subtitle: `${cmds.length} comandos`,
                footer: marcaPie,
                interactiveButtons: [
                    { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '🏠 Menú', id: `${p}menu` }) }
                ]
            }, { quoted: msg });
        }

        if (carg === 'all') {
            let menu = `┏━━〔 ♡ MENÚ COMPLETO ♡ 〕━━⬣\n`;
            menu += `┃ ✧ Hola » ${userName}\n`;
            menu += `┃ ✧ Total » ${tot} comandos\n`;
            menu += `┃ ✧ Prefijo » ( ${p} )\n`;
            menu += `┗━━━━━━━━━━━━━━━⬣\n\n`;
            for (const c of scats) {
                menu += bloqueCategoria(c, cats.get(c)!, p, emojis[c] || '♡');
            }
            menu += `> ♡ Escribe el comando y disfruta ♡`;
            return await sock.sendMessage(chat, {
                image: banners['main'] || mainBanner? { url: banners['main'] || mainBanner } : undefined,
                caption: menu,
                title: `MENU ${marcaMenu}`,
                subtitle: `${tot} comandos`,
                footer: marcaPie,
                mentions: [senderJid],
                interactiveButtons: [
                    { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '🏠 Menú', id: `${p}menu` }) }
                ]
            }, { quoted: msg });
        }

        const hora = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
        const rows = [
            { title: '📋 TODO EL MENU', description: `Ver los ${tot} comandos`, id: `${p}menu all` },
 ...scats.map(c => ({ title: `${emojis[c] || '♡'} ${c.toUpperCase()}`, description: `${cats.get(c)!.length} comandos`, id: `${p}menu ${c}` }))
        ];

        const mainText =
`╭─〔 Hola ${userName} 〕─
│ ✧ Bot: ${perfilSub?.nombre || config.botName}
│ ✧ Creador: GUS
│ ✧ Hora: ${hora}
│ ✧ Total: ${tot} cmds
│ ✧ Prefijo: ( ${p} )
│ ✧ By GUS
╰───────────────
> Selecciona una categoría abajo`;

        await sock.sendMessage(chat, {
            image: mainBanner? { url: mainBanner } : undefined,
            caption: mainText,
            title: `｡･:*˚:✧｡ MENU ${marcaMenu} ｡✧:˚*･｡`,
            subtitle: `Hola ${userName}`,
            footer: marcaPie,
            mentions: [senderJid],
            interactiveButtons: [
                { name: 'single_select', buttonParamsJson: JSON.stringify({ title: 'Ver Categorías', sections: [{ title: 'Categorías ' + marcaMenu, highlight_label: marcaMenu, rows: rows }] }) }
            ]
        }, { quoted: msg });
    }
};
