export interface AudioItem {
    id: string;
    name: string;
    duration: number; // in seconds
}

export interface AudioState {
    id: string;
    playing: boolean;
    volume: number; // 0 to 1
    loop: boolean;
}

export const AVAILABLE_AUDIOS: AudioItem[] = [
    { id: 'notification', name: 'Notificación', duration: 2 },
    { id: 'atencion_jugadores', name: 'Atención Jugadores', duration: 3 },
    { id: 'gun', name: 'Disparo', duration: 1 },
    { id: 'new-message', name: 'Nuevo Mensaje', duration: 2 },
    { id: 'button-click', name: 'Click Botón', duration: 1 },
    { id: 'que_comience_el_juego', name: 'Que Comience el Juego', duration: 15 },
    { id: 'es-hora-de-comenzar', name: 'Es Hora de Jugar', duration: 12 },
    { id: 'problemas_tecnicos', name: 'Problemas Técnicos', duration: 8 },
    { id: 'click-simon-says', name: 'Click Simon Dice', duration: 1 },
    { id: 'simon-says-correct', name: 'Simon Dice - Correcto', duration: 2 },
    { id: 'simon-says-error', name: 'Simon Dice - Error', duration: 2 },
    { id: 'effect_tick', name: 'Tick', duration: 1 },
    { id: 'reactions/emoji-enojo', name: 'Emoji - Enojo', duration: 2 },
    { id: 'reactions/emoji-feliz', name: 'Emoji - Feliz', duration: 2 },
    { id: 'reactions/emoji-risa-malvada', name: 'Emoji - Risa Malvada', duration: 2 },
    { id: 'reactions/emoji-llorito', name: 'Emoji - Llorito', duration: 2 },
    { id: 'reactions/emoji-confundido', name: 'Emoji - Confundido', duration: 2 },
    { id: 'reactions/emoji-sigue-asi', name: 'Emoji - Sigue Así', duration: 2 },
    { id: 'reactions/emoji-risa', name: 'Emoji - Risa', duration: 2 },
    { id: 'losed-bribe', name: 'Soborno Perdido', duration: 3 },
    { id: 'win-bribe', name: 'Soborno Ganado', duration: 3 },
    { id: 'cute-notification', name: 'Notificación Bonita', duration: 2 },
    { id: 'waiting-room-loop', name: 'Sala de Espera Loop', duration: 60 },
    { id: 'equipo-eliminado', name: 'Equipo Eliminado', duration: 5 },
    { id: 'golpe-cuerda', name: 'Golpe Cuerda', duration: 2 },
];