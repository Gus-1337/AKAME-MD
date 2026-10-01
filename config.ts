import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';

const ownerNumbers = new Set([
    '51926519334',
    '523319164806',
    '5491128178894'
]);

export const config = {
    botName: 'AKAME-MD',
    devName: 'LORD GUS',
    prefix: '.',
    owner: ownerNumbers,
    banner: 'https://u.pone.rs/djdhfkyy.jpg',
    icon: 'https://u.pone.rs/djdhfkyy.jpg',
    coin: '¥enes',

    // BANNERS POR CATEGORIA - CAMBIA LAS URLS POR LAS QUE QUIERAS
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
        otros: 'https://u.pone.rs/djdhfkyy.jpg',
        logo: 'https://u.pone.rs/djdhfkyy.jpg'
    }
};

const __filename = fileURLToPath(import.meta.url);

fs.watchFile(__filename, () => {
    fs.unwatchFile(__filename);
    console.log(chalk.gray(`Updated ${path.basename(__filename)}`));
    import(`${import.meta.url}?update=${Date.now()}`);
});

export default config;