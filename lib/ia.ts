import axios from 'axios';
import { stellarUrl } from './stellar.ts';

/** Un proveedor de IA: recibe el prompt y devuelve el texto de la respuesta. */
export type Proveedor = { nombre: string; pedir: (prompt: string) => Promise<string> };

const TIMEOUT = 60000;
const UA = { 'User-Agent': 'Mozilla/5.0' };

/** Quita el bloque de razonamiento <think>...</think> de modelos como DeepSeek R1. */
export const limpiarRazonamiento = (t: string) =>
    t.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/<think>[\s\S]*/gi, '').trim();

/** Prompt que pide respuesta completa (no corta) en español. */
export const promptCompleto = (pregunta: string) =>
    `Responde en español, de forma completa y detallada, sin cortar la respuesta: ${pregunta}`;

/**
 * Consulta todos los proveedores a la vez y devuelve la primera respuesta válida.
 * Así, si uno está caído o lento, responde otro.
 */
export async function preguntarIA(proveedores: Proveedor[], prompt: string): Promise<{ texto: string; fuente: string }> {
    return Promise.any(
        proveedores.map(async (p) => {
            const crudo = await p.pedir(prompt);
            const texto = limpiarRazonamiento(String(crudo || ''));
            if (!texto) throw new Error(`${p.nombre}: respuesta vacía`);
            return { texto, fuente: p.nombre };
        })
    );
}

/** Divide un texto largo en partes de hasta `max` caracteres, cortando en párrafos o frases. */
export function dividirTexto(texto: string, max = 3500, maxPartes = 5): string[] {
    const partes: string[] = [];
    let resto = texto.trim();
    while (resto.length > max && partes.length < maxPartes - 1) {
        let corte = resto.lastIndexOf('\n\n', max);
        if (corte < max * 0.5) corte = resto.lastIndexOf('. ', max);
        if (corte < max * 0.5) corte = max;
        partes.push(resto.slice(0, corte).trim());
        resto = resto.slice(corte).trim();
    }
    if (resto) partes.push(resto);
    return partes;
}

/** Envía la respuesta completa, en varios mensajes si es larga. */
export async function enviarRespuesta(sock: any, chat: string, m: any, titulo: string, texto: string) {
    const partes = dividirTexto(texto);
    for (let i = 0; i < partes.length; i++) {
        const cuerpo = i === 0 ? `${titulo}\n\n${partes[i]}` : partes[i];
        await sock.sendMessage(chat, { text: cuerpo }, i === 0 ? { quoted: m } : undefined);
    }
}

// ---------- Proveedores ----------

/** Delirius: ia/chatgpt (parámetro q). */
export const deliriusChatgpt: Proveedor = {
    nombre: 'delirius-chatgpt',
    pedir: async (prompt) => {
        const { data } = await axios.get('https://api.delirius.online/ia/chatgpt', { params: { q: prompt }, timeout: TIMEOUT, headers: UA });
        const r = typeof data?.data === 'string' ? data.data : data?.data?.result;
        if (!data?.status || !r) throw new Error('sin respuesta');
        return r;
    }
};

/** Delirius: ia/gemini (parámetro query). */
export const deliriusGemini: Proveedor = {
    nombre: 'delirius-gemini',
    pedir: async (prompt) => {
        const { data } = await axios.get('https://api.delirius.online/ia/gemini', { params: { query: prompt }, timeout: TIMEOUT, headers: UA });
        const r = typeof data?.data === 'string' ? data.data : data?.data?.result;
        if (!data?.status || !r) throw new Error('sin respuesta');
        return r;
    }
};

/** Delirius: ia/gptprompt (con instrucciones de sistema, para la personalidad de .ia). */
export const deliriusGptPrompt = (sistema: string): Proveedor => ({
    nombre: 'delirius-gptprompt',
    pedir: async (prompt) => {
        const { data } = await axios.get('https://api.delirius.online/ia/gptprompt', {
            params: { text: prompt, prompt: sistema },
            timeout: TIMEOUT,
            headers: UA
        });
        const r = data?.data || data?.result || data?.response;
        if (!r || typeof r !== 'string') throw new Error('sin respuesta');
        return r;
    }
});

/** Siputzx: /api/ai/<modelo> (parámetro prompt, respuesta en data.response). */
export const siputzx = (modelo: string): Proveedor => ({
    nombre: `siputzx-${modelo}`,
    pedir: async (prompt) => {
        const { data } = await axios.get(`https://api.siputzx.my.id/api/ai/${modelo}`, { params: { prompt }, timeout: TIMEOUT, headers: UA });
        const r = data?.data?.response;
        if (!data?.status || !r) throw new Error('sin respuesta');
        return String(r);
    }
});

/** yosoyyo: DeepSeek (parámetro prompt, respuesta en result.answer). */
export const yosoyyoDeepseek: Proveedor = {
    nombre: 'yosoyyo-deepseek',
    pedir: async (prompt) => {
        const key = process.env.YOSOYYO_KEY || 'Akame-proyet';
        const { data } = await axios.get('https://api-yosoyyo-api-ofc.onrender.com/api/deepseek', {
            params: { prompt, apiKey: key },
            timeout: TIMEOUT,
            headers: UA
        });
        const r = data?.result?.answer;
        if (!data?.status || !r) throw new Error('sin respuesta');
        return String(r);
    }
};

/** FAA: claude-ai (parámetro text, respuesta en result). */
export const faaClaude: Proveedor = {
    nombre: 'faa-claude',
    pedir: async (prompt) => {
        const { data } = await axios.get('https://api-faa.my.id/faa/claude-ai', { params: { text: prompt }, timeout: TIMEOUT, headers: UA });
        const r = data?.result;
        if (!data?.status || typeof r !== 'string') throw new Error('sin respuesta');
        return r;
    }
};

/** Stellar: ai/chatgpt (parámetro text). Respaldo de .chatgpt. */
export const stellarChatgpt: Proveedor = {
    nombre: 'stellar-chatgpt',
    pedir: async (prompt) => {
        const { data } = await axios.get(stellarUrl('/ai/chatgpt', { text: prompt }), { timeout: TIMEOUT, headers: UA });
        const r = typeof data?.result === 'string' ? data.result : '';
        if (!data?.status || !r) throw new Error('sin respuesta');
        return r;
    }
};

/** Stellar: ai/gemini (parámetro text). Respaldo de .gemini. */
export const stellarGemini: Proveedor = {
    nombre: 'stellar-gemini',
    pedir: async (prompt) => {
        const { data } = await axios.get(stellarUrl('/ai/gemini', { text: prompt }), { timeout: TIMEOUT, headers: UA });
        const r = typeof data?.response === 'string' ? data.response : '';
        if (!data?.status || !r) throw new Error('sin respuesta');
        return r;
    }
};
