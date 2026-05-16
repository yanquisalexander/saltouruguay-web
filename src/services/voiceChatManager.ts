import type { Channel } from "pusher-js";
import { type Players } from "@/components/admin/streamer-wars/Players";
import { useVoiceChatStore } from "@/stores/voiceChat";
import { actions } from "astro:actions";
import { pusherService } from "@/services/pusher.client";

const ICE_SERVERS = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
    ]
};

export class VoiceChatManager {
    private static instance: VoiceChatManager;

    private activeConnections: Record<string, RTCPeerConnection> = {};
    private pendingCandidates: Record<string, RTCIceCandidateInit[]> = {};
    private remoteAudios: Record<string, HTMLAudioElement> = {};
    private channels: Channel[] = []; // FIX: faltaba esta declaración
    public localStream: MediaStream | null = null;

    private userId: string | null = null;
    private teamId: string | null = null;
    private isAdmin: boolean = false;
    private isPTTActive: boolean = false;
    private debounceRef: number | null = null;
    private isFocusRef = false;

    private handleKeyDownFn: (e: KeyboardEvent) => void;
    private handleKeyUpFn: (e: KeyboardEvent) => void;
    private handleFocusInFn: (e: FocusEvent) => void;
    private handleFocusOutFn: (e: FocusEvent) => void;
    private handleDeviceChangeFn: (e: Event) => void;

    private constructor() {
        this.handleKeyDownFn = this.onKeyDown.bind(this);
        this.handleKeyUpFn = this.onKeyUp.bind(this);
        this.handleFocusInFn = this.onFocusIn.bind(this);
        this.handleFocusOutFn = this.onFocusOut.bind(this);
        this.handleDeviceChangeFn = this.onDeviceChange.bind(this);
    }

    public static getInstance() {
        if (!VoiceChatManager.instance) {
            VoiceChatManager.instance = new VoiceChatManager();
        }
        return VoiceChatManager.instance;
    }

    private onFocusIn(e: FocusEvent) {
        const target = e.target as HTMLElement;
        this.isFocusRef = (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
    }

    private onFocusOut() {
        this.isFocusRef = false;
    }

    private onKeyDown(e: KeyboardEvent) {
        if (this.isFocusRef) return;
        if (e.key.toLowerCase() === 'v' && !this.isPTTActive) {
            this.isPTTActive = true;
            useVoiceChatStore.getState().setIsPTTActive(true);
            if (this.localStream && this.teamId) {
                if (this.debounceRef) clearTimeout(this.debounceRef);
                this.debounceRef = window.setTimeout(() => {
                    this.localStream!.getAudioTracks().forEach(t => t.enabled = true);
                    useVoiceChatStore.getState().setLocalMicEnabled(true);
                }, 80);
            }
        }
    }

    private onKeyUp(e: KeyboardEvent) {
        if (e.key.toLowerCase() === 'v' && this.isPTTActive) {
            this.isPTTActive = false;
            useVoiceChatStore.getState().setIsPTTActive(false);
            if (this.debounceRef) {
                clearTimeout(this.debounceRef);
                this.debounceRef = null;
            }
            if (this.localStream) {
                this.localStream.getAudioTracks().forEach(t => t.enabled = false);
            }
            useVoiceChatStore.getState().setLocalMicEnabled(false);
        }
    }

    private async onDeviceChange() {
        if (!this.localStream) return;
        // FIX: el try nunca se abría, había un `} catch` suelto
        try {
            const newStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const newTrack = newStream.getAudioTracks()[0];

            if (newTrack) {
                newTrack.enabled = this.localStream.getAudioTracks()[0]?.enabled ?? false;
                this.localStream.getTracks().forEach(t => t.stop());
                this.localStream = newStream;

                Object.values(this.activeConnections).forEach(pc => {
                    const sender = pc.getSenders().find(s => s.track?.kind === 'audio');
                    if (sender) {
                        sender.replaceTrack(newTrack).catch(e => console.error("Error replacing track", e));
                    }
                });
            }
        } catch (e) {
            console.error("Device swap failed", e);
        }
    }

    public async init(userId: string, teamId: string | null, isAdmin: boolean, enabledTeams: Record<string, boolean>, spectatingTeams: Record<string, boolean>) {
        this.userId = userId;
        this.teamId = teamId;
        this.isAdmin = isAdmin;

        const isPlayingForOwnTeam = teamId ? enabledTeams[teamId] : false;
        const isSpectatingOthers = isAdmin ? Object.values(spectatingTeams).some(v => v) : false;

        const wantsToListen = isPlayingForOwnTeam || isSpectatingOthers;

        window.removeEventListener('keydown', this.handleKeyDownFn);
        window.removeEventListener('keyup', this.handleKeyUpFn);
        document.removeEventListener('focusin', this.handleFocusInFn);
        document.removeEventListener('focusout', this.handleFocusOutFn);
        navigator.mediaDevices.removeEventListener('devicechange', this.handleDeviceChangeFn);

        window.addEventListener('keydown', this.handleKeyDownFn);
        window.addEventListener('keyup', this.handleKeyUpFn);
        document.addEventListener('focusin', this.handleFocusInFn);
        document.addEventListener('focusout', this.handleFocusOutFn);
        navigator.mediaDevices.addEventListener('devicechange', this.handleDeviceChangeFn);

        if (isPlayingForOwnTeam && !this.localStream) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                stream.getAudioTracks().forEach(track => track.enabled = false);
                this.localStream = stream;
                useVoiceChatStore.getState().setConnectionError(null);
            } catch (e: any) {
                if (e.name === "NotAllowedError") useVoiceChatStore.getState().setConnectionError("Permiso denegado");
                else useVoiceChatStore.getState().setConnectionError("Micro no encontrado");
            }
        }

        this.setupPusher(enabledTeams, spectatingTeams);
    }

    private async sendSignal(targetTeamId: string, event: string, data: any) {
        if (!this.userId) return;
        try {
            await actions.voice.signal({ teamId: targetTeamId, event: event as any, data: { fromUserId: this.userId, ...data } });
        } catch (err) {
            console.error(`Signaling err ${event}`, err);
        }
    }

    private createPeerConnection(peerId: string, isSpectating: boolean, channelTeamId: string) {
        const pc = new RTCPeerConnection(ICE_SERVERS);

        pc.onicecandidate = (e) => {
            if (e.candidate) this.sendSignal(channelTeamId, "signal:iceCandidate", { toUserId: peerId, candidate: e.candidate.toJSON() });
        };

        pc.ontrack = (e) => {
            const audio = new Audio();
            audio.srcObject = e.streams[0];
            audio.volume = 1;
            audio.autoplay = true;
            audio.play().catch(err => console.warn("Autoplay block", err));

            this.remoteAudios[peerId] = audio;
            this.monitorAudioActivity(peerId, e.streams[0]);
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
                this.disconnectPeer(peerId);
            }
        };

        if (this.localStream && !isSpectating) {
            this.localStream.getTracks().forEach(t => pc.addTrack(t, this.localStream!));
        } else {
            pc.addTransceiver('audio', { direction: 'recvonly' });
        }

        return pc;
    }

    private monitorAudioActivity(peerId: string, stream: MediaStream) {
        try {
            const ac = new AudioContext();
            const source = ac.createMediaStreamSource(stream);
            const analyser = ac.createAnalyser();
            source.connect(analyser);
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.2;
            const dataArray = new Uint8Array(analyser.frequencyBinCount);

            const checkAudio = () => {
                if (!this.activeConnections[peerId]) return;
                analyser.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
                const average = sum / dataArray.length;

                const store = useVoiceChatStore.getState();
                const isTalking = average > 10;

                if (isTalking && !store.talkingUsers.includes(peerId)) {
                    store.addTalkingUser(peerId);
                } else if (!isTalking && store.talkingUsers.includes(peerId)) {
                    store.removeTalkingUser(peerId);
                }

                requestAnimationFrame(checkAudio);
            };

            checkAudio();
        } catch (e) {
            console.warn("Audio meter context err", e);
        }
    }

    private disconnectPeer(peerId: string) {
        if (this.activeConnections[peerId]) {
            this.activeConnections[peerId].close();
            delete this.activeConnections[peerId];
        }
        if (this.remoteAudios[peerId]) {
            this.remoteAudios[peerId].pause();
            delete this.remoteAudios[peerId];
        }
        useVoiceChatStore.getState().setPeerCount(Object.keys(this.activeConnections).length);
        useVoiceChatStore.getState().removeTalkingUser(peerId);
    }

    private async handleWebRTCMessage(type: string, data: any, channelTeamId: string, isSpectating: boolean) {
        const { fromUserId, sdp, candidate } = data;
        let pc = this.activeConnections[fromUserId];

        try {
            if (type === 'offer') {
                if (!pc) {
                    pc = this.createPeerConnection(fromUserId, isSpectating, channelTeamId);
                    this.activeConnections[fromUserId] = pc;
                    useVoiceChatStore.getState().setPeerCount(Object.keys(this.activeConnections).length);
                }
                await pc.setRemoteDescription(new RTCSessionDescription(sdp));

                const pending = this.pendingCandidates[fromUserId];
                if (pending) {
                    for (const cand of pending) await pc.addIceCandidate(new RTCIceCandidate(cand));
                    delete this.pendingCandidates[fromUserId];
                }

                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                this.sendSignal(channelTeamId, "signal:answer", { toUserId: fromUserId, sdp: answer });

            } else if (type === 'answer' && pc) {
                if (pc.signalingState === 'have-local-offer') {
                    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
                }
            } else if (type === 'candidate') {
                if (pc && pc.remoteDescription) {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                } else {
                    if (!this.pendingCandidates[fromUserId]) this.pendingCandidates[fromUserId] = [];
                    this.pendingCandidates[fromUserId].push(candidate);
                }
            }
        } catch (e) {
            console.error(`WebRTC ${type} error:`, e);
        }
    }

    private setupPusher(enabledTeams: Record<string, boolean>, spectatingTeams: Record<string, boolean>) {
        this.channels.forEach(ch => pusherService.unsubscribe(ch.name));
        this.channels = [];

        const teamsToSubscribe: { id: string, isSpec: boolean }[] = [];

        if (this.teamId) {
            teamsToSubscribe.push({ id: this.teamId, isSpec: false });
        }

        if (this.isAdmin) {
            Object.keys(spectatingTeams)
                .filter(id => spectatingTeams[id] && id !== this.teamId)
                .forEach(id => teamsToSubscribe.push({ id, isSpec: true }));
        }

        // FIX: el forEach que contenía todos los channel.bind nunca se abría;
        // los binds estaban sueltos dentro del bloque if (this.isAdmin)
        teamsToSubscribe.forEach(({ id: targetTeamId, isSpec }) => {
            const channelName = `team-${targetTeamId}-voice-signal`;
            const channel = pusherService.subscribe(channelName) as Channel;
            this.channels.push(channel);

            channel.bind("voice:enabled", (d: any) => {
                useVoiceChatStore.getState().setVoiceEnabled(d.teamId, true);
                this.sendSignal(d.teamId, "voice:user-joined", { userId: this.userId });
            });

            channel.bind("voice:disabled", (d: any) => {
                useVoiceChatStore.getState().setVoiceEnabled(d.teamId, false);
            });

            channel.bind("signal:offer", (d: any) => {
                if (d.toUserId === this.userId) this.handleWebRTCMessage('offer', d, targetTeamId, isSpec);
            });

            channel.bind("signal:answer", (d: any) => {
                if (d.toUserId === this.userId) this.handleWebRTCMessage('answer', d, targetTeamId, isSpec);
            });

            channel.bind("signal:iceCandidate", (d: any) => {
                if (d.toUserId === this.userId) this.handleWebRTCMessage('candidate', d, targetTeamId, isSpec);
            });

            channel.bind("voice:user-joined", async (d: any) => {
                if (d.userId !== this.userId && !this.activeConnections[d.userId] && !isSpec) {
                    const pc = this.createPeerConnection(d.userId, isSpec, targetTeamId);
                    this.activeConnections[d.userId] = pc;
                    useVoiceChatStore.getState().setPeerCount(Object.keys(this.activeConnections).length);
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    this.sendSignal(targetTeamId, "signal:offer", { toUserId: d.userId, sdp: offer });
                }
            });

            channel.bind("pusher:subscription_succeeded", () => {
                if (!isSpec) this.sendSignal(targetTeamId, "voice:user-joined", { userId: this.userId });
            });
        });
    }

    public cleanup() {
        window.removeEventListener('keydown', this.handleKeyDownFn);
        window.removeEventListener('keyup', this.handleKeyUpFn);
        document.removeEventListener('focusin', this.handleFocusInFn);
        document.removeEventListener('focusout', this.handleFocusOutFn);
        navigator.mediaDevices.removeEventListener('devicechange', this.handleDeviceChangeFn);

        Object.keys(this.activeConnections).forEach(this.disconnectPeer.bind(this));
        if (this.localStream) {
            this.localStream.getTracks().forEach(t => t.stop());
            this.localStream = null;
        }
        this.channels.forEach(ch => pusherService.unsubscribe(ch.name));
        this.channels = [];
        useVoiceChatStore.getState().setPeerCount(0);
    }
}