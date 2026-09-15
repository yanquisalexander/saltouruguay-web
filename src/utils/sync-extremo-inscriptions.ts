import { client } from '@/db/client';
import { SaltoCraftExtremo3InscriptionsTable, Extremo3PlayersTable, UsersTable, LinkedAccountsTable } from '@/db/schema';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { INSCRIPTIONS_API_KEY, INSCRIPTIONS_API_URL } from 'astro:env/server';

interface AdminInscription {
  id: number;
  customData: Record<string, any>;
  status: string;
  createdAt: string;
  displayName: string;
  email: string;
  avatar: string;
  username: string;
  discordUsername: string;
  susId: number; // admin's susId = main's UsersTable.id
}

export async function clearExtremoInscriptions(): Promise<{ deleted: number }> {
  // First delete related records in extremo3_players (FK constraint)
  await client.delete(Extremo3PlayersTable).execute();
  // Now delete inscriptions
  const result = await client
    .delete(SaltoCraftExtremo3InscriptionsTable)
    .execute();
  return { deleted: result.rowCount ?? 0 };
}

export async function syncExtremoInscriptions(options?: { clear?: boolean }): Promise<{
  synced: number;
  errors: string[];
}> {
  if (options?.clear) {
    await clearExtremoInscriptions();
  }
  const errors: string[] = [];
  let synced = 0;

  const response = await fetch(
    `${INSCRIPTIONS_API_URL}/api/inscriptions/export?eventId=3`,
    {
      headers: {
        'X-API-Key': INSCRIPTIONS_API_KEY,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.success || !data.inscriptions) {
    throw new Error('Invalid response from inscriptions API');
  }

  const inscriptions: AdminInscription[] = data.inscriptions;

  // Batch fetch de Discord accounts desde linked_accounts para todos los userIds
  const userIds = inscriptions.map(insc => insc.susId);
  const linkedDiscordAccounts = await client
    .select({
      userId: LinkedAccountsTable.userId,
      username: LinkedAccountsTable.username,
    })
    .from(LinkedAccountsTable)
    .where(
      and(
        inArray(LinkedAccountsTable.userId, userIds),
        eq(LinkedAccountsTable.provider, "discord")
      )
    )
    .execute();

  // Mapa userId → discordUsername desde linked_accounts
  const discordMap = new Map<number, string | null>();
  for (const account of linkedDiscordAccounts) {
    discordMap.set(account.userId, account.username || null);
  }

  for (const insc of inscriptions) {
    try {
      const custom = insc.customData || {};

      // admin.susId = main UsersTable.id
      const userId = insc.susId;

      // Verify user exists locally
      const localUser = await client
        .select({ id: UsersTable.id })
        .from(UsersTable)
        .where(eq(UsersTable.id, userId))
        .limit(1)
        .execute();

      if (localUser.length === 0) {
        errors.push(`User with id ${userId} (susId from admin) not found locally`);
        continue;
      }

      // Upsert inscription - actualiza metadatos sin tocar campos administrativos
      // Discord username viene de linked_accounts (siempre sincronizado)
      const discordUsername = discordMap.get(userId) || null;

      await client
        .insert(SaltoCraftExtremo3InscriptionsTable)
        .values({
          userId,
          discordUsername,
          acceptedTerms: true,
          instagram: custom.instagram || null,
          participated_sc: custom.participaste_de_alguna_edici_n_anterior_de_saltocraft_extremo === "Si" ? "si" : "no",
          minecraft_username: custom.u || null,
          team_status: null,
          content_channel: custom.canal_de_contenido_opcional || null,
          createdAt: new Date(insc.createdAt),
        })
        .onConflictDoUpdate({
          target: SaltoCraftExtremo3InscriptionsTable.userId,
          set: {
            discordUsername,
            instagram: custom.instagram || null,
            participated_sc: custom.participaste_de_alguna_edici_n_anterior_de_saltocraft_extremo === "Si" ? "si" : "no",
            minecraft_username: custom.u || null,
            content_channel: custom.canal_de_contenido_opcional || null,
            updatedAt: new Date(),
          },
        })
        .execute();

      synced++;
    } catch (err) {
      errors.push(`Inscription ${insc.id}: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }

  return { synced, errors };
}
