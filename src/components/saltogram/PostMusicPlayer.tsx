import { useState, useRef, useEffect } from "preact/hooks";
import WaveSurfer from "wavesurfer.js";

interface PostMusicPlayerProps {
    music: any;
}

function samplePixels(img: HTMLImageElement): [number, number, number] {
    const canvas = document.createElement("canvas");
    canvas.width = 40;
    canvas.height = 40;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, 40, 40);
    const d = ctx.getImageData(0, 0, 40, 40).data;
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < d.length; i += 12) {
        const sat = Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]);
        if (sat > 20) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
    }
    if (!n) return [120, 100, 160];
    return [r / n | 0, g / n | 0, b / n | 0];
}

function toOKLCH(r: number, g: number, b: number) {
    r /= 255; g /= 255; b /= 255;
    const lin = (x: number) => x > 0.04045 ? Math.pow((x + 0.055) / 1.055, 2.4) : x / 12.92;
    r = lin(r); g = lin(g); b = lin(b);
    const l = Math.cbrt(0.4122 * r + 0.5363 * g + 0.0514 * b);
    const m = Math.cbrt(0.2119 * r + 0.6807 * g + 0.1074 * b);
    const s = Math.cbrt(0.0883 * r + 0.2817 * g + 0.6300 * b);
    const L = 0.2104 * l + 0.7936 * m - 0.0040 * s;
    const a = 1.9779 * l - 2.4285 * m + 0.4506 * s;
    const bv = 0.0259 * l + 0.7827 * m - 0.8086 * s;
    return { L, C: Math.sqrt(a * a + bv * bv), H: ((Math.atan2(bv, a) * 180 / Math.PI) + 360) % 360 };
}

function oklchToRGB(L: number, C: number, H: number): [number, number, number] {
    const h = H * Math.PI / 180;
    const a = C * Math.cos(h), bv = C * Math.sin(h);
    const l = L + 0.3963 * a + 0.2158 * bv;
    const m = L - 0.1055 * a - 0.0638 * bv;
    const s = L - 0.0894 * a - 1.2914 * bv;
    const rl = l * l * l, rm = m * m * m, rs = s * s * s;
    const toS = (x: number) => Math.max(0, Math.min(255, ((x > 0.0031308 ? 1.055 * Math.pow(x, 1 / 2.4) - 0.055 : 12.92 * x) * 255) | 0));
    return [
        toS(+4.0767 * rl - 3.3077 * rm + 0.2310 * rs),
        toS(-1.2684 * rl + 2.6097 * rm - 0.3413 * rs),
        toS(-0.0041 * rl - 0.7034 * rm + 1.7076 * rs),
    ];
}

function toHex([r, g, b]: [number, number, number]) {
    return "#" + [r, g, b].map(x => x.toString(16).padStart(2, "0")).join("");
}

function toRGBA([r, g, b]: [number, number, number], a: number) {
    return `rgba(${r},${g},${b},${a})`;
}

interface Palette {
    surface: string;
    surfaceMid: string;
    primaryContainer: string;
    onPrimary: string;
    onSurface: string;
    onSurfaceVariant: string;
    waveProgress: string;
    waveBase: string;
    fabShadow: string;
}

function buildPalette(r: number, g: number, b: number): Palette {
    const { L, C, H } = toOKLCH(r, g, b);
    const c = Math.min(C, 0.16);
    const surface = oklchToRGB(0.18, c * 0.30, H);
    const surfaceMid = oklchToRGB(0.25, c * 0.35, H);
    const primaryCont = oklchToRGB(0.40, c * 0.90, H);
    const onPrimary = oklchToRGB(0.92, c * 0.45, H);
    const onSurface = oklchToRGB(0.93, c * 0.10, H);
    const onSurfaceVar = oklchToRGB(0.68, c * 0.22, H);
    const waveProgress = oklchToRGB(0.78, c * 0.85, H);

    return {
        surface: toHex(surface),
        surfaceMid: toRGBA(surfaceMid, 0.9),
        primaryContainer: toHex(primaryCont),
        onPrimary: toHex(onPrimary),
        onSurface: toHex(onSurface),
        onSurfaceVariant: toHex(onSurfaceVar),
        waveProgress: toHex(waveProgress),
        waveBase: toRGBA(waveProgress, 0.28),
        fabShadow: toRGBA(primaryCont, 0.45),
    };
}

export default function PostMusicPlayer({ music }: PostMusicPlayerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const wavesurferRef = useRef<any>(null);
    const albumImgRef = useRef<HTMLImageElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioUrl, setAudioUrl] = useState(music.preview);
    const [palette, setPalette] = useState<Palette | null>(null);

    // Refresh audio URL
    useEffect(() => {
        let active = true;
        if (music.id) {
            fetch(`/api/deezer/track?id=${music.id}`)
                .then(res => res.json())
                .then(data => {
                    if (active && data.preview && data.preview !== music.preview)
                        setAudioUrl(data.preview);
                })
                .catch(err => console.error("Error refreshing music URL:", err));
        }
        return () => { active = false; };
    }, [music]);

    // Extract palette from album art
    function handleImageLoad() {
        if (!albumImgRef.current) return;
        try {
            const [r, g, b] = samplePixels(albumImgRef.current);
            setPalette(buildPalette(r, g, b));
        } catch {
            setPalette(buildPalette(103, 80, 164));
        }
    }

    // Init WaveSurfer when audioUrl or palette changes
    useEffect(() => {
        if (!containerRef.current || !palette) return;

        wavesurferRef.current?.destroy();

        const ws = WaveSurfer.create({
            container: containerRef.current,
            waveColor: palette.waveBase,        // rgba hex — no CSS vars
            progressColor: palette.waveProgress, // hex — no CSS vars
            cursorColor: "white",
            cursorWidth: 2,
            barWidth: 2.5,
            barGap: 2,
            barRadius: 100,
            height: 28,
            normalize: true,
            url: audioUrl,
        });

        ws.on("play", () => setIsPlaying(true));
        ws.on("pause", () => setIsPlaying(false));
        ws.on("finish", () => setIsPlaying(false));

        wavesurferRef.current = ws;
        return () => { wavesurferRef.current?.destroy(); wavesurferRef.current = null; };
    }, [audioUrl, palette]);

    const togglePlay = () => wavesurferRef.current?.playPause();

    return (
        <div
            style={{
                borderRadius: 28,
                padding: 16,
                display: "flex",
                alignItems: "center",
                gap: 14,
                position: "relative",
                overflow: "hidden",
                background: palette?.surface ?? "#1a1a1f",
                boxShadow: palette ? `0 4px 24px ${palette.surface}cc` : "none",
                transition: "background 0.7s ease, box-shadow 0.7s ease",
            }}
        >
            {/* Radial tonal glow */}
            {palette && (
                <div
                    style={{
                        position: "absolute", inset: 0, pointerEvents: "none",
                        background: `radial-gradient(ellipse at 0% 0%, ${palette.surfaceMid} 0%, transparent 70%)`,
                    }}
                />
            )}

            {/* Album art */}
            <div style={{ position: "relative", flexShrink: 0, width: 60, height: 60, borderRadius: 16, overflow: "hidden", zIndex: 1 }}>
                <img
                    ref={albumImgRef}
                    src={music.album.cover_medium}
                    crossOrigin="anonymous"
                    onLoad={handleImageLoad}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
            </div>

            {/* Track info + waveform */}
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2, zIndex: 1 }}>
                <p style={{
                    fontSize: 14, fontWeight: 600, letterSpacing: "0.1px",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    color: palette?.onSurface ?? "#f0eef8",
                    transition: "color 0.6s",
                    margin: 0,
                }}>
                    {music.title}
                </p>
                <p style={{
                    fontSize: 12, letterSpacing: "0.4px",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    color: palette?.onSurfaceVariant ?? "#a09ab8",
                    transition: "color 0.6s",
                    margin: 0,
                }}>
                    {music.artist.name}
                </p>
                <div ref={containerRef} style={{ marginTop: 7, width: "100%" }} />
            </div>

            {/* M3 Expressive FAB */}
            <button
                onClick={togglePlay}
                aria-label={isPlaying ? "Pause" : "Play"}
                style={{
                    width: 54, height: 54, borderRadius: 18,
                    border: "none", cursor: "pointer", flexShrink: 0, zIndex: 1,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: palette?.primaryContainer ?? "#4a3f7a",
                    color: palette?.onPrimary ?? "#ede8ff",
                    boxShadow: palette ? `0 3px 12px ${palette.fabShadow}` : "none",
                    transition: "background 0.6s, color 0.6s, transform 0.15s cubic-bezier(0.2,0,0,1), box-shadow 0.6s",
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.07)")}
                onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
                onMouseDown={e => (e.currentTarget.style.transform = "scale(0.93)")}
                onMouseUp={e => (e.currentTarget.style.transform = "scale(1.07)")}
            >
                {isPlaying ? (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                    </svg>
                ) : (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                    </svg>
                )}
            </button>
        </div>
    );
}