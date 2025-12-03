import { client } from "../client";
import { RuletaLocaPhrasesTable } from "../schema";

export const INITIAL_PHRASES = [
    // Fácil
    { phrase: "URUGUAY", category: "País", difficulty: "easy" as const },
    { phrase: "SALTO", category: "Ciudad", difficulty: "easy" as const },
    { phrase: "MATE", category: "Bebida", difficulty: "easy" as const },
    { phrase: "MONTEVIDEO", category: "Capital", difficulty: "easy" as const },
    { phrase: "TANGO", category: "Música", difficulty: "easy" as const },
    { phrase: "FUTBOL", category: "Deporte", difficulty: "easy" as const },
    { phrase: "CHIVITO", category: "Comida", difficulty: "easy" as const },
    { phrase: "DULCE DE LECHE", category: "Postre", difficulty: "easy" as const },

    // Medio
    { phrase: "RIO DE LA PLATA", category: "Geografía", difficulty: "medium" as const },
    { phrase: "MATE CON TORTAS FRITAS", category: "Tradición", difficulty: "medium" as const },
    { phrase: "COLONIA DEL SACRAMENTO", category: "Patrimonio", difficulty: "medium" as const },
    { phrase: "CERRO DE MONTEVIDEO", category: "Lugar", difficulty: "medium" as const },
    { phrase: "CARNAVAL MAS LARGO DEL MUNDO", category: "Cultura", difficulty: "medium" as const },
    { phrase: "PUNTA DEL ESTE", category: "Turismo", difficulty: "medium" as const },
    { phrase: "ASADO CON AMIGOS", category: "Costumbre", difficulty: "medium" as const },
    { phrase: "ESTADIO CENTENARIO", category: "Deporte", difficulty: "medium" as const },

    // Difícil
    { phrase: "LA CELESTE OLÍMPICA", category: "Historia Deportiva", difficulty: "hard" as const },
    { phrase: "JOSE GERVASIO ARTIGAS", category: "Prócer", difficulty: "hard" as const },
    { phrase: "GAUCHO EN LA PAMPA", category: "Tradición", difficulty: "hard" as const },
    { phrase: "CANDOMBE AFRO URUGUAYO", category: "Patrimonio Cultural", difficulty: "hard" as const },
    { phrase: "PIZZA Y FAINÁ EN LA RAMBLA", category: "Gastronomía", difficulty: "hard" as const },
    { phrase: "TERMAS DE SALTO GRANDE", category: "Turismo", difficulty: "hard" as const },
    { phrase: "CABO POLONIO", category: "Reserva Natural", difficulty: "hard" as const },
    { phrase: "TABLADO DE CARNAVAL", category: "Cultura Popular", difficulty: "hard" as const },

    // Frases de la comunidad SaltoUruguayServer
    { phrase: "SALTOURUGUAYSERVER", category: "Comunidad", difficulty: "medium" as const },
    { phrase: "STREAMER WARS", category: "Evento", difficulty: "medium" as const },
    { phrase: "SALTO COINS", category: "Moneda Virtual", difficulty: "easy" as const },
    { phrase: "MEMBER CARD SALTANO", category: "Comunidad", difficulty: "medium" as const },
    { phrase: "BANCO SALTANO", category: "Economía", difficulty: "easy" as const },

    // Frases divertidas
    { phrase: "BO QUE CALOR", category: "Expresión Uruguaya", difficulty: "easy" as const },
    { phrase: "TA TODO BIEN", category: "Expresión", difficulty: "easy" as const },
    { phrase: "CAMPEONES DEL MUNDO", category: "Orgullo Nacional", difficulty: "medium" as const },
    { phrase: "GARRA CHARRUA", category: "Identidad", difficulty: "easy" as const },
    { phrase: "NO HAY MEJOR QUE URUGUAY", category: "Orgullo", difficulty: "medium" as const },
];

export async function seedRuletaLocaPhrases() {
    console.log("Seeding Ruleta Loca phrases...");

    try {
        // Insert all phrases
        for (const phrase of INITIAL_PHRASES) {
            await client
                .insert(RuletaLocaPhrasesTable)
                .values(phrase)
                .onConflictDoNothing()
                .execute();
        }

        console.log(`✓ Successfully seeded ${INITIAL_PHRASES.length} phrases`);
    } catch (error) {
        console.error("Error seeding phrases:", error);
        throw error;
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    seedRuletaLocaPhrases()
        .then(() => {
            console.log("Seed completed!");
            process.exit(0);
        })
        .catch((error) => {
            console.error("Seed failed:", error);
            process.exit(1);
        });
}
