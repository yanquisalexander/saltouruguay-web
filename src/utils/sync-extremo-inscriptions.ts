import { client } from '@/db/client';
import { SaltoCraftExtremo3InscriptionsTable, UsersTable } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
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

      // Upsert inscription
      await client
        .insert(SaltoCraftExtremo3InscriptionsTable)
        .values({
          userId,
          discordUsername: insc.discordUsername || custom.discordUsername || null,
          acceptedTerms: custom.acceptedTerms ?? true,
          instagram: custom.instagram || null,
          participated_sc: custom.participated_sc || null,
          minecraft_username: custom.minecraft_username || null,
          team_status: custom.team_status || null,
          content_channel: custom.content_channel || null,
          createdAt: new Date(insc.createdAt),
        })
        .onConflictDoNothing()
        .execute();

      synced++;
    } catch (err) {
      errors.push(`Inscription ${insc.id}: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }

  return { synced, errors };
}
