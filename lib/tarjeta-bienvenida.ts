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

export interface TarjetaBienvenidaData {
    tipo: 'add' | 'remove';
    nombre: string;        // número o nombre de la persona
    grupo: string;
    miembros: number;
    foto: Buffer | null;   // foto de perfil, si la hay
}

/** Tarjeta de bienvenida o despedida: fondo de Akame, foto circular a la izquierda y textos. */
export const generarTarjetaBienvenida = async (d: TarjetaBienvenidaData): Promise<Buffer> => {
    cargarFuentes();
    const W = 1000;
    const H = 420;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d') as any;

    // Fondo: banner de Akame cubriendo todo el lienzo
    const banner = await loadImage(readFileSync(BANNER));
    const escala = Math.max(W / banner.width, H / banner.height);
    const bw = banner.width * escala;
    const bh = banner.height * escala;
    ctx.drawImage(banner, (W - bw) / 2, (H - bh) / 2, bw, bh);

    // Velo oscuro a la izquierda para que se lean los textos
    const velo = ctx.createLinearGradient(0, 0, W, 0);
    velo.addColorStop(0, 'rgba(8, 6, 14, 0.92)');
    velo.addColorStop(0.5, 'rgba(8, 6, 14, 0.82)');
    velo.addColorStop(0.7, 'rgba(8, 6, 14, 0.55)');
    velo.addColorStop(1, 'rgba(8, 6, 14, 0.15)');
    ctx.fillStyle = velo;
    ctx.fillRect(0, 0, W, H);

    // Foto circular con borde rojo brillante
    const cx = 210;
    const cy = H / 2;
    const r = 115;

    // Resplandor
    const glow = ctx.createRadialGradient(cx, cy, r - 10, cx, cy, r + 40);
    glow.addColorStop(0, 'rgba(220, 30, 60, 0.6)');
    glow.addColorStop(1, 'rgba(220, 30, 60, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 40, 0, Math.PI * 2);
    ctx.fill();

    // Aro
    ctx.fillStyle = '#e0234e';
    ctx.beginPath();
    ctx.arc(cx, cy, r + 8, 0, Math.PI * 2);
    ctx.fill();

    // Contenido del círculo: foto o inicial
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    if (d.foto) {
        try {
            const pic = await loadImage(d.foto);
            const s = Math.max((2 * r) / pic.width, (2 * r) / pic.height);
            ctx.drawImage(pic, cx - (pic.width * s) / 2, cy - (pic.height * s) / 2, pic.width * s, pic.height * s);
        } catch {
            d.foto = null;
        }
    }
    if (!d.foto) {
        const fondo = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
        fondo.addColorStop(0, '#2a0f3a');
        fondo.addColorStop(1, '#6b1530');
        ctx.fillStyle = fondo;
        ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `bold 120px ${fuenteLista ? 'AkameSansBold' : 'sans-serif'}`;
        ctx.fillText('?', cx, cy + 6);
    }
    ctx.restore();

    // Textos
    const xTexto = 370;
    const maxAncho = W - xTexto - 40;
    const bold = (t: number) => `bold ${t}px ${fuenteLista ? 'AkameSansBold' : 'sans-serif'}`;
    const normal = (t: number) => `${t}px ${fuenteLista ? 'AkameSans' : 'sans-serif'}`;

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    const esAdd = d.tipo === 'add';
    ctx.fillStyle = '#ff5c7a';
    ctx.font = bold(26);
    ctx.fillText(esAdd ? '✦ BIENVENIDO/A ✦' : '✦ HASTA PRONTO ✦', xTexto, 130);

    ctx.fillStyle = '#ffffff';
    ctx.font = bold(52);
    ctx.fillText(recortarTexto(ctx, d.nombre, maxAncho), xTexto, 200);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = normal(28);
    ctx.fillText(recortarTexto(ctx, `al grupo ${d.grupo}`, maxAncho), xTexto, 245);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = normal(24);
    ctx.fillText(`Miembros: ${d.miembros}`, xTexto, 292);

    ctx.fillStyle = '#e7c6ff';
    ctx.font = bold(22);
    ctx.fillText(esAdd ? 'Disfruta tu estadía' : 'Nunca te quisimos igual', xTexto, 350);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.font = normal(18);
    ctx.fillText('AKAME-MD', xTexto, 392);

    return canvas.encode('png');
};
