import { useEffect, useRef, useState } from "preact/hooks";
import type Pusher from "pusher-js";
import type { Channel } from "pusher-js";
import { useVoiceChatStore } from "@/stores/voiceChat";
import { LucideMic, LucideMicOff, LucideVolume2 } from "lucide-preact";

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
    peerConnections,
    localStream,
    isLocalMicEnabled,
    isPTTActive,
    isAdminSpectator,
    setCurrentTeamId,
    setVoiceEnabled,
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
      } catch (error) {
        console.error("Failed to get audio stream:", error);
      }
    };

    if (!localStream && !isAdminSpectator) {
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
    if (!pusher || !teamId) return;

    const channelName = `team-${teamId}-voice-signal`;
    signalChannelRef.current = pusher.subscribe(channelName);

    // Handle voice enabled event
    signalChannelRef.current.bind("voice:enabled", (data: any) => {
      console.log("Voice enabled for team:", data.teamId);
      setVoiceEnabled(data.teamId, true);
    });

    // Handle voice disabled event
    signalChannelRef.current.bind("voice:disabled", (data: any) => {
      console.log("Voice disabled for team:", data.teamId);
      setVoiceEnabled(data.teamId, false);
      cleanup();
    });

    // Handle force mute event
    signalChannelRef.current.bind("voice:force-mute", (data: any) => {
      if (data.targetUserId === userId) {
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
    signalChannelRef.current.bind("signal:offer", async (data: any) => {
      if (data.toUserId === userId) {
        await handleOffer(data.fromUserId, data.sdp);
      }
    });

    signalChannelRef.current.bind("signal:answer", async (data: any) => {
      if (data.toUserId === userId) {
        await handleAnswer(data.fromUserId, data.sdp);
      }
    });

    signalChannelRef.current.bind("signal:iceCandidate", async (data: any) => {
      if (data.toUserId === userId) {
        await handleIceCandidate(data.fromUserId, data.candidate);
      }
    });

    return () => {
      signalChannelRef.current?.unbind_all();
      signalChannelRef.current?.unsubscribe();
    };
  }, [pusher, teamId, userId]);

  // Handle offer from peer
  const handleOffer = async (fromUserId: string, sdp: RTCSessionDescriptionInit) => {
    try {
      const pc = new RTCPeerConnection(ICE_SERVERS);
      
      // Set up event handlers
      setupPeerConnection(pc, fromUserId);
      
      // Set remote description
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      
      // Create answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      // Send answer back
      signalChannelRef.current?.trigger("signal:answer", {
        fromUserId: userId,
        toUserId: fromUserId,
        sdp: answer
      });
      
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
  const setupPeerConnection = (pc: RTCPeerConnection, peerId: string) => {
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        signalChannelRef.current?.trigger("signal:iceCandidate", {
          fromUserId: userId,
          toUserId: peerId,
          candidate: event.candidate.toJSON()
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

    // Add local audio track (only if not admin spectator)
    if (localStream && !isAdminSpectator) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }
  };

  // Create offer to peer
  const createOffer = async (toUserId: string) => {
    try {
      const pc = new RTCPeerConnection(ICE_SERVERS);
      
      // Set up event handlers
      setupPeerConnection(pc, toUserId);
      
      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      // Send offer
      signalChannelRef.current?.trigger("signal:offer", {
        fromUserId: userId,
        toUserId,
        sdp: offer
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
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 p-4 bg-black/80 rounded-lg border border-gray-700">
      {/* Voice enabled indicator */}
      <div className="flex items-center gap-2 text-xs text-gray-300">
        <LucideVolume2 className="w-4 h-4" />
        <span>Voice habilitado</span>
      </div>

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
