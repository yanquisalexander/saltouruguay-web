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
    { id: 'new-message', name: 'Nuevo Mensaje', duration: 2 },
    { id: 'juego-cuerda-fondo', name: 'Tira y Afloja Fondo', duration: -1 },
    { id: 'button-click', name: 'Click Botón', duration: 1 },
    { id: 'que_comience_el_juego', name: 'Que Comience el Juego', duration: 15 },
    { id: 'es-hora-de-comenzar', name: 'Es Hora de Jugar', duration: 12 },
    { id: 'problemas_tecnicos', name: 'Problemas Técnicos', duration: 8 },
    { id: 'waiting-room-loop', name: 'Sala de Espera Loop', duration: 60 }, // assuming loop
    // Add more as needed
];