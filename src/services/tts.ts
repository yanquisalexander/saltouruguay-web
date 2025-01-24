export const tts = async (text: string, voice: string = "es-UY-ValentinaNeural"): Promise<string | undefined> => {
    try {
        const response = await fetch("https://edge-tts.dayax.net/api/api.php?action=synthesize", {
            headers: {
                "Content-Type": "application/json",
                Origin: "https://edge-tts.dayax.net",
            },
            method: "POST",
            body: JSON.stringify({
                text,
                voice,
                rate: "0",  // Velocidad de habla
                pitch: "-2", // Tono de voz
                volume: "0", // Volumen
            }),
        });


        if (!response.ok) {
            const body = await response.text();
            console.error("Error al generar audio:", body);
            throw new Error(`Error al generar audio: ${response.statusText}`);
        }

        const { base64Audio } = await response.json();

        if (base64Audio) {
            return base64Audio;
        } else {
            console.error("La respuesta no contiene base64");
            return undefined;
        }
    } catch (error) {
        console.error("Error en tts:", error);
        return undefined;
    }
};