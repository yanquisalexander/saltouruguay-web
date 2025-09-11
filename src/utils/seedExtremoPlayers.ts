import { client } from "@/db/client";
import { Extremo3PlayersTable, SaltoCraftExtremo3InscriptionsTable } from "@/db/schema";
import { eq, isNull } from "drizzle-orm";

/**
 * Script para poblar la tabla Extremo3PlayersTable con datos de las inscripciones existentes.
 * Ejecutar una sola vez para inicializar los jugadores.
 */
export async function seedExtremoPlayers() {
    try {
        // Obtener todas las inscripciones que no tienen un registro en Extremo3PlayersTable
        const inscriptionsWithoutPlayers = await client
            .select({
                id: SaltoCraftExtremo3InscriptionsTable.id,
                userId: SaltoCraftExtremo3InscriptionsTable.userId,
            })
            .from(SaltoCraftExtremo3InscriptionsTable)
            .leftJoin(
                Extremo3PlayersTable,
                eq(SaltoCraftExtremo3InscriptionsTable.id, Extremo3PlayersTable.inscriptionId)
            )
            .where(isNull(Extremo3PlayersTable.id))
            .execute();

        if (inscriptionsWithoutPlayers.length === 0) {
            console.log("No hay inscripciones nuevas para procesar.");
            return;
        }

        // Crear registros en Extremo3PlayersTable para cada inscripción
        const playersToInsert = inscriptionsWithoutPlayers.map((inscription) => ({
            inscriptionId: inscription.id,
            isConfirmedPlayer: false, // Por defecto no confirmado
            livesCount: 3, // Por defecto 3 vidas
        }));

        await client.insert(Extremo3PlayersTable).values(playersToInsert).execute();

        console.log(`Se crearon ${playersToInsert.length} registros de jugadores.`);
    } catch (error) {
        console.error("Error al poblar Extremo3PlayersTable:", error);
        throw error;
    }
}
