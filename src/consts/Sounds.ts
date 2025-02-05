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