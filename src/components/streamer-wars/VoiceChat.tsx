import { useEffect, useRef, useState, useCallback } from "preact/hooks";
import type { Channel } from "pusher-js";
import { useVoiceChatStore } from "@/stores/voiceChat";
import { LucideMic, LucideMicOff, LucideVolume2 } from "lucide-preact";
import { actions } from "astro:actions";
import { type Players } from "../admin/streamer-wars/Players";
import { usePusher } from "@/hooks/usePusher";
import { pusherService } from "@/services/pusher.client";

// --- CONFIG & CONSTANTS ---
const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:3478" },
    { urls: "stun:stun2.l.google.com:19302" }
    // Reduje la lista, generalmente 2-3 STUN servers de Google son suficientes y más rápidos de negociar
  ]
};
const PTT_KEY = 'v';
const PTT_DEBOUNCE_MS = 80;

// --- CUSTOM HOOK: Local Audio Management ---
const useLocalAudio = (shouldInit: boolean) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shouldInit) return;

    let localStream: MediaStream | null = null;

    const init = async () => {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Iniciar muteado
        localStream.getAudioTracks().forEach(track => (track.enabled = false));
        setStream(localStream);
        setError(null);
      } catch (err: any) {
        console.error("Error mic:", err);
        if (err.name === "NotAllowedError") setError("Permiso denegado");
        else if (err.name === "NotFoundError") setError("Micrófono no encontrado");
        else setError("Error de micrófono");
      }
    };

    init();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [shouldInit]);

  return { stream, error };
};

// --- CUSTOM HOOK: Push To Talk Logic ---
const usePTT = (
  localStream: MediaStream | null,
  isActive: boolean,
  setActive: (val: boolean) => void,
  setMicEnabled: (val: boolean) => void
) => {
  const debounceRef = useRef<number | null>(null);
  const isInputFocusedRef = useRef(false);

  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      isInputFocusedRef.current = (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
    };

    document.addEventListener('focusin', handleFocus);
    document.addEventListener('focusout', handleFocus);
    return () => {
      document.removeEventListener('focusin', handleFocus);
      document.removeEventListener('focusout', handleFocus);
    };
  }, []);

  useEffect(() => {
    if (!localStream) return;

    const startTalking = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        setActive(true);
        localStream.getAudioTracks().forEach(t => (t.enabled = true));
        setMicEnabled(true);
      }, PTT_DEBOUNCE_MS);
    };

    const stopTalking = () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      setActive(false);
      localStream.getAudioTracks().forEach(t => (t.enabled = false));
      setMicEnabled(false);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isInputFocusedRef.current) return;
      if (e.key.toLowerCase() === PTT_KEY && !isActive) {
        e.preventDefault();
        startTalking();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === PTT_KEY && isActive) {
        e.preventDefault();
        stopTalking();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [localStream, isActive, setActive, setMicEnabled]);
};

// --- MAIN COMPONENT ---

interface VoiceChatProps {
  userId: string;
  teamId: string | null;
  isAdmin: boolean;
  players: Players[];
}

export const VoiceChat = ({ userId, teamId, isAdmin, players }: VoiceChatProps) => {
  const { pusher } = usePusher();
  const {
    currentTeamId,
    voiceEnabledTeams,
    spectatingTeams,
    peerConnections,
    // Eliminamos localStream del store si solo se usa aquí, o lo actualizamos
    setLocalStream,
    isLocalMicEnabled,
    isPTTActive,
    isAdminSpectator,
    setCurrentTeamId,
    setVoiceEnabled,
    addPeerConnection,
    removePeerConnection,
    setLocalMicEnabled,
    setPTTActive,
    setIsAdminSpectator,
    cleanup
  } = useVoiceChatStore();

  const [pendingCandidates, setPendingCandidates] = useState<Record<string, RTCIceCandidateInit[]>>({});
  // Referencia para guardar elementos de audio y limpiarlos
  const remoteAudiosRef = useRef<Record<string, HTMLAudioElement>>({});

  // 1. Sync Store State
  useEffect(() => {
    if (teamId !== currentTeamId) {
      if (currentTeamId) cleanup();
      setCurrentTeamId(teamId);
    }
  }, [teamId, currentTeamId]);

  useEffect(() => {
    setIsAdminSpectator(isAdmin);
  }, [isAdmin]);

  // 2. Init Audio (Usando el Hook)
  const shouldInitAudio = !!(isAdmin || (teamId && voiceEnabledTeams[teamId]));
  const { stream: localStream, error: connectionError } = useLocalAudio(shouldInitAudio);

  // Sincronizar stream con el store global si es necesario
  useEffect(() => {
    if (localStream) setLocalStream(localStream);
  }, [localStream]);

  // 3. Init PTT (Usando el Hook)
  // Solo activar PTT si NO es espectador admin y hay un equipo válido
  usePTT(
    !isAdminSpectator && teamId && voiceEnabledTeams[teamId] ? localStream : null,
    isPTTActive,
    setPTTActive,
    setLocalMicEnabled
  );

  // --- WEBRTC HELPER FUNCTIONS ---

  // Helper para enviar señales
  const sendSignal = useCallback(async (targetTeamId: string, event: string, data: any) => {
    try {
      await actions.voice.signal({
        teamId: targetTeamId,
        event: event as any,
        data: { fromUserId: userId, ...data }
      });
    } catch (err) {
      console.error(`Error signaling ${event}:`, err);
    }
  }, [userId]);

  // Setup Peer Connection
  const createPeerConnection = useCallback((peerId: string, isSpectating: boolean, channelTeamId: string) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal(channelTeamId, "signal:iceCandidate", {
          toUserId: peerId,
          candidate: event.candidate.toJSON()
        });
      }
    };

    pc.ontrack = (event) => {
      const audio = new Audio();
      audio.srcObject = event.streams[0];
      audio.volume = 1;
      audio.autoplay = true; // Importante para navegadores modernos
      audio.play().catch(e => console.warn("Autoplay blocked", e));
      remoteAudiosRef.current[peerId] = audio;
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        removePeerConnection(peerId);
        // Limpiar audio
        if (remoteAudiosRef.current[peerId]) {
          remoteAudiosRef.current[peerId].pause();
          delete remoteAudiosRef.current[peerId];
        }
      }
    };

    // Añadir tracks locales
    if (localStream && !isAdminSpectator && !isSpectating) {
      localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    }

    return pc;
  }, [localStream, isAdminSpectator, sendSignal, removePeerConnection]);

  // Manejo de Ofertas/Respuestas/ICE
  const handleWebRTCMessage = useCallback(async (type: string, data: any, channelTeamId: string, isSpectating: boolean) => {
    const { fromUserId, sdp, candidate } = data;
    let pc = peerConnections[fromUserId];

    try {
      if (type === 'offer') {
        if (!pc) {
          pc = createPeerConnection(fromUserId, isSpectating, channelTeamId);
          addPeerConnection(fromUserId, pc);
        }
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));

        // Procesar candidatos pendientes si existen
        const pending = pendingCandidates[fromUserId];
        if (pending) {
          for (const cand of pending) await pc.addIceCandidate(new RTCIceCandidate(cand));
          setPendingCandidates(prev => {
            const next = { ...prev };
            delete next[fromUserId];
            return next;
          });
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal(channelTeamId, "signal:answer", { toUserId: fromUserId, sdp: answer });
      }

      else if (type === 'answer' && pc) {
        if (pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        }
      }

      else if (type === 'candidate') {
        if (pc && pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          setPendingCandidates(prev => ({
            ...prev,
            [fromUserId]: [...(prev[fromUserId] || []), candidate]
          }));
        }
      }
    } catch (err) {
      console.error(`WebRTC Error (${type}):`, err);
    }
  }, [peerConnections, createPeerConnection, addPeerConnection, pendingCandidates, sendSignal]);


  // 4. Pusher Subscriptions & Signaling
  useEffect(() => {
    if (!pusher) return;

    const channels: Channel[] = [];
    const channelHandlers = new Map<string, Record<string, (data: any) => void>>();
    const teamsToSubscribe = [];

    // Determinar a qué equipos suscribirse
    if (teamId && !isAdminSpectator) teamsToSubscribe.push({ id: teamId, isSpec: false });
    if (isAdminSpectator) {
      Object.keys(spectatingTeams)
        .filter(id => spectatingTeams[id])
        .forEach(id => teamsToSubscribe.push({ id, isSpec: true }));
    }

    teamsToSubscribe.forEach(({ id: currentChannelTeamId, isSpec }) => {
      const channelName = `team-${currentChannelTeamId}-voice-signal`;
      const channel = pusherService.subscribe(channelName);
      channels.push(channel);

      // Define handlers for this channel
      const handleVoiceEnabled = (data: any) => {
        setVoiceEnabled(data.teamId, true);
        sendSignal(data.teamId, "voice:user-joined", { userId });
      };

      const handleVoiceDisabled = (data: any) => {
        setVoiceEnabled(data.teamId, false);
        if (!isSpec) cleanup();
      };

      const handleForceMute = (data: any) => {
        if (data.targetUserId === userId && !isSpec && localStream) {
          localStream.getAudioTracks().forEach(track => (track.enabled = false));
          setLocalMicEnabled(false);
        }
      };

      const handleSignalOffer = (d: any) => {
        if (d.toUserId === userId) handleWebRTCMessage('offer', d, currentChannelTeamId, isSpec);
      };

      const handleSignalAnswer = (d: any) => {
        if (d.toUserId === userId) handleWebRTCMessage('answer', d, currentChannelTeamId, isSpec);
      };

      const handleSignalIceCandidate = (d: any) => {
        if (d.toUserId === userId) handleWebRTCMessage('candidate', d, currentChannelTeamId, isSpec);
      };

      const handleUserJoined = async (d: any) => {
        if (d.userId !== userId && !peerConnections[d.userId] && !isSpec) {
          const pc = createPeerConnection(d.userId, false, currentChannelTeamId);
          addPeerConnection(d.userId, pc);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          sendSignal(currentChannelTeamId, "signal:offer", { toUserId: d.userId, sdp: offer });
        }
      };

      const handleSpectatorJoined = async (d: any) => {
        if (!isSpec) {
          const pc = createPeerConnection(d.spectatorId, false, currentChannelTeamId);
          addPeerConnection(d.spectatorId, pc);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          sendSignal(currentChannelTeamId, "signal:offer", { toUserId: d.spectatorId, sdp: offer });
        }
      };

      const handleSpectatorLeft = (d: any) => {
        removePeerConnection(d.spectatorId);
      };

      // Bind all handlers using the service
      pusherService.bind(channelName, "voice:enabled", handleVoiceEnabled);
      pusherService.bind(channelName, "voice:disabled", handleVoiceDisabled);
      pusherService.bind(channelName, "voice:force-mute", handleForceMute);
      pusherService.bind(channelName, "signal:offer", handleSignalOffer);
      pusherService.bind(channelName, "signal:answer", handleSignalAnswer);
      pusherService.bind(channelName, "signal:iceCandidate", handleSignalIceCandidate);
      pusherService.bind(channelName, "voice:user-joined", handleUserJoined);
      pusherService.bind(channelName, "voice:spectator-joined", handleSpectatorJoined);
      pusherService.bind(channelName, "voice:spectator-left", handleSpectatorLeft);

      // Store handlers for cleanup
      channelHandlers.set(channelName, {
        "voice:enabled": handleVoiceEnabled,
        "voice:disabled": handleVoiceDisabled,
        "voice:force-mute": handleForceMute,
        "signal:offer": handleSignalOffer,
        "signal:answer": handleSignalAnswer,
        "signal:iceCandidate": handleSignalIceCandidate,
        "voice:user-joined": handleUserJoined,
        "voice:spectator-joined": handleSpectatorJoined,
        "voice:spectator-left": handleSpectatorLeft,
      });
    });

    return () => {
      // Unbind all handlers properly
      channelHandlers.forEach((handlers, channelName) => {
        Object.entries(handlers).forEach(([eventName, handler]) => {
          pusherService.unbind(channelName, eventName, handler);
        });
      });
      channelHandlers.clear();
    };
  }, [pusher, teamId, spectatingTeams, isAdminSpectator, localStream, handleWebRTCMessage]);

  // Get team info
  const spectatingTeamNames = Object.keys(spectatingTeams).filter(id => spectatingTeams[id]);
  const teamName = teamId ? teamId.toUpperCase() : (spectatingTeamNames.length > 0 ? 'SPECTATOR' : 'VOICE');
  const teamColor = teamId || 'gray';

  // Color mapping for retro style
  const colorClasses = {
    red: 'border-red-500 bg-red-900/20 text-red-300',
    blue: 'border-blue-500 bg-blue-900/20 text-blue-300',
    yellow: 'border-yellow-500 bg-yellow-900/20 text-yellow-300',
    purple: 'border-purple-500 bg-purple-900/20 text-purple-300',
    green: 'border-green-500 bg-green-900/20 text-green-300',
    white: 'border-white bg-white/10 text-white',
    gray: 'border-gray-500 bg-gray-900/20 text-gray-300'
  };

  // Get team players
  const getTeamPlayers = () => {
    if (isAdminSpectator) {
      // Para spectator, mostrar players de equipos specteados
      const spectatingTeamIds = Object.keys(spectatingTeams).filter(id => spectatingTeams[id]);
      return players.filter(p => spectatingTeamIds.includes(p.team || ''));
    } else {
      // Para equipo propio
      return players.filter(p => p.team === teamId);
    }
  };

  const teamPlayers = getTeamPlayers();

  // Render
  if (!teamId || !voiceEnabledTeams[teamId]) return null;

  return (
    <div className={`${isAdminSpectator && !teamId ? 'fixed top-4 left-4 z-50' : 'fixed bottom-4 right-4 z-50'} flex flex-col ${isAdminSpectator && !teamId ? 'gap-1 p-2' : 'gap-2 p-4'} bg-black/90 rounded-lg border-2 ${colorClasses[teamColor]} max-w-xs shadow-2xl ${isAdminSpectator && !teamId ? 'text-xs max-w-[200px]' : ''}`}>
      <div className={`flex items-center gap-2 ${isAdminSpectator && !teamId ? 'text-[10px]' : 'text-xs'} font-press-start-2p uppercase tracking-wider`}>
        <LucideVolume2 className={`${isAdminSpectator && !teamId ? 'w-3 h-3' : 'w-4 h-4'}`} />
        <span>VOICE - {teamName}</span>
      </div>

      {!isAdminSpectator && connectionError && (
        <div className="text-xs text-red-200 bg-red-900/50 p-2 rounded border border-red-800 font-mono">
          {connectionError}
        </div>
      )}

      {!isAdminSpectator && (
        <div className={`flex items-center gap-2 transition-colors duration-200 ${isLocalMicEnabled ? 'text-green-400' : 'text-gray-400'}`}>
          {isLocalMicEnabled ? <LucideMic className="w-5 h-5 animate-pulse" /> : <LucideMicOff className="w-5 h-5" />}
          <span className="text-sm font-press-start-2p">
            {isLocalMicEnabled ? "TX..." : "PRESS V"}
          </span>
        </div>
      )}

      {isAdminSpectator && Object.keys(spectatingTeams).filter(id => spectatingTeams[id]).length > 0 && (
        <div className="text-[10px] text-gray-400 font-mono">
          TEAMS: {Object.keys(spectatingTeams).filter(id => spectatingTeams[id]).join(', ').toUpperCase()}
        </div>
      )}

      <div className={`text-[10px] text-gray-500 flex justify-between mt-1 border-t border-gray-700 ${isAdminSpectator ? 'pt-1' : 'pt-2'} font-mono`}>
        <span>PEERS:</span>
        <span className="text-gray-300">{Object.keys(peerConnections).length}</span>
      </div>

      {teamPlayers.length > 0 && (
        <div className="mt-2 border-t border-gray-700 pt-2">
          <div className="text-[10px] text-gray-400 font-mono mb-1">TEAM:</div>
          <div className="flex gap-1 flex-wrap">
            {teamPlayers.slice(0, 6).map(player => (
              <img
                key={player.id}
                src={player.avatar}
                alt={player.displayName}
                className="w-6 h-6 rounded-full border border-gray-600"
                onError={(e) => e.currentTarget.src = "/fallback.png"}
              />
            ))}
            {teamPlayers.length > 6 && (
              <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-[8px] font-mono text-gray-300">
                +{teamPlayers.length - 6}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};