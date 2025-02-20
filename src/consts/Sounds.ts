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
}


export const playSound = ({ sound, volume = 1 }: { sound: string; volume?: number }): Promise<void> => {
    return new Promise((resolve) => {
        const audio = new Audio(`${CDN_PREFIX}${sound}.mp3`);
        audio.volume = volume;
        audio.play();
        audio.onended = () => resolve();
    });
}



export const playSoundWithReverb = async ({
    sound,
    volume = 1,
    reverbAmount = 0.5,
    isBase64 = false,
}: {
    sound: string;
    volume?: number;
    reverbAmount?: number;
    isBase64?: boolean;
}): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        try {
            const audioContext = new AudioContext();
            let arrayBuffer: ArrayBuffer;

            if (isBase64) {
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
                arrayBuffer = uint8Array.buffer;
            } else {
                const response = await fetch(`${CDN_PREFIX}${sound}.mp3`);
                arrayBuffer = await response.arrayBuffer();
            }

            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
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

            // Cuando termine la reproducción, cerramos el audioContext
            source.onended = async () => {
                await audioContext.close();
                resolve();
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
