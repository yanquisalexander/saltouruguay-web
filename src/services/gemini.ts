import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'astro:schema'; // Asegúrate de tener zod instalado o usa 'astro:schema' si prefieres

// Definimos la estructura exacta de lo que queremos recibir
const TipsSchema = z.object({
    tips: z.array(z.object({
        category: z.enum(['engagement', 'content', 'technical', 'discord_twitch']).describe('Categoría del consejo'),
        title: z.string().describe('Un título corto y pegadizo con un emoji'),
        description: z.string().describe('La explicación detallada y accionable, mencionando métricas específicas si aplica'),
        actionItem: z.string().describe('Una acción concreta y corta para realizar')
    }))
});

export class GeminiService {
    // Usamos el modelo flash por velocidad y costo, ideal para esto
    private model = google('gemini-2.0-flash-lite');

    async generateTipsForAdminPanel(statsContext: {
        visitorStats: any,
        generalStats: any[]
    }) {
        // Prompt de Sistema: Define la personalidad y las reglas
        const systemPrompt = `
            Eres un Estratega de Comunidades Gaming Senior para "Salto Uruguay Server".
            
            CONTEXTO:
            - Somos una comunidad centrada en Twitch, Discord, Minecraft y Rust.
            - Tu objetivo es analizar métricas y sugerir acciones para aumentar el engagement y la retención.
            
            REGLAS:
            1. Sé breve, directo y usa jerga gamer leve pero profesional.
            2. Enfócate en la conversión Web <-> Discord/Twitch.
            3. NO menciones rutas técnicas (ej: /admin).
            4. Evita obviedades ("Crea buen contenido"). Dame ideas concretas basadas en los números.
        `;

        // Prompt de Usuario: Solo los datos puros
        const userPrompt = `
            Analiza las siguientes estadísticas actuales del panel y genera 3-5 consejos estratégicos:
            
            VISITAS WEB:
            ${JSON.stringify(statsContext.visitorStats)}
            
            MÉTRICAS GENERALES:
            ${JSON.stringify(statsContext.generalStats)}
        `;

        try {
            const result = await generateObject({
                model: this.model,
                schema: TipsSchema,
                system: systemPrompt,
                prompt: userPrompt,
                temperature: 0.7, // Creativo pero coherente
            });

            return (result.object as z.infer<typeof TipsSchema>).tips;

        } catch (error) {
            console.error("Error generando tips con Gemini:", error);
            // Fallback silencioso o re-throw según prefieras
            throw new Error("No se pudieron generar los consejos.");
        }
    }
}