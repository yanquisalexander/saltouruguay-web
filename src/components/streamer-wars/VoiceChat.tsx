import { useEffect, useRef, useState } from "preact/hooks";
import type Pusher from "pusher-js";
import type { Channel } from "pusher-js";
import { useVoiceChatStore } from "@/stores/voiceChat";
import { LucideMic, LucideMicOff, LucideVolume2 } from "lucide-preact";
import { actions } from "astro:actions";

interface VoiceChatProps {
  pusher: Pusher | null;
  userId: string;
  teamId: string | null;
  isAdmin: boolean;
}

// STUN configuration
const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" }
  ]
};

const PTT_DEBOUNCE_MS = 80;

export const VoiceChat = ({ pusher, userId, teamId, isAdmin }: VoiceChatProps) => {
  const {
    currentTeamId,
    voiceEnabledTeams,
    spectatingTeams,
    peerConnections,
    localStream,
    isLocalMicEnabled,
    isPTTActive,
    isAdminSpectator,
    setCurrentTeamId,
    setVoiceEnabled,
    setSpectatingTeam,
    addPeerConnection,
    removePeerConnection,
    setLocalStream,
    setLocalMicEnabled,
    setPTTActive,
    setIsAdminSpectator,
    cleanup
  } = useVoiceChatStore();

  const signalChannelRef = useRef<Channel | null>(null);
  const pttDebounceTimerRef = useRef<number | null>(null);
  const isInputFocusedRef = useRef(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Update team ID when it changes
  useEffect(() => {
    if (teamId !== currentTeamId) {
      // Clean up old connections when team changes
      if (currentTeamId) {
        cleanup();
      }
      setCurrentTeamId(teamId);
    }
  }, [teamId, currentTeamId]);

  // Set admin spectator mode
  useEffect(() => {
    setIsAdminSpectator(isAdmin);
  }, [isAdmin]);

  // Initialize local audio stream
  useEffect(() => {
    const initAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // Start with mic disabled (PTT)
        stream.getAudioTracks().forEach(track => {
          track.enabled = false;
        });

        setLocalStream(stream);
        setConnectionError(null);
      } catch (error) {
        console.error("Failed to get audio stream:", error);
        if (error instanceof Error) {
          if (error.name === "NotAllowedError") {
            setConnectionError("Permiso de micrófono denegado");
          } else if (error.name === "NotFoundError") {
            setConnectionError("No se encontró micrófono");
          } else {
            setConnectionError("Error al acceder al micrófono");
          }
        }
      }
    };

    if (!localStream && (!isAdmin || teamId)) {
      initAudio();
    }

    return () => {
      // Cleanup on unmount
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isAdminSpectator]);

  // Subscribe to team voice signal channel
  useEffect(() => {
    if (!pusher) return;

    const channels: Channel[] = [];

    // Subscribe to own team channel if not spectator or if teamId exists
    if (teamId && !isAdminSpectator) {
      const channelName = `team-${teamId}-voice-signal`;
      const channel = pusher.subscribe(channelName);
      channels.push(channel);

      // Bind events for own team
      bindChannelEvents(channel, teamId, false);
    }

    // Subscribe to spectating team channels if admin spectator
    if (isAdminSpectator) {
      Object.keys(spectatingTeams).forEach(spectatingTeamId => {
        if (spectatingTeams[spectatingTeamId]) {
          const channelName = `team-${spectatingTeamId}-voice-signal`;
          const channel = pusher.subscribe(channelName);
          channels.push(channel);

          // Bind events for spectating team
          bindChannelEvents(channel, spectatingTeamId, true);
        }
      });
    }

    // Function to bind events to a channel
    function bindChannelEvents(channel: Channel, channelTeamId: string, isSpectating: boolean) {
      // Handle voice enabled event
      channel.bind("voice:enabled", (data: any) => {
        console.log("Voice enabled for team:", data.teamId);
        setVoiceEnabled(data.teamId, true);

        if (!isSpectating) {
          // Announce presence to other peers
          actions.voice.signal({
            teamId: data.teamId,
            event: "voice:user-joined" as any,
            data: {
              fromUserId: userId,
              toUserId: "broadcast",
              userId: userId
            }
          });
        } else {
          // As spectator, announce presence to receive offers
          actions.voice.signal({
            teamId: data.teamId,
            event: "voice:user-joined" as any,
            data: {
              fromUserId: userId,
              toUserId: "broadcast",
              userId: userId
            }
          });
        }
      });

      // Handle voice disabled event
      channel.bind("voice:disabled", (data: any) => {
        console.log("Voice disabled for team:", data.teamId);
        setVoiceEnabled(data.teamId, false);
        if (!isSpectating) {
          cleanup();
        }
      });

      // Handle force mute event
      channel.bind("voice:force-mute", (data: any) => {
        if (data.targetUserId === userId && !isSpectating) {
          console.log("Force muted by admin");
          if (localStream) {
            localStream.getAudioTracks().forEach(track => {
              track.enabled = false;
            });
            setLocalMicEnabled(false);
          }
        }
      });

      // Handle WebRTC signaling
      channel.bind("signal:offer", async (data: any) => {
        if (data.toUserId === userId) {
          await handleOffer(data.fromUserId, data.sdp, channelTeamId, isSpectating);
        }
      });

      channel.bind("signal:answer", async (data: any) => {
        if (data.toUserId === userId) {
          await handleAnswer(data.fromUserId, data.sdp);
        }
      });

      channel.bind("signal:iceCandidate", async (data: any) => {
        if (data.toUserId === userId) {
          await handleIceCandidate(data.fromUserId, data.candidate);
        }
      });

      // Handle user joined - initiate connection
      channel.bind("voice:user-joined", async (data: any) => {
        if (data.userId !== userId && !peerConnections[data.userId]) {
          if (!isSpectating) {
            // Create offer to the new user
            await createOffer(data.userId, channelTeamId);
          } else {
            // As spectator, wait for offer from others
          }
        }
      });
    }

    return () => {
      channels.forEach(channel => {
        channel.unbind_all();
        channel.unsubscribe();
      });
    };
  }, [pusher, teamId, userId, peerConnections, isAdminSpectator, spectatingTeams]);

  // Handle offer from peer
  const handleOffer = async (fromUserId: string, sdp: RTCSessionDescriptionInit, channelTeamId: string, isSpectating: boolean) => {
    try {
      const pc = new RTCPeerConnection(ICE_SERVERS);

      // Set up event handlers
      setupPeerConnection(pc, fromUserId, isSpectating, channelTeamId);

      // Set remote description
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));

      // Create answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Send answer back via action only if not spectating
      if (!isSpectating) {
        await actions.voice.signal({
          teamId: channelTeamId,
          event: "signal:answer",
          data: {
            fromUserId: userId,
            toUserId: fromUserId,
            sdp: answer
          }
        });
      }

      addPeerConnection(fromUserId, pc);
    } catch (error) {
      console.error("Error handling offer:", error);
    }
  };

  // Handle answer from peer
  const handleAnswer = async (fromUserId: string, sdp: RTCSessionDescriptionInit) => {
    try {
      const pc = peerConnections[fromUserId];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      }
    } catch (error) {
      console.error("Error handling answer:", error);
    }
  };

  // Handle ICE candidate
  const handleIceCandidate = async (fromUserId: string, candidate: RTCIceCandidateInit) => {
    try {
      const pc = peerConnections[fromUserId];
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error("Error handling ICE candidate:", error);
    }
  };

  // Setup peer connection event handlers
  const setupPeerConnection = (pc: RTCPeerConnection, peerId: string, isSpectating: boolean = false, teamIdForSignal: string = '') => {
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        actions.voice.signal({
          teamId: teamIdForSignal,
          event: "signal:iceCandidate",
          data: {
            fromUserId: userId,
            toUserId: peerId,
            candidate: event.candidate.toJSON()
          }
        });
      }
    };

    // Handle incoming audio track
    pc.ontrack = (event) => {
      console.log("Received remote audio track from:", peerId);
      const audioElement = new Audio();
      audioElement.srcObject = event.streams[0];
      audioElement.play().catch(err => console.error("Error playing audio:", err));
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`Peer ${peerId} connection state:`, pc.connectionState);
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        removePeerConnection(peerId);
      }
    };

    // Add local audio track (only if not admin spectator and not spectating this connection)
    if (localStream && !isAdminSpectator && !isSpectating) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }
  };

  // Create offer to peer
  const createOffer = async (toUserId: string, channelTeamId: string) => {
    try {
      const pc = new RTCPeerConnection(ICE_SERVERS);

      // Set up event handlers
      setupPeerConnection(pc, toUserId, false, channelTeamId);

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send offer via action
      await actions.voice.signal({
        teamId: channelTeamId,
        event: "signal:offer",
        data: {
          fromUserId: userId,
          toUserId,
          sdp: offer
        }
      });

      addPeerConnection(toUserId, pc);
    } catch (error) {
      console.error("Error creating offer:", error);
    }
  };

  // PTT key handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't activate PTT if user is typing in input/textarea
      if (isInputFocusedRef.current) return;

      if (e.key.toLowerCase() === 'v' && !isPTTActive && localStream && teamId && voiceEnabledTeams[teamId]) {
        e.preventDefault();

        // Debounce PTT activation
        if (pttDebounceTimerRef.current) {
          clearTimeout(pttDebounceTimerRef.current);
        }

        pttDebounceTimerRef.current = window.setTimeout(() => {
          setPTTActive(true);
          localStream.getAudioTracks().forEach(track => {
            track.enabled = true;
          });
          setLocalMicEnabled(true);
        }, PTT_DEBOUNCE_MS);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'v' && isPTTActive && localStream) {
        e.preventDefault();

        // Clear debounce timer if still pending
        if (pttDebounceTimerRef.current) {
          clearTimeout(pttDebounceTimerRef.current);
          pttDebounceTimerRef.current = null;
        }

        setPTTActive(false);
        localStream.getAudioTracks().forEach(track => {
          track.enabled = false;
        });
        setLocalMicEnabled(false);
      }
    };

    // Track focus on input/textarea elements
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        isInputFocusedRef.current = true;
      }
    };

    const handleFocusOut = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        isInputFocusedRef.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);

      if (pttDebounceTimerRef.current) {
        clearTimeout(pttDebounceTimerRef.current);
      }
    };
  }, [isPTTActive, localStream, teamId, voiceEnabledTeams]);

  // Cleanup on unmount and visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        cleanup();
      }
    };

    const handleBeforeUnload = () => {
      cleanup();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Don't render if no team or voice not enabled for team
  if (!teamId || !voiceEnabledTeams[teamId]) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 p-4 bg-black/80 rounded-lg border border-gray-700 max-w-xs">
      {/* Voice enabled indicator */}
      <div className="flex items-center gap-2 text-xs text-gray-300">
        <LucideVolume2 className="w-4 h-4" />
        <span>Voice habilitado</span>
      </div>

      {/* Error message */}
      {connectionError && (
        <div className="text-xs text-red-400 bg-red-900/20 p-2 rounded">
          {connectionError}
        </div>
      )}

      {/* PTT indicator */}
      {!isAdminSpectator && (
        <div className="flex items-center gap-2">
          {isLocalMicEnabled ? (
            <div className="flex items-center gap-2 text-green-500">
              <LucideMic className="w-5 h-5 animate-pulse" />
              <span className="text-sm font-medium">Transmitiendo</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-gray-400">
              <LucideMicOff className="w-5 h-5" />
              <span className="text-sm">Mantén V para hablar</span>
            </div>
          )}
        </div>
      )}

      {/* Admin spectator indicator */}
      {isAdminSpectator && (
        <div className="text-xs text-blue-400">
          Modo espectador (solo escucha)
        </div>
      )}

      {/* Connection count */}
      <div className="text-xs text-gray-500">
        {Object.keys(peerConnections).length} conexión(es)
      </div>
    </div>
  );
};
