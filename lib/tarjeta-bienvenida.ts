import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = process.cwd();
const FONTS_DIR = join(ROOT, 'assets', 'fonts');
const BANNER = join(ROOT, 'img', 'akame-banner.png');

let fuenteLista = false;
const cargarFuentes = () => {
    if (fuenteLista) return;
    try {
        GlobalFonts.registerFromPath(join(FONTS_DIR, 'DejaVuSans.ttf'), 'AkameSans');
        GlobalFonts.registerFromPath(join(FONTS_DIR, 'DejaVuSans-Bold.ttf'), 'AkameSansBold');
    } catch {
        // Si no carga, se usa la fuente del sistema.
    }
    fuenteLista = true;
};

const recortarTexto = (ctx: any, texto: string, maxAncho: number) => {
    let t = texto;
    while (t.length > 1 && ctx.measureText(t + '…').width > maxAncho) t = t.slice(0, -1);
    return t === texto ? t : t + '…';
};

const rectRedondeado = (ctx: any, x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
};

export interface TarjetaBienvenidaData {
    tipo: 'add' | 'remove';
    nombre: string;        // número o nombre de la persona
    grupo: string;
    miembros: number;
    foto: Buffer | null;   // foto de perfil, si la hay
}

/** Tarjeta de bienvenida o despedida: fondo de Akame, foto circular con anillo degradado y textos de colores. */
export const generarTarjetaBienvenida = async (d: TarjetaBienvenidaData): Promise<Buffer> => {
    cargarFuentes();
    const W = 1000;
    const H = 420;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d') as any;
    const sans = (t: number) => `${t}px ${fuenteLista ? 'AkameSans' : 'sans-serif'}`;
    const bold = (t: number) => `bold ${t}px ${fuenteLista ? 'AkameSansBold' : 'sans-serif'}`;

    // Fondo: banner de Akame cubriendo todo el lienzo
    const banner = await loadImage(readFileSync(BANNER));
    const escala = Math.max(W / banner.width, H / banner.height);
    const bw = banner.width * escala;
    const bh = banner.height * escala;
    ctx.drawImage(banner, (W - bw) / 2, (H - bh) / 2, bw, bh);

    // Velo oscuro con un toque morado a la izquierda
    const velo = ctx.createLinearGradient(0, 0, W, 0);
    velo.addColorStop(0, 'rgba(10, 4, 20, 0.94)');
    velo.addColorStop(0.5, 'rgba(14, 4, 28, 0.82)');
    velo.addColorStop(0.72, 'rgba(14, 4, 28, 0.5)');
    velo.addColorStop(1, 'rgba(14, 4, 28, 0.1)');
    ctx.fillStyle = velo;
    ctx.fillRect(0, 0, W, H);

    // Borde interior de color
    const marco = ctx.createLinearGradient(0, 0, W, H);
    marco.addColorStop(0, '#ff4d8d');
    marco.addColorStop(0.5, '#b76cff');
    marco.addColorStop(1, '#ff4d8d');
    ctx.strokeStyle = marco;
    ctx.lineWidth = 4;
    rectRedondeado(ctx, 12, 12, W - 24, H - 24, 26);
    ctx.stroke();

    // Foto circular con anillo degradado y resplandor
    const cx = 210;
    const cy = H / 2 - 4;
    const r = 110;

    const glow = ctx.createRadialGradient(cx, cy, r, cx, cy, r + 55);
    glow.addColorStop(0, 'rgba(255, 77, 141, 0.55)');
    glow.addColorStop(1, 'rgba(183, 108, 255, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 55, 0, Math.PI * 2);
    ctx.fill();

    const anillo = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    anillo.addColorStop(0, '#ff4d8d');
    anillo.addColorStop(1, '#b76cff');
    ctx.fillStyle = anillo;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    let fotoDibujada = false;
    if (d.foto) {
        try {
            const pic = await loadImage(d.foto);
            const s = Math.max((2 * r) / pic.width, (2 * r) / pic.height);
            ctx.drawImage(pic, cx - (pic.width * s) / 2, cy - (pic.height * s) / 2, pic.width * s, pic.height * s);
            fotoDibujada = true;
        } catch {
            fotoDibujada = false;
        }
    }
    if (!fotoDibujada) {
        const fondo = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
        fondo.addColorStop(0, '#3a0f4f');
        fondo.addColorStop(1, '#8a1a4a');
        ctx.fillStyle = fondo;
        ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
        ctx.fillStyle = '#ffd6e7';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = bold(120);
        ctx.fillText('?', cx, cy + 6);
    }
    ctx.restore();

    // Textos
    const xTexto = 370;
    const maxAncho = W - xTexto - 50;
    const esAdd = d.tipo === 'add';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    // Título con degradado y brillo
    const titulo = esAdd ? '✦ BIENVENIDO/A ✦' : '✿ HASTA PRONTO ✿';
    const tituloGrad = ctx.createLinearGradient(xTexto, 0, xTexto + 420, 0);
    tituloGrad.addColorStop(0, '#ff4d8d');
    tituloGrad.addColorStop(1, '#c9a0ff');
    ctx.save();
    ctx.shadowColor = 'rgba(255, 77, 141, 0.8)';
    ctx.shadowBlur = 14;
    ctx.fillStyle = tituloGrad;
    ctx.font = bold(28);
    ctx.fillText(titulo, xTexto, 128);
    ctx.restore();

    // Nombre con brillo
    ctx.save();
    ctx.shadowColor = 'rgba(183, 108, 255, 0.7)';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#ffffff';
    ctx.font = bold(50);
    ctx.fillText(recortarTexto(ctx, d.nombre, maxAncho), xTexto, 196);
    ctx.restore();

    // Separador degradado
    const sep = ctx.createLinearGradient(xTexto, 0, xTexto + 380, 0);
    sep.addColorStop(0, 'rgba(255, 77, 141, 0.9)');
    sep.addColorStop(1, 'rgba(183, 108, 255, 0)');
    ctx.fillStyle = sep;
    ctx.fillRect(xTexto, 216, 380, 3);

    // Grupo
    ctx.fillStyle = '#ffd6e7';
    ctx.font = sans(27);
    ctx.fillText(recortarTexto(ctx, `⋆ al grupo ${d.grupo} ⋆`, maxAncho), xTexto, 255);

    // Chip de miembros
    const chipTexto = `♡ ${d.miembros} miembros`;
    ctx.font = bold(22);
    const anchoChip = ctx.measureText(chipTexto).width + 36;
    ctx.fillStyle = 'rgba(183, 108, 255, 0.28)';
    rectRedondeado(ctx, xTexto, 282, anchoChip, 40, 20);
    ctx.fill();
    ctx.strokeStyle = 'rgba(183, 108, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#e7c6ff';
    ctx.fillText(chipTexto, xTexto + 18, 310);

    // Frase final
    ctx.fillStyle = '#ffffff';
    ctx.font = bold(23);
    ctx.fillText(esAdd ? '✧ Disfruta tu estadía' : '✧ Nunca te quisimos igual', xTexto, 368);

    // Pie
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = sans(17);
    ctx.fillText('AKAME-MD ✿', xTexto, 396);

    return canvas.encode('png');
};
