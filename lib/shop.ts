/**
 * Catálogo de la tienda y efectos del inventario.
 *
 * El inventario guarda dos formas de valor y ambas conviven:
 *   - número  -> cantidad de un item coleccionable (los peces de fish.ts, la caza)
 *   - objeto  -> { expiresAt } de un efecto con duración (los items de la tienda)
 *
 * Todo lo que toca el inventario debería pasar por estas funciones para no
 * confundir una forma con la otra.
 */

export type InventoryValue = number | { expiresAt: number };
export type Inventory = Record<string, InventoryValue>;

export interface ShopItem {
    id: string;
    emoji: string;
    name: string;
    price: number;
    /** 'buff' aplica el efecto al instante con duración; 'item' solo se guarda. */
    kind: 'buff' | 'item';
    /** Duración del efecto en ms (solo kind 'buff'). */
    ms?: number;
    effect: string;
}

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

export const COINBOOST_BONUS = 2;
export const ENERGY_CD_FACTOR = 0.5;
export const LUCK_BONUS = 0.15;
export const CRIME_PENALTY_FACTOR = 0.5;
/** Multiplicador base de TODAS las ganancias de economía (2 = el doble). Cámbialo aquí. */
export const GANANCIA_BASE = 2;

export const SHOP_ITEMS: ShopItem[] = [
    {
        id: 'coinboost', emoji: '⚡', name: 'Coinboost', price: 5000, kind: 'buff', ms: HOUR,
        effect: 'Ganas el doble de coins al trabajar, minar, pescar, cazar, en el daily y en crímenes'
    },
    {
        id: 'robprotect', emoji: '🛡️', name: 'Escudo antirrobo', price: 3000, kind: 'buff', ms: HOUR,
        effect: 'Nadie puede robarte coins mientras dure'
    },
    {
        id: 'energy', emoji: '🥤', name: 'Bebida energética', price: 1500, kind: 'buff', ms: 30 * MIN,
        effect: 'Los cooldowns de work, mine, fish, cazar y crime duran la mitad'
    },
    {
        id: 'luck', emoji: '🍀', name: 'Trébol de la suerte', price: 4000, kind: 'buff', ms: 30 * MIN,
        effect: '+15% de éxito en robos, crímenes y mazmorras, y una tirada extra en slots'
    },
    {
        id: 'safe', emoji: '🔒', name: 'Caja fuerte', price: 6000, kind: 'buff', ms: 2 * HOUR,
        effect: 'Si te atrapan en un crimen o mazmorra, pierdes la mitad'
    },
    {
        id: 'amulet', emoji: '🧿', name: 'Amuleto', price: 8000, kind: 'item',
        effect: 'Amuleto de colección, no se gasta'
    }
];

export const ITEM_BY_ID: Record<string, ShopItem> = Object.fromEntries(SHOP_ITEMS.map((i) => [i.id, i]));

export const ensureInventory = (user: any): Inventory => {
    if (!user || typeof user !== 'object') return {};
    if (!user.inventory || typeof user.inventory !== 'object' || Array.isArray(user.inventory)) user.inventory = {};
    return user.inventory as Inventory;
};

const isEntry = (v: InventoryValue): v is { expiresAt: number } =>
    typeof v === 'object' && v !== null && typeof (v as any).expiresAt === 'number';

/** Devuelve los ms restantes de un buff activo, o 0 si no lo tiene / ya expiró. */
export const buffRemaining = (user: any, id: string): number => {
    const inv = ensureInventory(user);
    const v = inv[id];
    if (!isEntry(v)) return 0;
    const left = v.expiresAt - Date.now();
    if (left <= 0) {
        delete inv[id];
        return 0;
    }
    return left;
};

export const isBuffActive = (user: any, id: string): boolean => buffRemaining(user, id) > 0;

/** Cuántas unidades de un item coleccionable tiene. */
export const countOf = (user: any, id: string): number => {
    const v = ensureInventory(user)[id];
    return typeof v === 'number' ? v : 0;
};

/** Aplica un item de la tienda: los buff se consumen y arrancan su efecto. */
export const applyShopItem = (user: any, item: ShopItem): { expiresAt?: number } => {
    const inv = ensureInventory(user);
    if (item.kind === 'buff' && item.ms) {
        const base = Math.max(buffRemaining(user, item.id), 0);
        const expiresAt = Date.now() + base + item.ms;
        inv[item.id] = { expiresAt };
        return { expiresAt };
    }
    inv[item.id] = countOf(user, item.id) + 1;
    return {};
};

export const formatDuration = (ms: number): string => {
    if (ms <= 0) return '0s';
    const h = Math.floor(ms / HOUR);
    const m = Math.floor((ms % HOUR) / MIN);
    const s = Math.floor((ms % MIN) / 1000);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
};

/** Multiplicador de coins según si tiene coinboost activo. */
export const coinMultiplier = (user: any): number => (isBuffActive(user, 'coinboost') ? COINBOOST_BONUS : 1);

/** Cooldown efectivo según si tiene bebida energética activa. */
export const effectiveCooldown = (user: any, baseMs: number): number =>
    isBuffActive(user, 'energy') ? Math.floor(baseMs * ENERGY_CD_FACTOR) : baseMs;

/** Sube una probabilidad de éxito sin pasarse de 0.95. */
export const luckBoost = (user: any, chance: number): number =>
    isBuffActive(user, 'luck') ? Math.min(0.95, chance + LUCK_BONUS) : chance;

/** Reduce una penalización si tiene caja fuerte activa. */
export const softenPenalty = (user: any, loss: number): number =>
    isBuffActive(user, 'safe') ? Math.floor(loss * CRIME_PENALTY_FACTOR) : loss;

/** Bloquea el robo si la víctima tiene escudo activo. */
export const hasRobShield = (user: any): boolean => isBuffActive(user, 'robprotect');

/** Línea con los efectos activos, para mostrar al final de los comandos. */
export const activeEffectsLine = (user: any): string => {
    const activos = SHOP_ITEMS.filter((i) => i.kind === 'buff' && isBuffActive(user, i.id));
    if (!activos.length) return '';
    return `\n> ${activos.map((i) => `${i.emoji} ${formatDuration(buffRemaining(user, i.id))}`).join('  ')}`;
};

/* ---- Helpers de diseño y apuestas para los juegos de economía ---- */

/** Encabezado con el mismo estilo de .bal, waifus y Pokémon. */
export const titulo = (t: string): string => `˚₊· ͟͟͞͞➳❥ *${t}* ✦`;

/** Número con separador de miles en formato peruano. */
export const money = (n: number): string => Math.floor(Number(n) || 0).toLocaleString('es-PE');

const soloDigitos = (x: string): string => String(x).split('@')[0].split(':').pop()?.replace(/[^\d]/g, '') || '';

/** Busca la cuenta de economía del usuario en el grupo (la crea si no existe). */
export const ecoUser = (chat: string, jid: string): any => {
    const db = (globalThis as any).db?.data;
    if (!db) return null;
    if (!db.chats) db.chats = {};
    if (!db.chats[chat]) db.chats[chat] = {};
    const users = db.chats[chat].users || (db.chats[chat].users = {});
    let u = users[jid];
    if (!u) {
        const num = soloDigitos(jid);
        for (const [k, v] of Object.entries(users)) {
            if (soloDigitos(k) === num) { u = v; break; }
        }
    }
    if (!u) u = users[jid] = { coins: 0, bank: 0 };
    return u;
};

/** true si el grupo está en modo solo administradores (los juegos de economía se bloquean). */
export const bloqueadoPorAdmin = (chat: string): boolean =>
    !!(globalThis as any).db?.data?.chats?.[chat]?.adminonly;

/** Valida una apuesta. Acepta un número o `all` / `todo` para apostar todo el efectivo. */
export const parseApuesta = (raw: string | undefined, saldo: number, min = 200): { bet: number } | { error: string } => {
    const s = String(raw || '').toLowerCase().trim();
    if (!s) return { error: 'Indica cuánto quieres apostar (o *all* para todo).' };
    const bet = ['all', 'todo', 'max'].includes(s) ? Math.floor(saldo) : Math.floor(Number(s.replace(/[^\d]/g, '')));
    if (!bet || bet <= 0) return { error: 'La cantidad no es válida.' };
    if (bet > saldo) return { error: `No tienes suficiente efectivo. Tienes *${money(saldo)}*.` };
    if (bet < min) return { error: `La apuesta mínima es *${money(min)}*.` };
    return { bet };
};
