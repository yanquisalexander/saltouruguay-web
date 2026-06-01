import { useEffect, useRef, useState } from "preact/hooks";
import type { Session } from "@auth/core/types";
import { actions } from "astro:actions";
import { AVAILABLE_AUDIOS, type AudioState } from "@/types/audio";
import { PUSHER_EVENTS } from "@/consts/pusher";

interface StreamerWarsAudioManagerProps {
    session: Session;
    channel: any;
    isAdmin: boolean;
}

const Equalizer = ({ active, color }: { active: boolean; color: string }) => (
    <div class="flex items-end gap-[2px] h-4">
        {[1, 2, 3, 4].map((i) => (
            <div
                key={i}
                class={`w-[3px] rounded-xs transition-all duration-300 ${active ? color : 'bg-white/10'}`}
                style={{
                    height: active ? `${40 + i * 15}%` : '20%',
                    animation: active ? `equalizer 0.${i * 3 + 3}s ease-in-out infinite` : 'none',
                    animationDelay: `${i * 0.12}s`,
                }}
            />
        ))}
    </div>
);

export const StreamerWarsAudioManager = ({ session, channel, isAdmin }: StreamerWarsAudioManagerProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [audioStates, setAudioStates] = useState<Record<string, AudioState>>({});
    const dialogRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'a' || e.key === 'A') {
                const activeElement = document.activeElement as HTMLElement;
                if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.contentEditable === 'true')) {
                    return;
                }
                e.preventDefault();
                setIsOpen(true);
            } else if (e.key === 'Escape' && isOpen) {
                dialogRef.current?.close();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (dialog) {
            const handleClose = () => setIsOpen(false);
            dialog.addEventListener('close', handleClose);
            return () => dialog.removeEventListener('close', handleClose);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            dialogRef.current?.showModal();
        }
    }, [isOpen]);

    const handleAudioUpdate = ({ audioId, action, data }: { audioId: string, action: string, data: any }) => {
        setAudioStates(prev => {
            const currentState = prev[audioId] || { id: audioId, playing: false, volume: 1, loop: false };
            let newState = { ...currentState };

            switch (action) {
                case 'PLAY':
                case 'PAUSE':
                case 'SET_VOLUME':
                case 'SET_LOOP':
                    newState.playing = data.playing;
                    newState.loop = data.loop;
                    newState.volume = data.volume;
                    break;
                case 'STOP':
                    newState.playing = false;
                    newState.loop = data.loop;
                    newState.volume = data.volume;
                    break;
            }
            return { ...prev, [audioId]: newState };
        });
    };

    useEffect(() => {
        const handleMuteAll = () => {
            setAudioStates(prev => {
                const updated = { ...prev };
                Object.keys(updated).forEach(id => updated[id].volume = 0);
                return updated;
            });
        };

        const handleStopAll = () => {
            setAudioStates(prev => {
                const updated = { ...prev };
                Object.keys(updated).forEach(id => updated[id].playing = false);
                return updated;
            });
        };

        if (channel) {
            channel.bind(PUSHER_EVENTS.AUDIO_UPDATE, handleAudioUpdate);
            channel.bind(PUSHER_EVENTS.AUDIO_MUTE_ALL, handleMuteAll);
            channel.bind(PUSHER_EVENTS.AUDIO_STOP_ALL, handleStopAll);
        }

        actions.audio.getCurrentAudioState({}).then(result => {
            if (result.data) setAudioStates(result.data.states);
        });

        return () => {
            if (channel) {
                channel.unbind(PUSHER_EVENTS.AUDIO_UPDATE, handleAudioUpdate);
                channel.unbind(PUSHER_EVENTS.AUDIO_MUTE_ALL, handleMuteAll);
                channel.unbind(PUSHER_EVENTS.AUDIO_STOP_ALL, handleStopAll);
            }
        };
    }, [channel]);

    const handlePlay = (audioId: string) => actions.audio.play({ audioId });
    const handlePause = (audioId: string) => actions.audio.pause({ audioId });
    const handleStop = (audioId: string) => actions.audio.stop({ audioId });
    const handleVolumeChange = (audioId: string, volume: number) => actions.audio.setVolume({ audioId, volume: volume / 100 });
    const handleLoopToggle = (audioId: string) => {
        const current = audioStates[audioId]?.loop || false;
        actions.audio.setLoop({ audioId, enabled: !current });
    };

    if (!isAdmin) return null;

    const playingCount = Object.values(audioStates).filter(s => s.playing).length;

    return (
        <dialog
            ref={dialogRef}
            onClick={(e) => e.target === dialogRef.current && dialogRef.current?.close()}
            class="backdrop:bg-black/80 backdrop:backdrop-blur-xs bg-[#0a0a0a] text-white border border-white/10 rounded-2xl shadow-2xl p-0 w-full max-w-2xl m-auto open:animate-in open:fade-in open:zoom-in-95"
        >
            {/* Header */}
            <div class="p-6 border-b border-white/10 flex justify-between items-center bg-[#15151a] rounded-t-2xl">
                <div class="flex items-center gap-3">
                    <Equalizer active={playingCount > 0} color="bg-electric-violet-500" />
                    <h2 class="text-xl font-anton uppercase tracking-wide text-white">
                        Audio Deck
                    </h2>
                    {playingCount > 0 && (
                        <span class="text-xs font-mono text-electric-violet-400 bg-electric-violet-500/10 border border-electric-violet-500/20 px-2 py-0.5 rounded-md">
                            {playingCount} active
                        </span>
                    )}
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-[10px] font-mono text-white/20 tracking-widest hidden sm:block">[A]</span>
                    <button
                        onClick={() => dialogRef.current?.close()}
                        class="p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                </div>
            </div>

            {/* Body */}
            <div class="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar scrollbar-hide">
                {/* Global Controls */}
                <div class="flex gap-3 mb-6 pb-6 border-b border-white/5">
                    <button
                        onClick={() => actions.audio.muteAll({})}
                        class="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 rounded-xl transition-all text-sm font-bold"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/><line x1="23" x2="17" y1="9" y2="15"/><line x1="17" x2="23" y1="9" y2="15"/></svg>
                        Silence All
                    </button>
                    <button
                        onClick={() => actions.audio.stopAll({})}
                        class="flex items-center gap-2 px-4 py-2 bg-orange-500/10 hover:bg-orange-500 text-orange-400 hover:text-white border border-orange-500/20 rounded-xl transition-all text-sm font-bold"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="4" height="16" x="6" y="4" rx="1"/><rect width="4" height="16" x="14" y="4" rx="1"/></svg>
                        Stop All
                    </button>
                </div>

                {/* Audio Grid */}
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {AVAILABLE_AUDIOS.map(audio => {
                        const state = audioStates[audio.id] || { id: audio.id, playing: false, volume: 1, loop: false };
                        const isPlaying = state.playing;

                        return (
                            <div
                                key={audio.id}
                                class={`group relative rounded-xl border transition-all duration-200 bg-black/40 ${isPlaying
                                    ? 'border-electric-violet-500/40 bg-electric-violet-500/5 shadow-[0_0_20px_rgba(145,70,255,0.08)]'
                                    : 'border-white/5 hover:border-white/10 hover:bg-white/[0.02]'}`}
                            >
                                <div class="p-4 flex flex-col gap-3">
                                    {/* Top row: name + status */}
                                    <div class="flex items-center justify-between gap-2">
                                        <span class={`text-xs font-rubik font-semibold truncate ${isPlaying ? 'text-electric-violet-300' : 'text-white/60'}`}>
                                            {audio.name}
                                        </span>
                                        <div class="flex items-center gap-1.5 shrink-0">
                                            {isPlaying && (
                                                <Equalizer active color="bg-electric-violet-500" />
                                            )}
                                            <div class={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${isPlaying ? 'bg-electric-violet-500 animate-pulse shadow-[0_0_6px_rgba(145,70,255,0.6)]' : 'bg-white/10'}`} />
                                        </div>
                                    </div>

                                    {/* Controls row */}
                                    <div class="flex items-center gap-1.5">
                                        <button
                                            onClick={() => isPlaying ? handlePause(audio.id) : handlePlay(audio.id)}
                                            class={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${isPlaying
                                                ? 'bg-electric-violet-500/20 text-electric-violet-300 border border-electric-violet-500/30 hover:bg-electric-violet-500/30'
                                                : 'bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20'}`}
                                            title={isPlaying ? 'Pause' : 'Play'}
                                        >
                                            {isPlaying
                                                ? <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                                                : <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>}
                                        </button>

                                        <button
                                            onClick={() => handleStop(audio.id)}
                                            class="flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 text-white/30 border border-white/5 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 transition-all"
                                            title="Stop"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
                                        </button>

                                        <button
                                            onClick={() => handleLoopToggle(audio.id)}
                                            class={`flex items-center justify-center w-8 h-8 rounded-lg border transition-all ${state.loop
                                                ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                                                : 'bg-white/5 text-white/20 border-white/5 hover:text-white/40'}`}
                                            title="Loop"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/><path d="M21 3v5h-5"/></svg>
                                        </button>

                                        {/* Volume slider */}
                                        <div class="flex-1 flex items-center gap-2 ml-1">
                                            <input
                                                type="range"
                                                min="0"
                                                max="100"
                                                value={state.volume * 100}
                                                onInput={(e) => handleVolumeChange(audio.id, parseInt((e.target as HTMLInputElement).value))}
                                                class="flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-electric-violet-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-electric-violet-500 [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(145,70,255,0.4)] [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-125"
                                            />
                                            <span class="text-[10px] font-mono w-8 text-right text-white/40 tabular-nums">
                                                {Math.round(state.volume * 100)}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer hint */}
                <div class="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-white/20">
                    <span>PRESS A TO TOGGLE</span>
                    <span class="hidden sm:block">{AVAILABLE_AUDIOS.length} TRACKS</span>
                </div>
            </div>
        </dialog>
    );
};
