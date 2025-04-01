import { google } from '@ai-sdk/google';
import { generateObject, generateText } from 'ai';
import { z } from 'astro:schema';


export class GeminiService {
    private google: ReturnType<typeof google>
    constructor() {
        this.google = google('gemini-1.5-flash', {


        })
    }

    async generateTipsForAdminPanel({ dashboardStats }: { dashboardStats: string }) {
        const prompt = `Eres un asistente que ayuda a los administradores de Salto Uruguay Server a mejorar su sitio web.
        Se te proporcionará un resumen de las estadísticas del panel de administración, como visitas, usuarios activos, etc.
        Tu tarea es generar consejos para mejorar el sitio web, mejorar la experiencia del usuario, etc.

        Debes ser breve y conciso, y proporcionar consejos prácticos que puedan implementarse fácilmente.
        Evita incluir info de rutas internas como /admin, /two-factor, etc.

        Evita palabras como En general, En resumen, En conclusión, etc.

        Puedes usar emojis
        
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