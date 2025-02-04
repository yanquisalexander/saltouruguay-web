export const TRANSLATIONS: Record<string, string> = {
    blue: "Azul",
    red: "Rojo",
    yellow: "Amarillo",
    purple: "Morado",
    white: "Blanco",
    green: "Verde",
};

export const getTranslation = (key: string) => TRANSLATIONS[key] ?? `Missing translation for key: "${key}"`;
