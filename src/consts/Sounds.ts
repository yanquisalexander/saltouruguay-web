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
}: { sound: string; volume?: number; reverbAmount?: number; isBase64?: boolean }): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        try {
            const audioContext = new AudioContext();
            let arrayBuffer: ArrayBuffer;

            if (isBase64) {
                let base64Data: string;
                // Si el string contiene una coma, asumimos que viene en formato "data:audio/mp3;base64,....."
                if (sound.includes(',')) {
                    base64Data = sound.split(',')[1];
                } else {
                    // Si no viene el prefijo "data:", usamos el string completo
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

            const gainNode = audioContext.createGain();
            gainNode.gain.value = volume;

            const convolver = audioContext.createConvolver();
            convolver.buffer = await createReverbBuffer(audioContext, reverbAmount);

            source.connect(convolver);
            convolver.connect(gainNode);
            gainNode.connect(audioContext.destination);

            source.start();
            source.onended = async () => {
                await audioContext.close();
                resolve();
            };
        } catch (error) {
            console.error("Error reproduciendo el sonido:", error);
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
