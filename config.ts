import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';

const ownerNumbers = new Set([
    '51926519334',
    '523319164806',
    '5491128178894'
]);

// API STELLAR - Principal
global.api = {
  url: 'https://api.stellarwa.xyz',
  key: 'proyectsV2'
}

// APIS QUE FUNCIONAN (probadas). Las que no respondían se quitaron.
global.APIs = {
  melody: { url: 'https://api.melodiaauris.qzz.io', key: 'OguriCap-Bot' },
  anabot: { url: 'https://anabot.my.id', key: 'freeApikey' },
  delirius: { url: 'https://api.delirius.online', key: null },
  stellar: { url: 'https://api.stellarwa.xyz', key: 'proyectsV2' },
  siputzx: { url: 'https://api.siputzx.my.id', key: null },
  evogb: { url: 'https://api.evogb.org', key: process.env.EVOGB_KEY || 'putostodos' },
  yosoyyo: { url: 'https://api-yosoyyo-api-ofc.onrender.com', key: process.env.YOSOYYO_KEY || null },
  starlights: { url: 'https://apis-starlights-team.koyeb.app/starlight', key: null },
  popcat: { url: 'https://api.popcat.xyz/v2', key: null }
}

export const config = {
    botName: 'AKAME-MD',
    devName: 'LORD GUS',
    prefix: '.',
    owner: ownerNumbers,
    banner: 'https://cdn.dix.lat/me/q2se_20261008-r2x1-0f9o-f489.jpg',
    icon: 'https://cdn.dix.lat/me/q2se_20261008-r2x1-0f9o-f489.jpg',
    coin: 'coins',

    // API Principal 
    api: {
      url: 'https://api.stellarwa.xyz',
      key: 'proyectsV2'
    },

    // BANNERS POR CATEGORIA
    banners: {
        main: 'https://cdn.dix.lat/me/g31n_20260927-c91x-glg3-4178.jpg',
        info: 'https://cdn.dix.lat/me/h7xu_20260927-c91x-2x9p-d0ab.jpg',
        download: 'https://cdn.dix.lat/me/c8a7_20260927-c91x-xs62-7697.jpg',
        profile: 'https://cdn.dix.lat/me/ellu_20260927-c91x-gnxo-633a.png',
        admin: 'https://u.pone.rs/djdhfkyy.jpg',
        stickers: 'https://u.pone.rs/djdhfkyy.jpg',
        tools: 'https://u.pone.rs/djdhfkyy.jpg',
        utils: 'https://u.pone.rs/djdhfkyy.jpg',
        fun: 'https://u.pone.rs/djdhfkyy.jpg',
        game: 'https://u.pone.rs/djdhfkyy.jpg',
        economy: 'https://u.pone.rs/djdhfkyy.jpg',
        gacha: 'https://u.pone.rs/djdhfkyy.jpg',
        anime: 'https://u.pone.rs/djdhfkyy.jpg',
        nsfw: 'https://u.pone.rs/djdhfkyy.jpg',
        otros: 'https://cdn.dix.lat/me/q2se_20261008-r2x1-0f9o-f489.jpg',
        logo: 'https://cdn.dix.lat/me/q2se_20261008-r2x1-0f9o-f489.jpg'
    }
};

const __filename = fileURLToPath(import.meta.url);

fs.watchFile(__filename, () => {
    fs.unwatchFile(__filename);
    console.log(chalk.gray(`Updated ${path.basename(__filename)}`));
    import(`${import.meta.url}?update=${Date.now()}`);
});

export default config;
