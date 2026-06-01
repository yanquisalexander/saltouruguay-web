import { useEffect, useRef, useState } from "preact/hooks";
import { useVoiceChatStore, type SpectatorInfo } from "@/stores/voiceChat";
import { type Players } from "../admin/streamer-wars/Players";
import { VoiceChatManager } from "@/services/voiceChatManager";

interface VoiceChatProps {
    userId: string;
    userName: string;
    teamId: string | null;
    isAdmin: boolean;
    players: Players[];
}

const VUMeter = ({ stream }: { stream: MediaStream | null }) => {
    const [level, setLevel] = useState(0);
    const rafRef = useRef<number>(0);

    useEffect(() => {
        if (!stream) return;
        try {
            const ac = new AudioContext();
            const source = ac.createMediaStreamSource(stream);
            const analyser = ac.createAnalyser();
            analyser.fftSize = 128;
            source.connect(analyser);
            const data = new Uint8Array(analyser.frequencyBinCount);

            const tick = () => {
                analyser.getByteFrequencyData(data);
                let sum = 0;
                for (let i = 0; i < data.length; i++) sum += data[i];
                setLevel(Math.min(sum / data.length / 2.5, 1));
                rafRef.current = requestAnimationFrame(tick);
            };
            tick();

            return () => {
                cancelAnimationFrame(rafRef.current);
                ac.close();
            };
        } catch { }
    }, [stream]);

    if (!stream) return null;

    const bars = 20;
    const activeBars = Math.round(level * bars);

    return (
        <div class="flex items-end gap-[2px] h-5">
            {Array.from({ length: bars }).map((_, i) => (
                <div
                    key={i}
                    class={`w-[4px] rounded-xs transition-all duration-75 ${i < activeBars
                            ? i < activeBars * 0.6
                                ? 'bg-green-500'
                                : i < activeBars * 0.85
                                    ? 'bg-yellow-500'
                                    : 'bg-red-500'
                            : 'bg-white/5'
                        }`}
                    style={{ height: `${((i + 1) / bars) * 100}%` }}
                />
            ))}
        </div>
    );
};

const ParticipantAvatar = ({
    player,
    isSelf,
    isTalking,
    isPTTActive,
    isSpectating,
    isMuted,
    peerState,
}: {
    player: { id: string; avatar: string; displayName: string };
    isSelf: boolean;
    isTalking: boolean;
    isPTTActive: boolean;
    isSpectating: boolean;
    isMuted: boolean;
    peerState?: string;
}) => {
    const showActive = isTalking || isPTTActive || (isSelf && isPTTActive);
    const statusColor = isMuted ? 'border-red-500/50' : showActive ? 'border-electric-violet-500' : 'border-white/10';
    const statusGlow = showActive ? 'shadow-[0_0_12px_rgba(145,70,255,0.3)]' : '';

    return (
        <div class={`flex items-center gap-2 p-1.5 rounded-lg transition-all ${showActive ? 'bg-electric-violet-500/5' : ''}`}>
            <div class="relative shrink-0">
                <img
                    src={player.avatar}
                    alt={player.displayName}
                    class={`w-7 h-7 rounded-full border-2 object-cover transition-all duration-150 ${statusColor} ${statusGlow}`}
                    onError={(e) => {
                        const img = e.currentTarget;
                        if (img.src.startsWith('data:')) return;
                        img.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28'%3E%3Crect width='28' height='28' fill='%23222'/%3E%3C/svg%3E";
                    }}
                />
                {isSpectating && (
                    <div class="absolute -top-1 -right-1 bg-blue-600 rounded-full w-3.5 h-3.5 flex items-center justify-center ring-1 ring-black">
                        <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </div>
                )}
                {isMuted && !isSpectating && (
                    <div class="absolute -bottom-1 -right-1 bg-red-500/80 rounded-full w-3.5 h-3.5 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="2" x2="22" y1="2" y2="22"/><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/><path d="M5 10v2a7 7 0 0 0 12 5"/><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/></svg>
                    </div>
                )}
            </div>
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1.5">
                    <span class={`text-[11px] font-mono truncate ${showActive ? 'text-electric-violet-300' : isSpectating ? 'text-blue-400' : 'text-white/50'}`}>
                        {player.displayName}
                        {isSpectating && <span class="text-blue-500 ml-1 text-[9px]">(ESP)</span>}
                    </span>
                </div>
                <div class="flex gap-1 mt-0.5">
                    {peerState && peerState !== 'connected' && (
                        <span class="text-[8px] text-yellow-500 font-mono">{peerState}</span>
                    )}
                    {isSelf && isPTTActive && (
                        <span class="text-[8px] text-green-400 font-mono">TX</span>
                    )}
                    {!isSelf && isTalking && (
                        <span class="text-[8px] text-electric-violet-400 font-mono">RX</span>
                    )}
                </div>
            </div>
            {(isTalking || (isSelf && isPTTActive)) && (
                <div class="flex items-end gap-[1.5px] h-3 shrink-0">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            class="w-[2.5px] rounded-xs bg-electric-violet-500"
                            style={{
                                height: `${40 + i * 20}%`,
                                animation: `equalizer 0.${i * 2 + 3}s ease-in-out infinite`,
                                animationDelay: `${i * 0.1}s`,
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export const VoiceChat = ({ userId, userName, teamId, isAdmin, players }: VoiceChatProps) => {
    const {
        currentTeamId,
        voiceEnabledTeams,
        spectatingTeams,
        spectatingUsers,
        isLocalMicEnabled,
        isPTTActive,
        isAdminSpectator,
        setCurrentTeamId,
        setCurrentUserId,
        setIsAdminSpectator,
        peerCount,
        peerConnectionStates,
        talkingUsers,
        pttActiveUsers,
        forcedMuteTargets,
        connectionError,
        isReconnecting,
        availableMics,
        selectedMicId,
        setSelectedMicId,
    } = useVoiceChatStore();

    const isMuted = forcedMuteTargets.includes(userId);

    useEffect(() => {
        if (teamId !== currentTeamId) {
            setCurrentTeamId(teamId);
        }
    }, [teamId, currentTeamId]);

    useEffect(() => {
        setIsAdminSpectator(isAdmin);
    }, [isAdmin]);

    useEffect(() => {
        setCurrentUserId(userId);
        if (!teamId) return;
        const manager = VoiceChatManager.getInstance();
        manager.init(userId, userName, teamId, isAdmin, voiceEnabledTeams, spectatingTeams);
    }, [userId, userName, teamId, isAdmin, voiceEnabledTeams, spectatingTeams]);

    const manager = VoiceChatManager.getInstance();
    const localStream = manager.localStream;

    const extractTeamName = (id: string | null) => {
        if (!id) return 'NONE';
        return id.split('-').pop()?.toUpperCase() || 'UNKNOWN';
    };

    // Spectator mode: admin can listen to another team without talking
    const spectatedTeamId = isAdmin ? Object.keys(spectatingTeams).find(id => spectatingTeams[id]) : null;
    const isSpectatorMode = !!spectatedTeamId;
    const displayTeamId = spectatedTeamId || teamId;
    const displayTeamName = extractTeamName(displayTeamId);
    const teamPlayers = players.filter(p => p.team === teamId || p.team === `team-${teamId}`);
    const displayTeamPlayers = isSpectatorMode
        ? players.filter(p => p.team === displayTeamId || p.team === `team-${displayTeamId}`)
        : teamPlayers;
    const displaySpectators: SpectatorInfo[] = displayTeamId ? spectatingUsers[displayTeamId] || [] : [];
    const voiceIsReady = displayTeamId ? voiceEnabledTeams[displayTeamId] : false;

    if (!displayTeamId) return null;
    if (!isSpectatorMode && !voiceIsReady) return null;

    return (
        <div class={`fixed ${isAdminSpectator ? 'top-4 left-4' : 'bottom-4 right-4'} z-50 select-none`}>
            <div class="bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl w-64 overflow-hidden backdrop-blur-xs">
                {/* Header */}
                <div class="px-4 py-3 border-b border-white/5 bg-[#15151a] flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <div class={`w-2 h-2 rounded-full ${isReconnecting ? 'bg-yellow-500 animate-pulse' : peerCount > 0 ? 'bg-green-500' : 'bg-white/10'}`} />
                        <span class="text-xs font-anton uppercase tracking-wide text-white">{displayTeamName}{isSpectatorMode && <span class="text-blue-400 ml-1 text-[9px] font-mono">(ESP)</span>}</span>
                    </div>
                    <div class="flex items-center gap-2">
                        {isReconnecting && <span class="text-[8px] font-mono text-yellow-500">RECON</span>}
                        <span class="text-[9px] font-mono text-white/30">{peerCount} CH</span>
                    </div>
                </div>

                {/* Participant list */}
                <div class="px-3 py-2 max-h-48 overflow-y-auto scrollbar-hide space-y-0.5">
                    {/* Spectators */}
                    {displaySpectators.map((spec) => (
                        <ParticipantAvatar
                            key={`spec-${spec.id}`}
                            player={{ id: spec.id, avatar: "", displayName: spec.name }}
                            isSelf={false}
                            isTalking={false}
                            isPTTActive={false}
                            isSpectating={true}
                            isMuted={false}
                        />
                    ))}

                    {/* Team players */}
                    {displayTeamPlayers.map((player) => {
                        const sid = String(player.id);
                        const isPlayerTalking = talkingUsers.includes(sid) || talkingUsers.includes(player.id as any);
                        const isPlayerPTT = pttActiveUsers.includes(sid) || pttActiveUsers.includes(player.id as any);
                        const isPlayerMuted = forcedMuteTargets.includes(sid);
                        const peerState = peerConnectionStates[sid] || peerConnectionStates[player.id as any];

                        return (
                            <ParticipantAvatar
                                key={player.id}
                                player={player}
                                isSelf={false}
                                isTalking={isPlayerTalking}
                                isPTTActive={isPlayerPTT}
                                isSpectating={false}
                                isMuted={isPlayerMuted}
                                peerState={peerState}
                            />
                        );
                    })}

                    {displayTeamPlayers.length === 0 && displaySpectators.length === 0 && (
                        <div class="text-[10px] text-white/20 font-mono text-center py-4">
                            No players in channel
                        </div>
                    )}
                </div>

                {/* Control bar */}
                <div class="px-4 py-3 border-t border-white/5 bg-black/30 space-y-2">
                    {isSpectatorMode && !voiceIsReady ? (
                        <div class="flex items-center gap-2 py-1">
                            <div class="w-2 h-2 rounded-full bg-white/10" />
                            <span class="text-[9px] font-mono text-white/20">VOICE DESACTIVADO</span>
                        </div>
                    ) : isSpectatorMode ? (
                        <div class="flex items-center gap-2 py-1">
                            <div class="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                            <span class="text-[9px] font-mono text-blue-400">ESCUCHANDO</span>
                        </div>
                    ) : (
                        <>
                            {/* VU Meter + PTT status */}
                            <div class="flex items-center gap-2">
                                <VUMeter stream={localStream} />
                                <span class={`text-[9px] font-mono whitespace-nowrap ${isPTTActive ? 'text-green-400' : isMuted ? 'text-red-400' : 'text-white/30'}`}>
                                    {isMuted ? 'MUTED' : isPTTActive ? 'TALKING' : 'HOLD [V]'}
                                </span>
                            </div>

                            {/* PTT button for mobile / click */}
                            <button
                                onMouseDown={(e) => { e.preventDefault(); VoiceChatManager.getInstance().pttStart(); }}
                                onMouseUp={() => VoiceChatManager.getInstance().pttStop()}
                                onMouseLeave={() => VoiceChatManager.getInstance().pttStop()}
                                onTouchStart={(e) => { e.preventDefault(); VoiceChatManager.getInstance().pttStart(); }}
                                onTouchEnd={() => VoiceChatManager.getInstance().pttStop()}
                                class={`w-full py-2 rounded-lg text-[10px] font-bold font-mono uppercase tracking-wider transition-all select-none touch-none ${isPTTActive
                                    ? 'bg-green-500/20 text-green-400 border border-green-500/30 shadow-[0_0_12px_rgba(34,197,94,0.2)]'
                                    : 'bg-white/5 text-white/30 border border-white/5 hover:bg-white/10 active:bg-green-500/10 active:text-green-400 active:border-green-500/20'}`}
                            >
                                {isPTTActive ? 'HABLANDO' : 'PULSA PARA HABLAR'}
                            </button>

                            {/* Mic selector */}
                            {availableMics.length > 1 && (
                                <select
                                    value={selectedMicId ?? ""}
                                    onChange={(e) => {
                                        const val = (e.target as HTMLSelectElement).value;
                                        if (val) {
                                            setSelectedMicId(val);
                                            VoiceChatManager.getInstance().setMicDevice(val);
                                        }
                                    }}
                                    class="w-full text-[9px] font-mono bg-black/40 text-white/60 border border-white/5 rounded-lg px-2 py-1 outline-hidden cursor-pointer"
                                >
                                    <option value="">Default Mic</option>
                                    {availableMics.map((mic) => (
                                        <option key={mic.deviceId} value={mic.deviceId}>
                                            {mic.label || `Mic ${mic.deviceId.slice(0, 8)}`}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </>
                    )}

                    {/* Connection error */}
                    {connectionError && (
                        <div class="text-[9px] font-mono text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-2 py-1">
                            {connectionError}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
