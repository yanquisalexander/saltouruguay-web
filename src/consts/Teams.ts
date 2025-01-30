export const TEAMS = {
    BLUE: "blue",
    RED: "red",
    YELLOW: "yellow",
    PURPLE: "purple",
    WHITE: "white",
} as const;

export const getTranslation = (team: string) => {
    switch (team) {
        case TEAMS.BLUE:
            return "Azul";
        case TEAMS.RED:
            return "Rojo";
        case TEAMS.YELLOW:
            return "Amarillo";
        case TEAMS.PURPLE:
            return "Morado";
        case TEAMS.WHITE:
            return "Blanco";
    }
};
