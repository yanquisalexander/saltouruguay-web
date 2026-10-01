import "atropos/css";
import "@/components/styles/member-card.css";
import { cn } from '@/lib/utils';
import { LucideLock, LucideTrash2, LucideQrCode, LucideSwords, LucideCrown, LucideTrophy } from "lucide-preact";
import { MemberCardSkins } from "@/consts/MemberCardSkins";

interface Props {
    number: number;
    className?: string;
    user: {
        username: string;
        avatar: string;
        playerNumber?: number;
    };
    handleRemoveSticker?: (index: number) => void;
    selectedStickers?: {
        list: (string | null)[];
        limit: number;
    };
    skin?: string;
}

export const MemberCard = ({
    number,
    user,
    className,
    handleRemoveSticker,
    selectedStickers,
    skin = 'classic',
}: Props) => {
    const { username = 'Unknown', avatar = '' } = user;
    const paddedNumber = number != null ? number.toString().padStart(5, "0") : "00000";
    const bgImage = MemberCardSkins.find((s) => s.id === skin)?.image;

    const isStreamerWars = skin === 'guerra-streamers';
    const isAwards = skin === 'awards';

    const theme = {
        border: isStreamerWars ? 'border-lime-400/50' : isAwards ? 'border-amber-400/50' : 'border-white/20',
        glow: isStreamerWars ? 'shadow-[0_0_40px_rgba(163,230,53,0.15)]' : isAwards ? 'shadow-[0_0_40px_rgba(251,191,36,0.15)]' : 'shadow-2xl',
        accentText: isStreamerWars ? 'text-lime-400' : isAwards ? 'text-amber-400' : 'text-yellow-400',
        accentBg: isStreamerWars ? 'bg-lime-400/10' : isAwards ? 'bg-amber-400/10' : 'bg-white/10',
        badgeBorder: isStreamerWars ? 'border-lime-400/30' : isAwards ? 'border-amber-400/30' : 'border-white/10',
        title: isStreamerWars ? 'PARTICIPANTE GUERRA DE STREAMERS' : isAwards ? 'NOMINADO SALTO AWARDS' : 'MIEMBRO SALTANO',
        icon: isStreamerWars ? <LucideSwords size={14} /> : isAwards ? <LucideTrophy size={14} /> : <LucideCrown size={14} />
    };

    return (
        <div className={cn(
            "relative w-full aspect-[1.95/1] rounded-[24px] overflow-hidden select-none transition-all duration-500 bg-[#0f0f11]",
            theme.glow,
            className
        )}>
            {/* --- CAPA 1: FONDO --- */}
            <div className={`absolute inset-0 member-card-gradient-bg skin-${skin}`}>
                <div className="absolute inset-0">
                    <img
                        src={bgImage}
                        className="w-full h-full object-cover opacity-60 mix-blend-overlay transition-transform duration-700 hover:scale-105"
                        alt=""
                    />
                </div>

                <div className="absolute inset-0 bg-[url('/images/noise.png')] opacity-[0.04] mix-blend-overlay pointer-events-none"></div>
                <div className="absolute inset-0 bg-linear-to-r from-black/90 via-black/40 to-black/80"></div>
                <div className={`absolute inset-0 border-[3px] rounded-[24px] pointer-events-none ${theme.border} opacity-80`}></div>
            </div>

            {/* --- CAPA 2: CONTENIDO --- */}
            <div className="relative z-10 w-full h-full flex flex-col justify-between p-3.5 sm:p-5 md:p-8">

                {/* --- HEADER --- */}
                <div className="flex justify-between items-start gap-2">
                    <div className="flex gap-2.5 sm:gap-4 md:gap-5 items-center min-w-0">
                        <div className="relative group/avatar shrink-0">
                            <div className={`
                                size-12 sm:size-16 md:size-24 rounded-xl sm:rounded-2xl overflow-hidden border-2 sm:border-[3px] shadow-lg
                                ${isStreamerWars ? 'border-lime-400 shadow-lime-900/20' : isAwards ? 'border-amber-400 shadow-amber-900/20' : 'border-white/30'}
                            `}>
                                <img
                                    src={avatar}
                                    crossOrigin="anonymous"
                                    className="w-full h-full object-cover"
                                    alt={username}
                                />
                            </div>

                            {isStreamerWars && user.playerNumber && (
                                <div className="absolute -bottom-2 -right-1 bg-black text-lime-400 border border-lime-500 font-mono text-[9px] sm:text-xs font-bold px-1.5 py-0.5 rounded-md shadow-lg transform -rotate-2">
                                    P-{user.playerNumber.toString().padStart(3, '0')}
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col min-w-0">
                            <h2 className="text-base sm:text-2xl md:text-4xl font-anton text-white uppercase tracking-wide leading-none drop-shadow-lg truncate max-w-[110px] sm:max-w-[200px] md:max-w-[250px]">
                                {username}
                            </h2>

                            <div className={`
                                flex items-center gap-1.5 mt-1 sm:mt-2 px-2 sm:px-3 py-0.5 sm:py-1 rounded-md sm:rounded-lg w-max border backdrop-blur-xs
                                ${theme.accentBg} ${theme.badgeBorder} ${theme.accentText}
                            `}>
                                {theme.icon}
                                <span className="text-[8px] sm:text-[10px] md:text-xs font-bold uppercase tracking-widest truncate">
                                    {theme.title}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="text-right opacity-30 shrink-0">
                        <span className="block text-[8px] sm:text-[10px] font-mono uppercase tracking-[0.2em] sm:tracking-[0.3em] mb-0.5">
                            Identification
                        </span>
                        <span className="font-anton text-2xl sm:text-4xl md:text-6xl text-white tracking-tighter leading-none">
                            #{paddedNumber}
                        </span>
                    </div>
                </div>

                {/* --- FOOTER --- */}
                <div className="flex items-end justify-between gap-2">

                    {/* Stickers Zone */}
                    <div className="flex flex-col gap-1 sm:gap-2">
                        <span className="text-[7px] sm:text-[9px] text-white/30 uppercase tracking-widest font-bold ml-1">
                            Achievements / Stickers
                        </span>
                        <div className="flex items-center gap-1.5 sm:gap-3 p-1 sm:p-2 bg-black/40 rounded-xl sm:rounded-2xl border border-white/5 backdrop-blur-xs">
                            {selectedStickers?.list.map((sticker, index) => {
                                const isLocked = index >= selectedStickers.limit;
                                return (
                                    <div key={index} className="relative group z-999">
                                        <div className={`
                                            size-8 sm:size-11 md:size-14 rounded-lg sm:rounded-xl flex items-center justify-center transition-all
                                            ${isLocked
                                                ? 'bg-white/5 border border-white/5'
                                                : 'bg-linear-to-b from-white/10 to-transparent border border-white/10 shadow-inner'
                                            }
                                        `}>
                                            {sticker ? (
                                                <img
                                                    src={`/images/stickers/${sticker}.webp`}
                                                    className="w-6 h-6 sm:w-8 sm:h-8 md:w-9 md:h-9 object-contain drop-shadow-lg transform group-hover:scale-110 transition-transform duration-300"
                                                    alt="sticker"
                                                />
                                            ) : (
                                                isLocked && <LucideLock size={12} className="text-white/10 sm:size-4" />
                                            )}
                                        </div>

                                        {sticker && handleRemoveSticker && (
                                            <button
                                                onClick={(e) => {
                                                    console.log("Sticker removed:", index);
                                                    e.stopPropagation();
                                                    handleRemoveSticker(index);
                                                }}
                                                onMouseDown={(e) => e.stopPropagation()}
                                                onTouchStart={(e) => e.stopPropagation()}
                                                className="absolute -top-1.5 -right-1.5 z-100 bg-red-500 text-white rounded-full p-0.5 sm:p-1 opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg hover:bg-red-600 hover:scale-110 cursor-pointer flex items-center justify-center"
                                                title="Quitar Sticker"
                                                type="button"
                                            >
                                                <LucideTrash2 size={10} className="sm:size-3" />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 sm:gap-2 opacity-80 shrink-0">
                        <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1 rounded-md sm:rounded-lg bg-black/60 border border-white/10">
                            <img src="/favicon.svg" className="w-3.5 h-3.5 sm:w-5 sm:h-5 opacity-90" alt="" />
                            <span className="text-[8px] sm:text-[10px] md:text-xs font-bold text-white uppercase tracking-widest">
                                Salto Uruguay
                            </span>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2 text-[8px] sm:text-[9px] text-white/40 font-mono">
                            <LucideQrCode size={10} className="sm:size-3" />
                            <span>VERIFIED MEMBER</span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};