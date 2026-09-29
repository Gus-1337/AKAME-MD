import config from '#config';

const ord = ['main', 'info', 'download', 'profile', 'admin', 'stickers', 'tools', 'utils', 'fun', 'game', 'economy', 'gacha', 'anime', 'nsfw', 'otros', 'logo'];
const idx = new Map(ord.map((c, i) => [c, i]));
const emojis: any = {
    'main': '🌸', 'info': '💮', 'download': '🎀', 'profile': '💖',
    'admin': '👑', 'stickers': '✨', 'tools': '🌷', 'utils': '🍓',
    'fun': '💕', 'game': '🎮', 'economy': '💸', 'gacha': '🪭',
    'anime': '🦋', 'nsfw': '💋', 'otros': '🌺', 'logo': '🎨'
};

export default {
    command: ['menu', 'help', 'comandos'],
    category: 'main',
    group: true,
    run: async (ctx: any) => {
        const { sock, msg, chat, args, usedPrefix, prefix } = ctx;
        const p = usedPrefix || prefix || (config as any).prefix || '.';
        const plg = global.plugins || {};
        const mainBanner = (config as any).banner;
        const banners = (config as any).banners || {};

        const cats: Map<string, any[]> = new Map();
        let tot = 0;

        for (const k of Object.keys(plg)) {
            const item = plg[k];
            if (!item?.command || item.owner === true) continue;
            tot++;
            const cat = (item.category || 'otros').toLowerCase();
            if (!cats.has(cat)) cats.set(cat, []);
            const mainCmd = Array.isArray(item.command)? item.command[0] : item.command;
            if (!cats.get(cat)!.some(x => x.cmd === mainCmd)) {
                cats.get(cat)!.push({
                    cmd: mainCmd,
                    desc: item.description || item.desc || 'Sin descripción'
                });
            }
        }

        const scats = Array.from(cats.keys()).sort((a,b)=>{
            const ia = idx.has(a)? idx.get(a)! : 999;
            const ib = idx.has(b)? idx.get(b)! : 999;
            return ia!==ib? ia-ib : a.localeCompare(b);
        });
        for (const c of scats) cats.get(c)!.sort((a,b)=>a.cmd.localeCompare(b.cmd));

        const carg = args[0]?.toLowerCase();

        // CATEGORÍA - LIMPIO COMO EN TU FOTO + SOLO OWNER Y VOLVER
        if (carg && cats.has(carg)) {
            const cmds = cats.get(carg)!;
            const cemo = emojis[carg] || '♡';
            const bannerCat = banners[carg] || mainBanner;
            let txt = `┌─〔 ${cemo} ${carg.toUpperCase()} 〕\n`;
            txt += `│ ✧ Total: ${cmds.length}\n`;
            txt += `│ ✧ Prefijo: ${p}\n`;
            txt += `└──────────────\n\n`;
            for (const c of cmds) {
                txt += `✧ ${p}${c.cmd}\n`;
            }

            return await sock.sendMessage(chat, {
                image: bannerCat? { url: bannerCat } : undefined,
                caption: txt,
                title: `｡･:*˚:✧｡ ♡ ${carg.toUpperCase()} ♡ ｡✧:˚*･｡`,
                subtitle: `${cmds.length} comandos`,
                footer: '亗 By GUS 亗',
                interactiveButtons: [
                    { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '🏠 Volver al menú', id: `${p}menu` }) },
                    { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '👑 Owner', id: `${p}owner` }) }
                ]
            }, { quoted: msg });
        }

        // MENU ALL - ORDENADO Y CON DESCRIPCIÓN
        if (carg === 'all') {
            let menu = `┌─〔 MENU COMPLETO ORDENADO 〕\n`;
            menu += `│ ✧ Comandos: ${tot}\n`;
            menu += `│ ✧ Prefijo: ${p}\n`;
            menu += `└──────────────\n\n`;

            for (const c of scats) {
                const cmds = cats.get(c)!;
                const cemo = emojis[c] || '♡';
                menu += `┌─〔 ${cemo} ${c.toUpperCase()} 〕\n`;
                for (const x of cmds) {
                    menu += `│ ✧ ${p}${x.cmd} » ${x.desc}\n`;
                }
                menu += `└──────────────\n\n`;
            }

            const bannerAll = banners['main'] || mainBanner;

            return await sock.sendMessage(chat, {
                image: bannerAll? { url: bannerAll } : undefined,
                caption: menu,
                title: '｡･:*˚:✧｡ ♡ AKAME-MD COMPLETO ♡ ｡✧:˚*･｡',
                subtitle: `${tot} comandos ordenados`,
                footer: 'By GUS',
                interactiveButtons: [
                    { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '🏠 Volver al menú', id: `${p}menu` }) },
                    { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '👑 Owner', id: `${p}owner` }) }
                ]
            }, { quoted: msg });
        }

        // MENU PRINCIPAL
        const hora = new Date().toLocaleTimeString();
        const rows = [
            { title: '📋 Menu completo', description: `Ver los ${tot} comandos`, id: `${p}menu all` },
          ...scats.map(c => ({ title: `${emojis[c] || '♡'} ${c.toUpperCase()} [${cats.get(c)!.length}]`, description: `Ver comandos de ${c}`, id: `${p}menu ${c}` }))
        ];

        await sock.sendMessage(chat, {
            image: mainBanner? { url: mainBanner } : undefined,
            caption: `┌─〔 MENU PRINCIPAL 〕\n│ ✧ Bot: ${config.botName}\n│ ✧ Creador: 亗 GUS 亗\n│ ✧ Hora: ${hora}\n│ ✧ Comandos: ${tot}\n│ ✧ Prefijo: ${p}\n└─ Selecciona una categoría abajo`,
            title: '｡･:*˚:✧｡ ♡ AKAME-MD ♡ ｡✧:˚*･｡',
            subtitle: 'Sistema interactivo',
            footer: 'By GUS',
            interactiveButtons: [
                { name: 'single_select', buttonParamsJson: JSON.stringify({ title: 'Ver Categorías', sections: [{ title: 'Categorías', highlight_label: 'AKAME', rows: rows }] }) },
                { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '👑 Owner', id: `${p}owner` }) }
            ]
        }, { quoted: msg });
    }
};