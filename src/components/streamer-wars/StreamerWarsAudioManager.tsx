import { useEffect, useRef, useState } from "preact/hooks";
import type { Session } from "@auth/core/types";
import { actions } from "astro:actions";
import { AVAILABLE_AUDIOS, type AudioState } from "@/types/audio";

interface StreamerWarsAudioManagerProps {
    session: Session;
    channel: any; // Pusher channel
    isAdmin: boolean;
}

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
            dialogRef.current?.show();
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
        if (channel) {
            channel.bind("audio-update", handleAudioUpdate);
            channel.bind("audio-mute-all", () => {
                setAudioStates(prev => {
                    const updated = { ...prev };
                    Object.keys(updated).forEach(id => updated[id].volume = 0);
                    return updated;
                });
            });
            channel.bind("audio-stop-all", () => {
                setAudioStates(prev => {
                    const updated = { ...prev };
                    Object.keys(updated).forEach(id => updated[id].playing = false);
                    return updated;
                });
            });
        }

        actions.audio.getCurrentAudioState({}).then(result => {
            if (result.data) setAudioStates(result.data.states);
        });

        return () => {
            if (channel) {
                channel.unbind("audio-update", handleAudioUpdate);
                channel.unbind("audio-mute-all");
                channel.unbind("audio-stop-all");
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

    return (
        <dialog
            ref={dialogRef}
            class="fixed bottom-20 left-4 z-[10000] bg-slate-900 text-white border-4 border-slate-600 p-0 min-w-[400px] max-w-[600px] w-full max-h-[80vh] overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] rounded-sm backdrop:bg-black/50"
        >
            {/* Retro Header */}
            <div class="bg-slate-800 p-3 border-b-4 border-slate-600 flex justify-between items-center sticky top-0 z-10">
                <h2 class="text-yellow-400 text-sm font-bold flex items-center gap-2 font-press-start-2p uppercase tracking-widest">
                    <span class="animate-pulse">●</span> Audio Deck
                </h2>
                <button
                    onClick={() => dialogRef.current?.close()}
                    class="text-slate-400 hover:text-white hover:bg-red-500 px-2 font-mono border-2 border-transparent hover:border-white transition-all"
                >
                    [X]
                </button>
            </div>

            <div class="p-4 overflow-y-auto max-h-[calc(80vh-60px)] bg-slate-900">
                {/* Global Controls */}
                <div class="grid grid-cols-2 gap-4 mb-6 pb-6 border-b-2 border-dashed border-slate-700">
                    <button
                        onClick={() => actions.audio.muteAll({})}
                        class="bg-red-900 hover:bg-red-600 text-white py-3 px-4 border-b-4 border-r-4 border-red-950 active:border-0 active:translate-y-1 font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 group"
                    >
                        <span class="group-hover:animate-ping">🔇</span> SILENCE ALL
                    </button>
                    <button
                        onClick={() => actions.audio.stopAll({})}
                        class="bg-orange-900 hover:bg-orange-600 text-white py-3 px-4 border-b-4 border-r-4 border-orange-950 active:border-0 active:translate-y-1 font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 group"
                    >
                        <span class="group-hover:animate-spin">⏹</span> STOP ALL
                    </button>
                </div>

                {/* Audio Grid */}
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {AVAILABLE_AUDIOS.map(audio => {
                        const state = audioStates[audio.id] || { id: audio.id, playing: false, volume: 1, loop: false };
                        const isPlaying = state.playing;

                        return (
                            <div
                                key={audio.id}
                                class={`
                                    relative p-3 border-2 transition-all bg-slate-950
                                    ${isPlaying
                                        ? 'border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.2)]'
                                        : 'border-slate-700 hover:border-slate-500'}
                                `}
                            >
                                {/* Status Indicator Light */}
                                <div class={`absolute top-2 right-2 w-2 h-2 rounded-sm ${isPlaying ? 'bg-green-500 animate-pulse shadow-[0_0_5px_#22c55e]' : 'bg-slate-800'}`} />

                                <div class="flex flex-col gap-2">
                                    <span class="text-xs font-press-start-2p text-slate-300 truncate pr-4" title={audio.name}>
                                        {audio.name}
                                    </span>

                                    {/* Control Row */}
                                    <div class="flex gap-1 mt-1">
                                        <button
                                            onClick={() => isPlaying ? handlePause(audio.id) : handlePlay(audio.id)}
                                            class={`
                                                flex-1 py-1 px-2 text-[10px] font-mono font-bold border-b-2 border-r-2 active:border-0 active:translate-y-[2px] transition-colors
                                                ${isPlaying
                                                    ? 'bg-yellow-600 border-yellow-800 text-white hover:bg-yellow-500'
                                                    : 'bg-green-700 border-green-900 text-white hover:bg-green-600'}
                                            `}
                                        >
                                            {isPlaying ? 'PAUSE' : 'PLAY'}
                                        </button>

                                        <button
                                            onClick={() => handleStop(audio.id)}
                                            class="px-2 bg-slate-700 border-slate-900 border-b-2 border-r-2 active:border-0 active:translate-y-[2px] hover:bg-red-600 text-white text-[10px]"
                                        >
                                            ⏹
                                        </button>

                                        <button
                                            onClick={() => handleLoopToggle(audio.id)}
                                            class={`
                                                px-2 border-b-2 border-r-2 active:border-0 active:translate-y-[2px] text-[10px] transition-colors
                                                ${state.loop
                                                    ? 'bg-purple-600 border-purple-900 text-white'
                                                    : 'bg-slate-800 border-slate-950 text-slate-500 hover:text-white'}
                                            `}
                                            title="Toggle Loop"
                                        >
                                            🔁
                                        </button>
                                    </div>

                                    {/* Volume Slider */}
                                    <div class="flex items-center gap-2 mt-1 bg-slate-900/50 p-1 rounded border border-white/5">
                                        <span class="text-[10px] text-slate-500">VOL</span>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={state.volume * 100}
                                            onInput={(e) => handleVolumeChange(audio.id, parseInt((e.target as HTMLInputElement).value))}
                                            class="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500 hover:accent-green-400"
                                        />
                                        <span class="text-[10px] font-mono w-8 text-right text-green-400">
                                            {Math.round(state.volume * 100)}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div class="text-[10px] text-slate-500 mt-6 text-center font-mono border-t border-slate-800 pt-2">
                    PRESS 'A' TO TOGGLE // ESC TO EXIT
                </div>
            </div>
        </dialog>
    );
};