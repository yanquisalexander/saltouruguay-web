export const CDN_PREFIX = "https://cdn.saltouruguayserver.com/sounds/";

export const STREAMER_WARS_SOUNDS = {
    NOTIFICATION: "notification",
    ATENCION_JUGADORES: "atencion_jugadores",
    DISPARO: "gun",
    NUEVO_MENSAJE: "new-message",
    BUTTON_CLICK: "button-click",
    QUE_COMIENCE_EL_JUEGO: "que_comience_el_juego",
}


export const playSound = ({ sound, volume = 1 }: { sound: string; volume?: number }): Promise<void> => {
    return new Promise((resolve) => {
        const audio = new Audio(`${CDN_PREFIX}${sound}.mp3`);
        audio.volume = volume;
        audio.play();
        audio.onended = () => resolve();
    });
}