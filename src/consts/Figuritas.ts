// Álbum de figuritas coleccionables — Temporada 1
// Catálogo en código: cada figurita tiene un `id` único estable.
// Las imágenes viven en el CDN: https://cdn.saltouruguayserver.com/album/s1/{id}.png

export type FiguritaTier = 'comun' | 'rara' | 'epica' | 'legendaria';
export type PackTier = 'comun' | 'raro' | 'epico' | 'legendario';
export type PackSource = 'stream_drop' | 'purchase';

export interface Figurita {
    id: number;
    nombre: string;
    imagen: string;
    tier: FiguritaTier;
    season: string;
}

const CDN = 'https://cdn.saltouruguayserver.com/album/s1';
const img = (id: number) => `${CDN}/${String(id).padStart(3, '0')}.png`;

export const ALBUM_SEASON = 's1';

export const FIGURITAS: Figurita[] = [
    // ── Comunes (22) ──
    { id: 1, nombre: 'Salto Inicial', imagen: img(1), tier: 'comun', season: 's1' },
    { id: 2, nombre: 'Mate Amargo', imagen: img(2), tier: 'comun', season: 's1' },
    { id: 3, nombre: 'Costanera', imagen: img(3), tier: 'comun', season: 's1' },
    { id: 4, nombre: 'Chivito Clásico', imagen: img(4), tier: 'comun', season: 's1' },
    { id: 5, nombre: 'Tero Gritón', imagen: img(5), tier: 'comun', season: 's1' },
    { id: 6, nombre: 'Parrilla Humilde', imagen: img(6), tier: 'comun', season: 's1' },
    { id: 7, nombre: 'Chat Tóxico', imagen: img(7), tier: 'comun', season: 's1' },
    { id: 8, nombre: 'Mod Dormido', imagen: img(8), tier: 'comun', season: 's1' },
    { id: 9, nombre: 'Lurk Silencioso', imagen: img(9), tier: 'comun', season: 's1' },
    { id: 10, nombre: 'F en el Chat', imagen: img(10), tier: 'comun', season: 's1' },
    { id: 11, nombre: 'Río Uruguay', imagen: img(11), tier: 'comun', season: 's1' },
    { id: 12, nombre: 'Termas Daymán', imagen: img(12), tier: 'comun', season: 's1' },
    { id: 13, nombre: 'Torta Frita', imagen: img(13), tier: 'comun', season: 's1' },
    { id: 14, nombre: 'Ómnibus Tardío', imagen: img(14), tier: 'comun', season: 's1' },
    { id: 15, nombre: 'Pelota de Trapo', imagen: img(15), tier: 'comun', season: 's1' },
    { id: 16, nombre: 'Gaucho Rookie', imagen: img(16), tier: 'comun', season: 's1' },
    { id: 17, nombre: 'Emote Básico', imagen: img(17), tier: 'comun', season: 's1' },
    { id: 18, nombre: 'Clip Olvidado', imagen: img(18), tier: 'comun', season: 's1' },
    { id: 19, nombre: 'Hydrate Bot', imagen: img(19), tier: 'comun', season: 's1' },
    { id: 20, nombre: 'Raid Pequeña', imagen: img(20), tier: 'comun', season: 's1' },
    { id: 21, nombre: 'Cebador Novato', imagen: img(21), tier: 'comun', season: 's1' },
    { id: 22, nombre: 'Noche de Truco', imagen: img(22), tier: 'comun', season: 's1' },
    // ── Raras (10) ──
    { id: 23, nombre: 'Asado Legendario', imagen: img(23), tier: 'rara', season: 's1' },
    { id: 24, nombre: 'Hype Train', imagen: img(24), tier: 'rara', season: 's1' },
    { id: 25, nombre: 'Raid Masiva', imagen: img(25), tier: 'rara', season: 's1' },
    { id: 26, nombre: 'Cotorra Parlante', imagen: img(26), tier: 'rara', season: 's1' },
    { id: 27, nombre: 'Candombe Eléctrico', imagen: img(27), tier: 'rara', season: 's1' },
    { id: 28, nombre: 'Moderador Relámpago', imagen: img(28), tier: 'rara', season: 's1' },
    { id: 29, nombre: 'Clip Viral', imagen: img(29), tier: 'rara', season: 's1' },
    { id: 30, nombre: 'Duelo de Payadas', imagen: img(30), tier: 'rara', season: 's1' },
    { id: 31, nombre: 'Salto de Noche', imagen: img(31), tier: 'rara', season: 's1' },
    { id: 32, nombre: 'Mascota Saltana', imagen: img(32), tier: 'rara', season: 's1' },
    // ── Épicas (6) ──
    { id: 33, nombre: 'Corona del Chat', imagen: img(33), tier: 'epica', season: 's1' },
    { id: 34, nombre: 'Takis Dorados', imagen: img(34), tier: 'epica', season: 's1' },
    { id: 35, nombre: 'Camiseta Celeste', imagen: img(35), tier: 'epica', season: 's1' },
    { id: 36, nombre: 'Represa Rechinante', imagen: img(36), tier: 'epica', season: 's1' },
    { id: 37, nombre: 'Fundador Olvidado', imagen: img(37), tier: 'epica', season: 's1' },
    { id: 38, nombre: 'Ruleta En llamas', imagen: img(38), tier: 'epica', season: 's1' },
    // ── Legendarias (2) ──
    { id: 39, nombre: 'El Salto Dorado', imagen: img(39), tier: 'legendaria', season: 's1' },
    { id: 40, nombre: 'Alexitoo Prime', imagen: img(40), tier: 'legendaria', season: 's1' },
];

export const FIGURITA_MAP: Map<number, Figurita> = new Map(FIGURITAS.map((f) => [f.id, f]));

export const FIGURITAS_POR_TIER: Record<FiguritaTier, Figurita[]> = {
    comun: FIGURITAS.filter((f) => f.tier === 'comun'),
    rara: FIGURITAS.filter((f) => f.tier === 'rara'),
    epica: FIGURITAS.filter((f) => f.tier === 'epica'),
    legendaria: FIGURITAS.filter((f) => f.tier === 'legendaria'),
};

// Probabilidad de cada rareza de carta según el tier del sobre (suma 100)
export const PACK_ODDS: Record<PackTier, Record<FiguritaTier, number>> = {
    comun: { comun: 70, rara: 22, epica: 7, legendaria: 1 },
    raro: { comun: 45, rara: 35, epica: 16, legendaria: 4 },
    epico: { comun: 20, rara: 40, epica: 30, legendaria: 10 },
    legendario: { comun: 0, rara: 35, epica: 45, legendaria: 20 },
};

// Peso del sorteo del sobre gratis del directo (qué tier de sobre toca)
export const PACK_TIER_WEIGHTS: Record<PackTier, number> = {
    comun: 60,
    raro: 25,
    epico: 12,
    legendario: 3,
};

export const PACK_PRICES: Record<PackTier, number> = {
    comun: 50,
    raro: 120,
    epico: 300,
    legendario: 800,
};

// 4 cartas por sobre: 3 sorteos ponderados + 1 slot bonus con piso según tier
export const PACK_SIZE = 4;

export const TIER_META: Record<FiguritaTier, { label: string; color: string; glow: string }> = {
    comun: { label: 'Común', color: 'text-zinc-300', glow: 'border-zinc-500/40' },
    rara: { label: 'Rara', color: 'text-sky-300', glow: 'border-sky-400/50 shadow-sky-500/20' },
    epica: { label: 'Épica', color: 'text-fuchsia-300', glow: 'border-fuchsia-400/60 shadow-fuchsia-500/25' },
    legendaria: { label: 'Legendaria', color: 'text-amber-300', glow: 'border-amber-400/70 shadow-amber-500/30' },
};

export const PACK_TIER_META: Record<PackTier, { label: string; color: string }> = {
    comun: { label: 'Sobre Común', color: 'text-zinc-300' },
    raro: { label: 'Sobre Raro', color: 'text-sky-300' },
    epico: { label: 'Sobre Épico', color: 'text-fuchsia-300' },
    legendario: { label: 'Sobre Legendario', color: 'text-amber-300' },
};
