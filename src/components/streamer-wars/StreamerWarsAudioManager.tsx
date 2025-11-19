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
            const newState = { ...prev[audioId] };
            switch (action) {
                case 'SET_VOLUME':
                    newState.volume = data.volume;
                    break;
                case 'RESTART':
                    newState.currentTime = 0;
                    break;
                case 'UPDATE_STATE':
                    newState.playing = data.playing;
                    newState.paused = data.paused;
                    newState.loop = data.loop;
                    break;
            }
            return { ...prev, [audioId]: newState };
        });
    };

    useEffect(() => {
        if (channel) {
            channel.bind("audio-update", handleAudioUpdate);
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

    const handleRestart = (audioId: string) => {
        actions.audio.seek({ audioId, position: 0 });
    };

    const handleMuteAll = () => {
        actions.audio.muteAll({});
    };

    if (!isAdmin) return null;

    return (
        <dialog ref={dialogRef} class="fixed bottom-20 left-4 z-[10000] bg-black/80 backdrop-blur-md border border-white/20 rounded-lg p-4 min-w-[400px] max-w-[600px] max-h-[80vh] overflow-y-auto">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-white text-lg font-bold">Audio Manager</h2>
                <button onClick={() => dialogRef.current?.close()} class="text-white/50 hover:text-white">✕</button>
            </div>

            <button
                onClick={handleMuteAll}
                class="w-full mb-4 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded"
            >
                Silenciar Todo
            </button>
            <button
                onClick={() => actions.audio.stopAll({})}
                class="w-full mb-4 bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded"
            >
                Detener Todo
            </button>

            <div class="space-y-4">
                {AVAILABLE_AUDIOS.map(audio => {
                    const state = audioStates[audio.id] || { playing: false, paused: false, volume: 1, loop: false, currentTime: 0, duration: audio.duration };
                    return (
                        <div key={audio.id} class="bg-black/40 p-3 rounded border border-white/10">
                            <div class="flex justify-between items-center mb-2">
                                <span class="text-white font-semibold">{audio.name}</span>
                            </div>

                            <div class="flex items-center space-x-2 mb-2">
                                <button
                                    onClick={() => state.playing ? handlePause(audio.id) : handlePlay(audio.id)}
                                    class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                                >
                                    {state.playing ? 'Pause' : 'Play'}
                                </button>
                                <button
                                    onClick={() => handleStop(audio.id)}
                                    class="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
                                >
                                    Stop
                                </button>
                                <button
                                    onClick={() => handleRestart(audio.id)}
                                    class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                                >
                                    Restart
                                </button>
                                <button
                                    onClick={() => handleLoopToggle(audio.id)}
                                    class={`px-3 py-1 rounded text-sm ${state.loop ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-600 hover:bg-gray-700'} text-white`}
                                >
                                    Loop {state.loop ? 'ON' : 'OFF'}
                                </button>
                            </div>

                            <div class="flex items-center space-x-2">
                                <span class="text-white/70 text-sm">Vol:</span>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={state.volume * 100}
                                    onInput={(e) => handleVolumeChange(audio.id, parseInt((e.target as HTMLInputElement).value))}
                                    class="flex-1"
                                />
                                <span class="text-white/70 text-sm">{Math.round(state.volume * 100)}%</span>
                            </div>

                            <div class="text-xs text-white/50 mt-1">
                                Estado: {state.playing ? 'Reproduciendo' : state.paused ? 'Pausado' : 'Detenido'}
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