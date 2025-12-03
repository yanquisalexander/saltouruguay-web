import { client } from "../client";
import { RuletaLocaPhrasesTable } from "../schema";

export const INITIAL_PHRASES = [
    // --- NIVEL FÁCIL (Palabras sueltas o frases muy cortas) ---
    { phrase: "MATE AMARGO", category: "Tradición", difficulty: "easy" as const },
    { phrase: "TORTA FRITA", category: "Comida", difficulty: "easy" as const },
    { phrase: "GARDEL ES URUGUAYO", category: "Verdad Absoluta", difficulty: "easy" as const },
    { phrase: "TERMAS DEL DAYMAN", category: "Lugar en Salto", difficulty: "easy" as const },
    { phrase: "COSTANERA NORTE", category: "Lugar", difficulty: "easy" as const },
    { phrase: "NARANJA DE SALTO", category: "Orgullo Local", difficulty: "easy" as const },
    { phrase: "CORTITA Y AL PIE", category: "Fútbol", difficulty: "easy" as const },
    { phrase: "ALFAJOR DE MAICENA", category: "Postre", difficulty: "easy" as const },
    { phrase: "SALTO COINS", category: "Moneda Virtual", difficulty: "easy" as const }, // Manteniendo la tuya

    // --- NIVEL MEDIO (Lugares compuestos, títulos de canciones, comidas complejas) ---
    { phrase: "CHIVITO CANADIENSE AL PLATO", category: "Gastronomía", difficulty: "medium" as const },
    { phrase: "TRANQUILO COMO AGUA DE TANQUE", category: "Dicho Popular", difficulty: "medium" as const },
    { phrase: "UN APLAUSO PARA EL ASADOR", category: "Costumbre", difficulty: "medium" as const },
    { phrase: "NO TE VA GUSTAR", category: "Música", difficulty: "medium" as const },
    { phrase: "REPRESA DE SALTO GRANDE", category: "Ingeniería", difficulty: "medium" as const },
    { phrase: "PARQUE DEL LAGO", category: "Paseo", difficulty: "medium" as const },
    { phrase: "LA CUEVA DEL SAN ANTONIO", category: "Lugar en Salto", difficulty: "medium" as const },
    { phrase: "MEMBER CARD SALTANO", category: "Comunidad", difficulty: "medium" as const },
    { phrase: "BO SACA LA FOTO", category: "Expresión", difficulty: "medium" as const },
    { phrase: "NO ES COCA ES FANTA", category: "Humor", difficulty: "medium" as const },
    { phrase: "EL QUE NO SALTA ES CANGURO", category: "Cántico", difficulty: "medium" as const },

    // --- NIVEL DIFÍCIL (Refranes largos, frases de culto, jerga cerrada) ---
    { phrase: "A CABALLO REGALADO NO SE LE MIRAN LOS DIENTES", category: "Refrán", difficulty: "hard" as const },
    { phrase: "NO HAY QUE TIRAR MANTECA AL TECHO", category: "Consejo Financiero", difficulty: "hard" as const },
    { phrase: "COCAMBOLA EN EL SURUBI", category: "Evento Local", difficulty: "hard" as const }, // Referencia muy local (si aplica)
    { phrase: "MAS PERDIDO QUE PERRO EN CANCHA DE BOCHAS", category: "Dicho Popular", difficulty: "hard" as const },
    { phrase: "EL CUARTETO DE NOS", category: "Música", difficulty: "hard" as const },
    { phrase: "MONUMENTO A LA GAVIOTA", category: "Arquitectura Salteña", difficulty: "hard" as const }, // La famosa gaviota de Dieste
    { phrase: "NO DEJES PARA MAÑANA LO QUE PUEDES HACER HOY", category: "Refrán", difficulty: "hard" as const },
    { phrase: "CAMARON QUE SE DUERME SE LO LLEVA LA CORRIENTE", category: "Refrán", difficulty: "hard" as const },
    { phrase: "STREAMER WARS SEASON DOS", category: "Evento", difficulty: "hard" as const }, // Anticipando futuro
    { phrase: "LA GARRA CHARRUA NO SE COMPRA", category: "Filosofía", difficulty: "hard" as const },

    // --- NIVEL "INSANE" (Frases muy largas o complicadas para adivinar letra por letra) ---
    { phrase: "SIEMPRE QUE LLOVIO PARO", category: "Optimismo", difficulty: "hard" as const },
    { phrase: "NO ESTOY GORDO ESTOY LLENO DE AMOR", category: "Humor", difficulty: "hard" as const },
    { phrase: "AGARRATE CATALINA QUE VAMOS A GALOPAR", category: "Murga / Dicho", difficulty: "hard" as const },
    { phrase: "EN CASA DE HERRERO CUCHILLO DE PALO", category: "Ironía", difficulty: "hard" as const },
];

export async function seedRuletaLocaPhrases() {
    console.log("Seeding Ruleta Loca phrases...");

    try {
        // Insert all phrases
        let count = 0;
        for (const phrase of INITIAL_PHRASES) {
            await client
                .insert(RuletaLocaPhrasesTable)
                .values(phrase)
                .onConflictDoNothing() // Importante para no duplicar si corres el seed varias veces
                .execute();
            count++;
        }

        console.log(`✓ Successfully seeded/checked ${count} phrases`);
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