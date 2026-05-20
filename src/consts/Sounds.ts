export const CDN_PREFIX = "https://cdn-2.saltouruguayserver.com/sounds/";

export const STREAMER_WARS_SOUNDS = {
    NOTIFICATION: "notification",
    ATENCION_JUGADORES: "atencion_jugadores",
    DISPARO: "gun",
    NUEVO_MENSAJE: "new-message",
    BUTTON_CLICK: "button-click",
    QUE_COMIENCE_EL_JUEGO: "que_comience_el_juego",
    ES_HORA_DE_JUGAR: "es-hora-de-comenzar",
    PROBLEMAS_TECNICOS: "problemas_tecnicos",
    CLICK_SIMON_SAYS: "click-simon-says",
    SIMON_SAYS_CORRECT: "simon-says-correct",
    SIMON_SAYS_ERROR: "simon-says-error",
    TICK: "effect_tick",
    EMOJI_ENOJO: 'reactions/emoji-enojo',
    EMOJI_FELIZ: 'reactions/emoji-feliz',
    EMOJI_RISA_MALVADA: 'reactions/emoji-risa-malvada',
    EMOJI_LLORITO: 'reactions/emoji-llorito',
    EMOJI_CONFUNDIDO: 'reactions/emoji-confundido',
    EMOJI_SIGUE_ASI: 'reactions/emoji-sigue-asi',
    EMOJI_RISA: 'reactions/emoji-risa',
    LOSED_BRIBE: 'losed-bribe',
    WIN_BRIBE: 'win-bribe',
    CUTE_NOTIFICATION: 'cute-notification',
    WAITING_ROOM_LOOP: 'waiting-room-loop',
    EQUIPO_ELIMINADO: 'equipo-eliminado',
    GOLPE_CUERDA: 'golpe-cuerda',
    DISPARO_COMIENZO: 'disparo-comienzo',
    JOURNEY_TITLE_BG: 'journey-title-bg',
    EPISODE_0: 'episode-0',
    EPISODE_1: 'episode-1',
    EPISODE_2: 'episode-2',
    EPISODE_3: 'episode-3',
    INSTRUCTIONS_BG_MUSIC: 'instructions-bg',
    // Fishing minigame sounds
    FISHING_KEY_PRESS: 'button-click',
    FISHING_KEY_WRONG: 'simon-says-error',
    FISHING_ROUND_COMPLETE: 'simon-says-correct',
    FISHING_ELIMINATED: 'equipo-eliminado',
    FISHING_WARNING: 'effect_tick',
    RULETA_LOCA_GIRAR: 'juegos/giro-ruleta',
    RULETA_LOCA_GIRANDO: 'juegos/ruleta-spin',
    RULETA_LOCA_GANAR: 'juegos/ruleta-ganar',
    RULETA_LOCA_ELIJE_CONSONANTE: 'juegos/ruleta-elije-consonante',
    RULETA_LOCA_ERROR_LETRA: 'juegos/ruleta-error',
    RULETA_LOCA_ERROR_LETRA_VOCERA: 'juegos/ruleta-error-letra-vocera',
    RULETA_LOCA_ERROR_FRASE_VOCERA: 'juegos/ruleta-error-frase-vocera',
    PET_EAT: 'pet-eat',
    PET_SHOWER: 'pet-shower',
    PET_SLEEP: 'pet-sleep',
    PET_AWAKE: 'pet-awake',
    PET_ITEM_PURCHASE: 'pet-shop',
    PET_MOUTH_OPEN: 'pet-mouth-open',
}


export const playSound = ({ sound, volume = 1 }: { sound: string; volume?: number }): Promise<void> => {
    return new Promise((resolve) => {
        const audio = new Audio(`${CDN_PREFIX}${sound}.mp3`);
        audio.volume = volume;
        audio.play();
        audio.onended = () => resolve();
    });
}



type PlaySoundWithReverbOptions = {
    sound?: string;
    arrayBuffer?: ArrayBuffer;
    volume?: number;
    reverbAmount?: number;
    isBase64?: boolean;
};

export const playSoundWithReverb = async ({
    sound,
    arrayBuffer,
    volume = 1,
    reverbAmount = 0.5,
    isBase64 = false,
}: PlaySoundWithReverbOptions): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        try {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioCtx) throw new Error("AudioContext is not supported in this browser");

            const audioContext = new AudioCtx();

            if (audioContext.state === 'suspended') {
                await audioContext.resume().catch(e => console.warn('AudioContext resume failed', e));
            }

            let source: AudioBufferSourceNode | MediaElementAudioSourceNode;
            let duration: number;

            // Casos donde ya tenemos los bytes (arrayBuffer o base64): sin CORS
            if (arrayBuffer || isBase64) {
                let bufferToDecode: ArrayBuffer;

                if (arrayBuffer) {
                    bufferToDecode = arrayBuffer;
                } else {
                    const base64Data = sound!.includes(',') ? sound!.split(',')[1] : sound!;
                    const binaryString = atob(base64Data);
                    const uint8Array = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) {
                        uint8Array[i] = binaryString.charCodeAt(i);
                    }
                    bufferToDecode = uint8Array.buffer;
                }

                const audioBuffer = await audioContext.decodeAudioData(bufferToDecode.slice(0));
                const bufferSource = audioContext.createBufferSource();
                bufferSource.buffer = audioBuffer;
                duration = audioBuffer.duration;
                source = bufferSource;

            } else if (sound) {
                // URL remota o blob: usamos HTMLAudioElement para evitar CORS
                const audioEl = new Audio(sound.startsWith('blob:') ? sound : `${CDN_PREFIX}${sound}.mp3`);
                audioEl.crossOrigin = "anonymous";

                await new Promise<void>((res, rej) => {
                    audioEl.oncanplaythrough = () => res();
                    audioEl.onerror = rej;
                    audioEl.load();
                });
                duration = audioEl.duration;
                source = audioContext.createMediaElementSource(audioEl);

            } else {
                throw new Error("playSoundWithReverb requires either sound or arrayBuffer");
            }

            // Grafo de audio
            const dryGain = audioContext.createGain();
            dryGain.gain.value = volume;

            const wetGain = audioContext.createGain();
            wetGain.gain.value = volume * reverbAmount;

            const convolver = audioContext.createConvolver();
            convolver.buffer = await createReverbBuffer(audioContext, reverbAmount);

            source.connect(dryGain);
            dryGain.connect(audioContext.destination);

            source.connect(convolver);
            convolver.connect(wetGain);
            wetGain.connect(audioContext.destination);

            const reverbTail = (convolver.buffer?.duration ?? 0) * 1000 + 200;

            const cleanup = async () => {
                setTimeout(async () => {
                    if (audioContext.state !== 'closed') await audioContext.close().catch(() => { });
                    if (sound?.startsWith('blob:')) URL.revokeObjectURL(sound);
                    resolve();
                }, reverbTail);
            };

            if (source instanceof AudioBufferSourceNode) {
                source.onended = cleanup;
                source.start();
            } else {
                // MediaElementAudioSourceNode
                const audioEl = (source as any).mediaElement as HTMLAudioElement;
                audioEl.crossOrigin = "anonymous";
                audioEl.onended = cleanup;
                audioEl.play();
            }

        } catch (error) {
            console.error("Error al reproducir el sonido:", error);
            reject(error);
        }
    });
};


// Función auxiliar para crear un buffer de reverb
const createReverbBuffer = async (audioContext: AudioContext, reverbAmount: number) => {
    const sampleRate = audioContext.sampleRate;
    const length = sampleRate * 2; // Duración del reverb (2 segundos aprox)
    const impulse = audioContext.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
        const channelData = impulse.getChannelData(channel);
        for (let i = 0; i < length; i++) {
            channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, reverbAmount * 5);
        }
    }

    return impulse;
};
