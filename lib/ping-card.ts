import { join } from 'node:path';
import { readFileSync } from 'node:fs';

// @napi-rs/canvas se carga sólo al generar la tarjeta: si el binario falla (p. ej. Termux),
// el comando sigue funcionando con texto.
type Canvas = typeof import('@napi-rs/canvas');
let canvasMod: Canvas | null = null;
const cargarCanvas = async (): Promise<Canvas> => (canvasMod ??= await import('@napi-rs/canvas'));

const FONTS_DIR = join(process.cwd(), 'assets', 'fonts');
const BANNER = join(process.cwd(), 'img', 'akame-banner.png');
let fuenteLista = false;

const cargarFuentes = (GlobalFonts: Canvas['GlobalFonts']) => {
    if (fuenteLista) return;
    try {
        GlobalFonts.registerFromPath(join(FONTS_DIR, 'DejaVuSans.ttf'), 'AkameSans');
        GlobalFonts.registerFromPath(join(FONTS_DIR, 'DejaVuSans-Bold.ttf'), 'AkameSansBold');
    } catch {
        // si no están las fuentes, canvas usa la predeterminada
    }
    fuenteLista = true;
};

const rectRedondeado = (ctx: any, x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
};

const formatoTiempo = (seg: number) => {
    const d = Math.floor(seg / 86400);
    const h = Math.floor((seg % 86400) / 3600);
    const m = Math.floor((seg % 3600) / 60);
    const s = Math.floor(seg % 60);
    return d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
};

export interface PingCardData {
    latencia: number;     // ms
    nombre: string;       // nombre del bot
}

/** Tarjeta estilo panel (dashboard) con fondo de Akame y estadísticas en vivo. */
export const generarPingCard = async (d: PingCardData): Promise<Buffer> => {
    const { createCanvas, GlobalFonts, loadImage } = await cargarCanvas();
    cargarFuentes(GlobalFonts);

    const W = 1000, H = 560;
    const canvas = createCanvas(W, H);
    const ctx: any = canvas.getContext('2d');

    // Fondo: Akame difuminado y oscurecido
    try {
        const fondo = await loadImage(readFileSync(BANNER));
        const escala = Math.max(W / fondo.width, H / fondo.height);
        const fw = fondo.width * escala, fh = fondo.height * escala;
        ctx.drawImage(fondo, (W - fw) / 2, (H - fh) / 2, fw, fh);
    } catch {
        ctx.fillStyle = '#12061c';
        ctx.fillRect(0, 0, W, H);
    }
    const velo = ctx.createLinearGradient(0, 0, 0, H);
    velo.addColorStop(0, 'rgba(10,4,20,0.55)');
    velo.addColorStop(1, 'rgba(10,4,20,0.88)');
    ctx.fillStyle = velo;
    ctx.fillRect(0, 0, W, H);

    // Título
    const bold = 'AkameSansBold, sans-serif';
    const normal = 'AkameSans, sans-serif';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ff4d6d';
    ctx.font = `bold 58px ${bold}`;
    ctx.fillText(d.nombre.toUpperCase(), 60, 110);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = `28px ${normal}`;
    ctx.fillText('Estado del bot · en vivo', 62, 152);

    // Estado (píldora)
    rectRedondeado(ctx, W - 250, 70, 190, 52, 26);
    ctx.fillStyle = 'rgba(46,204,113,0.22)';
    ctx.fill();
    ctx.strokeStyle = '#2ecc71';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#2ecc71';
    ctx.beginPath();
    ctx.arc(W - 225, 96, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = `bold 24px ${bold}`;
    ctx.fillText('ONLINE', W - 205, 105);

    // Tarjetas de estadísticas
    const memoria = process.memoryUsage().rss / 1024 / 1024;
    const stats = [
        { titulo: 'LATENCIA', valor: `${d.latencia} ms`, color: '#ff4d6d' },
        { titulo: 'ACTIVO', valor: formatoTiempo(process.uptime()), color: '#b388ff' },
        { titulo: 'MEMORIA', valor: `${memoria.toFixed(0)} MB`, color: '#4dd0e1' },
        { titulo: 'NODE', valor: process.versions.node, color: '#ffd166' }
    ];
    const cw = 215, gap = 20, x0 = 60, y0 = 220, ch = 150;
    stats.forEach((s, i) => {
        const x = x0 + i * (cw + gap);
        rectRedondeado(ctx, x, y0, cw, ch, 22);
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fill();
        ctx.strokeStyle = s.color;
        ctx.globalAlpha = 0.7;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = s.color;
        ctx.font = `bold 22px ${bold}`;
        ctx.fillText(s.titulo, x + 22, y0 + 46);
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold 36px ${bold}`;
        ctx.fillText(s.valor, x + 22, y0 + 108);
    });

    // Barra de latencia (0 a 500 ms)
    const barraY = 420, barraW = W - 120;
    rectRedondeado(ctx, 60, barraY, barraW, 22, 11);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fill();
    const llena = Math.max(12, Math.min(barraW, (d.latencia / 500) * barraW));
    rectRedondeado(ctx, 60, barraY, llena, 22, 11);
    const grad = ctx.createLinearGradient(60, 0, 60 + barraW, 0);
    grad.addColorStop(0, '#2ecc71');
    grad.addColorStop(0.5, '#ffd166');
    grad.addColorStop(1, '#ff4d6d');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = `22px ${normal}`;
    ctx.fillText('Velocidad de respuesta', 60, barraY - 14);

    // Pie
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = `22px ${normal}`;
    ctx.fillText('✿ AKAME-MD · pong', 60, 510);

    return canvas.toBuffer('image/png');
};
