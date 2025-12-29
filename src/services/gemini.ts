import { google } from '@ai-sdk/google';
import { generateObject, generateText } from 'ai';
import { z } from 'astro:schema';


export class GeminiService {
    private google: ReturnType<typeof google>
    constructor() {
        this.google = google('gemini-2.0-flash-exp', {


        })
    }

    async generateTipsForAdminPanel({ dashboardStats }: { dashboardStats: string }) {
        const prompt = `Eres un asistente que ayuda a los administradores de Salto Uruguay Server (saltouruguayserver.com) a mejorar su sitio web.
        Se te proporcionará un resumen de las estadísticas del panel de administración, como visitas, usuarios activos, etc.
        Tu tarea es generar consejos para mejorar el sitio web, mejorar la experiencia del usuario, etc.

        Debes ser breve y conciso, y proporcionar consejos prácticos que puedan implementarse fácilmente.
        EVITA incluir info de rutas internas como /admin, /two-factor, etc. (No existen problemas de seguridad, pero es mejor no incluirlas)

        Evita palabras como En general, En resumen, En conclusión, etc.

        Puede ser útil que des consejos sobre como attaer a usuarios de Discord o desde em canal de Twitch,
        como sugerencias de eventos, juegos en la web, secciones nuevas para fomentar la participación de los usuarios en el sitio web, etc.


        Puedes usar emojis

        Ten en cuenta:

        - Salto Uruguay Server es una comunidad de Twitch y Discord que se centra en la creación de contenido, la transmisión y la interacción con los espectadores, no un
        servidor en concreto (Pero si que se realizan servidores de Minecraft, Rust, etc.)


        
        Aquí tienes un resumen de las estadísticas del panel de administración: ${dashboardStats}
        `

        const response = await generateText({
            model: this.google,

            prompt,
            temperature: 0.7,
            system: "Eres un asistente que ayuda a los administradores de Salto Uruguay Server a mejorar su sitio web. Se te proporcionará un resumen de las estadísticas del panel de administración, como visitas, usuarios activos, etc. Tu tarea es generar consejos para mejorar el sitio web, mejorar la experiencia del usuario, etc."
        });
        return response.text
    }





}