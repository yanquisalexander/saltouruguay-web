export const CDN_PREFIX = "https://cdn.saltouruguayserver.com/sounds/";

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
            if (!AudioCtx) {
                throw new Error("AudioContext is not supported in this browser");
            }

            const audioContext = new AudioCtx();
            let bufferToDecode: ArrayBuffer;

            if (arrayBuffer) {
                bufferToDecode = arrayBuffer;
            } else if (isBase64 && sound) {
                let base64Data: string;
                // Si el string contiene coma, se asume formato "data:audio/mp3;base64,..."
                if (sound.includes(',')) {
                    base64Data = sound.split(',')[1];
                } else {
                    // Si no se incluye el prefijo, se toma el string completo
                    base64Data = sound;
                }
                const binaryString = atob(base64Data);
                const len = binaryString.length;
                const uint8Array = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                    uint8Array[i] = binaryString.charCodeAt(i);
                }
                bufferToDecode = uint8Array.buffer;
            } else if (sound) {
                if (sound.startsWith("blob:")) {
                    const response = await fetch(sound);
                    bufferToDecode = await response.arrayBuffer();
                } else {
                    const response = await fetch(`${CDN_PREFIX}${sound}.mp3`);
                    bufferToDecode = await response.arrayBuffer();
                }
            } else {
                throw new Error("playSoundWithReverb requires either sound or arrayBuffer");
            }

            if (audioContext.state === 'suspended') {
                try {
                    await audioContext.resume();
                } catch (resumeError) {
                    console.warn('AudioContext resume failed', resumeError);
                }
            }

            const audioBuffer = await audioContext.decodeAudioData(bufferToDecode.slice(0));
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;

            // Nodo de ganancia general (opcional, si deseas controlar el volumen global)
            // const globalGainNode = audioContext.createGain();
            // globalGainNode.gain.value = volume;
            // globalGainNode.connect(audioContext.destination);

            // Creamos dos nodos de ganancia para cada rama: dry y wet
            const dryGainNode = audioContext.createGain();
            // Puedes ajustar el nivel del sonido original (dry) aquí
            dryGainNode.gain.value = volume;

            const wetGainNode = audioContext.createGain();
            // Aquí puedes ajustar el nivel de la señal con reverb (wet)
            // Por ejemplo, podrías hacer algo como volume * reverbAmount, o asignarle un valor fijo
            wetGainNode.gain.value = volume * reverbAmount;

            // Creamos el nodo convolver y asignamos el buffer de reverb
            const convolver = audioContext.createConvolver();
            // Se asume que createReverbBuffer devuelve un AudioBuffer configurado según reverbAmount
            convolver.buffer = await createReverbBuffer(audioContext, reverbAmount);

            // Conexión de la rama dry: fuente -> ganancia dry -> destino
            source.connect(dryGainNode);
            dryGainNode.connect(audioContext.destination);

            // Conexión de la rama wet: fuente -> convolver -> ganancia wet -> destino
            source.connect(convolver);
            convolver.connect(wetGainNode);
            wetGainNode.connect(audioContext.destination);

            // Inicia la reproducción
            source.start();

            source.onended = () => {
                // 1. Obtenemos la duración del "impulso" del reverb (la cola)
                // Si no hay buffer, asumimos 0.
                const reverbTailDuration = convolver.buffer ? convolver.buffer.duration : 0;

                // 2. Convertimos a milisegundos
                // Agregamos un pequeño margen de seguridad (ej. 200ms) para evitar clics al final
                const timeToWait = (reverbTailDuration * 1000) + 200;

                setTimeout(async () => {
                    // 3. Cerramos el contexto SOLO cuando el reverb haya terminado
                    try {
                        if (audioContext.state !== 'closed') {
                            await audioContext.close();
                        }
                    } catch (e) {
                        console.warn("El contexto ya estaba cerrado", e);
                    }

                    if (sound && sound.startsWith("blob:")) {
                        URL.revokeObjectURL(sound);
                    }
                    resolve();
                }, timeToWait);
            };
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
