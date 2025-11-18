export interface AudioItem {
    id: string;
    name: string;
    duration: number; // in seconds
}

export interface AudioState {
    id: string;
    playing: boolean;
    paused: boolean;
    volume: number; // 0 to 1
    loop: boolean;
    currentTime: number;
}

export const AVAILABLE_AUDIOS: AudioItem[] = [
    { id: 'notification', name: 'Notificación', duration: 5 },
    { id: 'atencion_jugadores', name: 'Atención Jugadores', duration: 10 },
    { id: 'gun', name: 'Disparo', duration: 3 },
    { id: 'new-message', name: 'Nuevo Mensaje', duration: 2 },
    { id: 'button-click', name: 'Click Botón', duration: 1 },
    { id: 'que_comience_el_juego', name: 'Que Comience el Juego', duration: 15 },
    { id: 'es-hora-de-comenzar', name: 'Es Hora de Jugar', duration: 12 },
    { id: 'problemas_tecnicos', name: 'Problemas Técnicos', duration: 8 },
    { id: 'waiting-room-loop', name: 'Sala de Espera Loop', duration: 60 }, // assuming loop
    // Add more as needed
];