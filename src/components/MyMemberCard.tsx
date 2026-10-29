import type { Session } from "@auth/core/types";
import { Container3D } from "./Container3D";
import { MemberCard } from "./MemberCard";
import { useEffect, useState, useRef } from "preact/hooks";
import { Download, Loader2, Palette, Sticker, Sparkles, Check, Lock, X, AlertCircle } from "lucide-preact";
import { toPng } from "html-to-image";
import { STICKERS } from "@/consts/Stickers";
import { actions } from "astro:actions";
import { toast } from "sonner";
import { MemberCardSkins } from "@/consts/MemberCardSkins";
import "./styles/member-card-studio.css";

type SkinId = typeof MemberCardSkins[number]['id'];
type StickerSlots = (string | null)[];
type SaveStatus = 'saved' | 'saving' | 'error';

export const MyMemberCard = ({ session, stickers = [], tier, initialSkin = 'classic' }: {
    session: Session; stickers: string[]; tier: number | null; initialSkin: SkinId;
}) => {
    const limit = Math.max(0, Math.min(tier ?? 0, 3));
    const [slots, setSlots] = useState<StickerSlots>(() => Array.from({ length: 3 }, (_, i) => stickers[i] ?? null));
    const [skin, setSkin] = useState<SkinId>(() => MemberCardSkins.some(s => s.id === initialSkin) ? initialSkin : 'classic');
    const [status, setStatus] = useState<SaveStatus>('saved');
    const [generating, setGenerating] = useState(false);
    const saving = useRef(false);
    const exportCard = useRef<HTMLDivElement>(null);
    const objectUrls = useRef<string[]>([]);
    const username = session.user.name ?? 'Saltano';
    const avatar = session.user.image ?? '';
    const user = { avatar, username, playerNumber: session.user.streamerWarsPlayerNumber };
    const selectedStickers = { limit, list: slots };
    const skinInfo = MemberCardSkins.find(s => s.id === skin)!;
    const busy = status === 'saving' || generating;

    useEffect(() => () => objectUrls.current.forEach(url => URL.revokeObjectURL(url)), []);

    async function changeSkin(nextSkin: SkinId) {
        if (saving.current || generating || nextSkin === skin) return;
        const previous = skin;
        saving.current = true;
        setSkin(nextSkin);
        setStatus('saving');
        try {
            const { error } = await actions.updateMemberCardSkin({ skin: nextSkin });
            if (error) throw error;
            setStatus('saved');
        } catch {
            setSkin(previous);
            setStatus('error');
            toast.error('No pudimos guardar la skin. Volvé a intentarlo.');
        } finally { saving.current = false; }
    }

    async function saveStickers(next: StickerSlots) {
        if (saving.current || generating) return;
        const previous = slots;
        saving.current = true;
        setSlots(next);
        setStatus('saving');
        try {
            const { error } = await actions.updateStickers({ stickers: next });
            if (error) throw error;
            setStatus('saved');
        } catch {
            setSlots(previous);
            setStatus('error');
            toast.error('No pudimos guardar los stickers. Volvé a intentarlo.');
        } finally { saving.current = false; }
    }

    function selectSticker(id: string) {
        if (slots.includes(id)) return;
        const empty = slots.findIndex((value, i) => value === null && i < limit);
        if (empty === -1) return;
        const next = [...slots];
        next[empty] = id;
        void saveStickers(next);
    }

    function removeSticker(index: number) {
        const next = [...slots];
        next[index] = null;
        void saveStickers(next);
    }

    async function downloadCard() {
        if (!exportCard.current || generating || saving.current) return;
        setGenerating(true);
        try {
            await document.fonts.ready;
            const dataUrl = await toPng(exportCard.current, { pixelRatio: 2, cacheBust: true });
            const blob = await (await fetch(dataUrl)).blob();
            const url = URL.createObjectURL(blob);
            objectUrls.current.push(url);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = 'SaltoCard-' + username + '.png';
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
        } catch {
            toast.error('No pudimos generar la imagen. Volvé a intentarlo.');
        } finally { setGenerating(false); }
    }

    return <div class="member-studio">
        <div class="member-export" aria-hidden="true"><div ref={exportCard} style={{ width: '800px' }}>
            <MemberCard number={Number(session.user.id)} selectedStickers={selectedStickers} skin={skin} user={user} className="shadow-none" />
        </div></div>

        <div class="studio-preview-column">
            <section class="studio-preview" aria-labelledby="card-preview-title">
                <div class="studio-panel-heading"><h2 id="card-preview-title">Tu Member Card</h2><span class="studio-member-number">#{String(session.user.id).padStart(5, '0')}</span></div>
                <div class="studio-card-stage"><Container3D><MemberCard number={Number(session.user.id)} selectedStickers={selectedStickers} skin={skin} user={user} /></Container3D></div>
                <div class="studio-preview-footer"><span><Sparkles size={14} /> Skin {skinInfo.name}</span><span class="studio-save-status" data-status={status} role="status" aria-live="polite">{status === 'saving' ? <><Loader2 size={13} class="animate-spin" /> Guardando…</> : status === 'error' ? <><AlertCircle size={13} /> Cambio sin guardar</> : <><Check size={13} /> Cambios guardados</>}</span></div>
            </section>
            <section class="studio-takeaway" aria-labelledby="takeaway-title"><div><h2 id="takeaway-title">Llevá tu identidad con vos</h2><p>Descargá tu diseño en PNG y compartí tu tarjeta con la comunidad.</p></div><div class="studio-export-actions">
                <button type="button" class="studio-download" onClick={downloadCard} disabled={busy}>{generating ? <Loader2 size={18} class="animate-spin" /> : <Download size={18} />}{generating ? 'Generando imagen…' : 'Descargar PNG'}</button>
            </div></section>
        </div>

        <div class="studio-tools">
            <section class="studio-tool-panel" aria-labelledby="skins-title"><div class="studio-tool-heading"><span class="studio-tool-icon"><Palette size={20} /></span><div><h2 id="skins-title">Elegí tu skin</h2><p>Un diseño para cada saltano.</p></div><span class="studio-counter">{MemberCardSkins.length}</span></div>
                <div class="studio-skin-grid">{MemberCardSkins.map(option => <button type="button" key={option.id} class="studio-skin" aria-pressed={skin === option.id} disabled={busy} onClick={() => changeSkin(option.id)} title={option.description}>
                    <div class="studio-skin-image"><img src={option.image} alt="" loading="lazy" />{skin === option.id && <span class="studio-skin-check"><Check size={13} /></span>}</div><span>{option.name}</span>
                </button>)}</div>
                <p class="studio-selected-skin"><span>Seleccionada</span> {skinInfo.name}</p>
            </section>

            <section class="studio-tool-panel studio-stickers" aria-labelledby="stickers-title"><div class="studio-tool-heading"><span class="studio-tool-icon"><Sticker size={20} /></span><div><h2 id="stickers-title">Dale tu toque</h2><p>Elegí los stickers de tu tarjeta.</p></div><span class="studio-counter">{slots.slice(0, limit).filter(Boolean).length}/{limit}</span></div>
                <div class="studio-slots" aria-label="Espacios de stickers">{slots.map((id, index) => <div key={index} class="studio-slot" data-locked={index >= limit}>
                    {id ? <><img src={'/images/stickers/' + id + '.webp'} alt={id} /><button type="button" aria-label={'Quitar sticker ' + id} onClick={() => removeSticker(index)} disabled={busy}><X size={13} /></button></> : index >= limit ? <><Lock size={18} /><span>Tier {index + 1}</span></> : <><Sticker size={20} /><span>Espacio libre</span></>}
                </div>)}</div>
                {limit === 0 ? <p class="studio-tier-note"><Lock size={15} /><span>Tu tarjeta ya es tuya. Con una suscripción en Twitch podés añadir stickers: un espacio por cada tier.</span></p> : <p class="studio-tier-note"><Sparkles size={15} /><span>Tenés {limit} {limit === 1 ? 'espacio' : 'espacios'} por tu suscripción Tier {limit}. Quitá un sticker con la × para cambiarlo.</span></p>}
                <h3 class="studio-sticker-label">Stickers de la comunidad</h3>
                <div class="studio-sticker-grid">{STICKERS.map(({ id }) => {
                    const selected = slots.includes(id);
                    const full = !slots.some((value, i) => value === null && i < limit);
                    return <button type="button" key={id} class="studio-sticker" aria-label={selected ? 'Quitar ' + id : 'Añadir ' + id} aria-pressed={selected} disabled={busy || (!selected && full)} onClick={() => selected ? removeSticker(slots.indexOf(id)) : selectSticker(id)}><img src={'/images/stickers/' + id + '.webp'} alt="" loading="lazy" />{selected && <Check size={12} class="studio-sticker-check" />}</button>;
                })}</div>
            </section>
        </div>
    </div>;
};
