import { useState } from "preact/hooks";
import { actions } from "astro:actions";
import { toast } from "sonner";
import { TEAMS } from "@/consts/Teams";
import { useVoiceChatStore } from "@/stores/voiceChat";

export const VoiceControls = ({ isAdmin }: VoiceControlsProps) => {
    const [loading, setLoading] = useState(false);
    const { voiceEnabledTeams, setVoiceEnabled, spectatingTeams, spectatingUsers, setSpectatingTeam } = useVoiceChatStore();
    const [isOpen, setIsOpen] = useState(false);

    if (!isAdmin) return null;

    const handleEnableVoice = async (teamId: string) => {
        // Optimistic update
        setVoiceEnabled(teamId, true);
        setLoading(true);
        try {
            const { error } = await actions.voice.enable({ teamId });
            if (error) {
                setVoiceEnabled(teamId, false);
                toast.error(`Error: ${error.message}`);
            } else {
                toast.success(`Voice habilitado para equipo ${teamId}`);
            }
        } catch {
            setVoiceEnabled(teamId, false);
            toast.error("Error al habilitar voice chat");
        } finally {
            setLoading(false);
        }
    };

    const handleDisableVoice = async (teamId: string) => {
        // Optimistic update
        setVoiceEnabled(teamId, false);
        setLoading(true);
        try {
            const { error } = await actions.voice.disable({ teamId });
            if (error) {
                setVoiceEnabled(teamId, true);
                toast.error(`Error: ${error.message}`);
            } else {
                toast.success(`Voice deshabilitado para equipo ${teamId}`);
            }
        } catch {
            setVoiceEnabled(teamId, true);
            toast.error("Error al deshabilitar voice chat");
        } finally {
            setLoading(false);
        }
    };

    const handleSpectate = async (teamId: string, enable: boolean) => {
        setLoading(true);
        try {
            if (enable) {
                // Only 1 team at a time — disable any other spectated team first
                const currentSpectated = Object.keys(spectatingTeams).find(id => spectatingTeams[id] && id !== teamId);
                if (currentSpectated) {
                    const { error: disableErr } = await actions.voice.spectate({ teamId: currentSpectated, enable: false });
                    if (!disableErr) {
                        setSpectatingTeam(currentSpectated, false);
                    }
                }
            }
            const { error } = await actions.voice.spectate({ teamId, enable });
            if (error) {
                toast.error(`Error: ${error.message}`);
            } else {
                setSpectatingTeam(teamId, enable);
                toast.success(`${enable ? 'Specteando' : 'Dejando de spectear'} equipo ${teamId}`);
            }
        } catch {
            toast.error("Error al spectear");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                class="fixed bottom-20 right-4 z-50 bg-[#0a0a0a] border border-white/10 rounded-xl p-3 hover:bg-white/[0.02] hover:border-white/20 transition-all shadow-2xl"
                title="Control de Voice Chat"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
            </button>

            {isOpen && (
                <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs">
                    <div class="bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden">
                        {/* Header */}
                        <div class="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#15151a]">
                            <h3 class="text-lg font-anton uppercase tracking-wide text-white flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-electric-violet-500"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                                Voice Chat
                            </h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                class="p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                            </button>
                        </div>

                        {/* Body */}
                        <div class="p-6 overflow-y-auto max-h-[calc(80vh-70px)]">
                            <div class="space-y-2">
                                {Object.values(TEAMS).map(team => {
                                    const spectators = spectatingUsers[team] || [];

                                    return (
                                        <div key={team} class="bg-black/40 border border-white/5 rounded-xl p-4 transition-all hover:border-white/10">
                                            <div class="flex items-center justify-between mb-3">
                                                <span class="text-sm font-rubik font-semibold text-white capitalize">{team}</span>
                                                <div class="flex gap-1.5">
                                                    <button
                                                        onClick={() => handleEnableVoice(team)}
                                                        disabled={loading || voiceEnabledTeams[team]}
                                                        class="px-3 py-1.5 text-[10px] font-bold bg-green-500/10 hover:bg-green-500 disabled:bg-white/5 disabled:opacity-30 text-green-400 disabled:text-white/20 border border-green-500/20 disabled:border-white/5 rounded-lg transition-all flex items-center gap-1"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                                                        ON
                                                    </button>
                                                    <button
                                                        onClick={() => handleDisableVoice(team)}
                                                        disabled={loading || !voiceEnabledTeams[team]}
                                                        class="px-3 py-1.5 text-[10px] font-bold bg-red-500/10 hover:bg-red-500 disabled:bg-white/5 disabled:opacity-30 text-red-400 disabled:text-white/20 border border-red-500/20 disabled:border-white/5 rounded-lg transition-all flex items-center gap-1"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="2" x2="22" y1="2" y2="22"/><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/><path d="M5 10v2a7 7 0 0 0 12 5"/><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/></svg>
                                                        OFF
                                                    </button>
                                                    <button
                                                        onClick={() => handleSpectate(team, !spectatingTeams[team])}
                                                        disabled={loading}
                                                        class={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 ${spectatingTeams[team]
                                                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                                                : 'bg-white/5 text-white/30 border border-white/5 hover:text-white/50'}`}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                                        {spectatingTeams[team] ? 'ON' : 'OFF'}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Spectators list */}
                                            {spectators.length > 0 && (
                                                <div class="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-white/5">
                                                    {spectators.map((spec) => (
                                                        <span key={spec.id} class="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-md">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                                            {spec.name}
                                                        </span>
                                                    ))}
                                                </div>
                            )}

                                        </div>
                                    );
                                })}
                            </div>

                            <div class="mt-4 pt-4 border-t border-white/5">
                                <p class="text-[10px] font-mono text-white/20">
                                    Players hold <kbd class="px-1 py-0.5 bg-white/5 rounded-sm text-white/40">V</kbd> to talk &bull; Admins can spectate any team
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
