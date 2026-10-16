/**
 * Stellar Labs: API de respaldo para varios comandos.
 * Usa la clave que sí responde (la misma de TikTok y waifu).
 */
export const STELLAR_URL = 'https://api.stellarwa.xyz';
export const STELLAR_KEY = 'proyectsV2';

/** Arma la URL de un endpoint de Stellar con sus parámetros y la clave. */
export const stellarUrl = (ruta: string, params: Record<string, string>): string => {
    const q = new URLSearchParams({ ...params, apikey: STELLAR_KEY }).toString();
    return `${STELLAR_URL}${ruta}?${q}`;
};
