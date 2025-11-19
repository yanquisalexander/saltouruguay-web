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
                    newState.playing = data.playing;
                    newState.loop = data.loop;
                    newState.volume = data.volume;
                    break;
                case 'PAUSE':
                    newState.playing = data.playing;
                    newState.loop = data.loop;
                    newState.volume = data.volume;
                    break;
                case 'STOP':
                    newState.playing = false;
                    newState.loop = data.loop;
                    newState.volume = data.volume;
                    break;
                case 'SET_VOLUME':
                    newState.volume = data.volume;
                    newState.playing = data.playing;
                    newState.loop = data.loop;
                    break;
                case 'SET_LOOP':
                    newState.loop = data.loop;
                    newState.playing = data.playing;
                    newState.volume = data.volume;
                    break;
            }
            return { ...prev, [audioId]: newState };
        });
    };

    useEffect(() => {
        if (channel) {
            channel.bind("audio-update", handleAudioUpdate);
            
            // Handle mute all event
            channel.bind("audio-mute-all", () => {
                setAudioStates(prev => {
                    const updated = { ...prev };
                    Object.keys(updated).forEach(audioId => {
                        updated[audioId].volume = 0;
                    });
                    return updated;
                });
            });

            // Handle stop all event
            channel.bind("audio-stop-all", () => {
                setAudioStates(prev => {
                    const updated = { ...prev };
                    Object.keys(updated).forEach(audioId => {
                        updated[audioId].playing = false;
                    });
                    return updated;
                });
            });
        }

        // Load initial states
        actions.audio.getCurrentAudioState({}).then(result => {
            if (result.data) {
                setAudioStates(result.data.states);
            }
        });

        return () => {
            if (channel) {
                channel.unbind("audio-update", handleAudioUpdate);
                channel.unbind("audio-mute-all");
                channel.unbind("audio-stop-all");
            }
        };
    }, [channel]);

    const handlePlay = (audioId: string) => {
        actions.audio.play({ audioId });
    };

    const handlePause = (audioId: string) => {
        actions.audio.pause({ audioId });
    };

    const handleStop = (audioId: string) => {
        actions.audio.stop({ audioId });
    };

    const handleVolumeChange = (audioId: string, volume: number) => {
        actions.audio.setVolume({ audioId, volume: volume / 100 });
    };

    const handleLoopToggle = (audioId: string) => {
        const current = audioStates[audioId]?.loop || false;
        actions.audio.setLoop({ audioId, enabled: !current });
    };

    const handleMuteAll = () => {
        actions.audio.muteAll({});
    };

    if (!isAdmin) return null;

    return (
        <dialog ref={dialogRef} class="fixed bottom-20 left-4 z-[10000] bg-black/90 backdrop-blur-md border border-white/20 rounded-lg p-4 min-w-[400px] max-w-[600px] max-h-[80vh] overflow-y-auto shadow-2xl">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-white text-lg font-bold flex items-center gap-2">
                    <span class="text-2xl">🎧</span>
                    Audio Manager
                </h2>
                <button onClick={() => dialogRef.current?.close()} class="text-white/50 hover:text-white text-xl">✕</button>
            </div>

            <div class="grid grid-cols-2 gap-2 mb-4">
                <button
                    onClick={handleMuteAll}
                    class="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg font-semibold transition-colors"
                >
                    🔇 Silenciar Todo
                </button>
                <button
                    onClick={() => actions.audio.stopAll({})}
                    class="bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-lg font-semibold transition-colors"
                >
                    ⏹ Detener Todo
                </button>
            </div>

            <div class="space-y-3">
                {AVAILABLE_AUDIOS.map(audio => {
                    const state = audioStates[audio.id] || { id: audio.id, playing: false, volume: 1, loop: false };
                    return (
                        <div key={audio.id} class={`bg-black/40 p-3 rounded-lg border transition-all ${state.playing ? 'border-green-500/50 shadow-lg shadow-green-500/20' : 'border-white/10'}`}>
                            <div class="flex justify-between items-center mb-2">
                                <span class="text-white font-semibold text-sm">{audio.name}</span>
                                <div class="flex items-center space-x-2">
                                    {state.playing && (
                                        <span class="inline-flex items-center">
                                            <span class="animate-pulse h-2 w-2 bg-green-500 rounded-full mr-1"></span>
                                            <span class="text-green-500 text-xs font-bold">PLAYING</span>
                                        </span>
                                    )}
                                    {state.loop && (
                                        <span class="text-purple-400 text-xs font-semibold">🔁 LOOP</span>
                                    )}
                                </div>
                            </div>

                            <div class="flex items-center space-x-2 mb-2 flex-wrap gap-1">
                                <button
                                    onClick={() => state.playing ? handlePause(audio.id) : handlePlay(audio.id)}
                                    class={`${state.playing ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'} text-white px-3 py-1 rounded text-sm font-medium transition-colors`}
                                >
                                    {state.playing ? '⏸ Pause' : '▶ Play'}
                                </button>
                                <button
                                    onClick={() => handleStop(audio.id)}
                                    class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                                >
                                    ⏹ Stop
                                </button>
                                <button
                                    onClick={() => handleLoopToggle(audio.id)}
                                    class={`px-3 py-1 rounded text-sm font-medium transition-colors ${state.loop ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-600 hover:bg-gray-700'} text-white`}
                                >
                                    🔁 {state.loop ? 'ON' : 'OFF'}
                                </button>
                            </div>

                            <div class="flex items-center space-x-2">
                                <span class="text-white/70 text-sm">🔊</span>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={state.volume * 100}
                                    onInput={(e) => handleVolumeChange(audio.id, parseInt((e.target as HTMLInputElement).value))}
                                    class="flex-1"
                                />
                                <span class="text-white/70 text-sm w-12 text-right">{Math.round(state.volume * 100)}%</span>
                            </div>

                            <div class="text-xs text-white/50 mt-1">
                                Estado: {state.playing ? '▶ Reproduciendo' : '⏹ Detenido'}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div class="text-xs text-white/50 mt-4">
                Presiona 'A' para abrir/cerrar, Escape para cerrar
            </div>
        </dialog>
    );
};