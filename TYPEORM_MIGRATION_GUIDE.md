# TypeORM Migration Guide

## Overview
This document provides guidance for completing the migration from Drizzle ORM to TypeORM for the remaining files in the codebase.

## Migration Status

### ✅ Completed (5 files)
1. `src/db/client.ts` - TypeORM DataSource initialization
2. `src/db/data-source.ts` - TypeORM configuration
3. `src/utils/user.ts` - All 20+ user-related functions
4. `src/lib/auth/two-factor.ts` - 2FA authentication functions
5. `src/utils/achievements.ts` - Achievement unlock functions
6. `src/pages/api/mc-extremo/total-inscriptos.ts` - Simple count query
7. `src/hooks/migrateDatabase.ts` - Database initialization hook

All 43 TypeORM entities have been created in `src/db/entities/`

### 🚧 Remaining (22 files)
See the list in the PR description

## Common Migration Patterns

### 1. Basic Find Operations

**Drizzle:**
```typescript
const user = await client.query.UsersTable.findFirst({
    where: eq(UsersTable.id, userId),
});
```

**TypeORM:**
```typescript
import { User } from "@/db/entities/User";
const user = await client.getRepository(User).findOne({
    where: { id: userId },
});
```

### 2. Find Many with Relations

**Drizzle:**
```typescript
const messages = await client.query.DebateAnonymousMessagesTable.findMany({
    with: {
        user: {
            columns: {
                displayName: true,
                avatar: true,
            }
        }
    }
});
```

**TypeORM:**
```typescript
import { DebateAnonymousMessage } from "@/db/entities/DebateAnonymousMessage";
const messages = await client.getRepository(DebateAnonymousMessage).find({
    relations: ["user"],
    select: {
        user: {
            displayName: true,
            avatar: true,
        }
    }
});
```

### 3. Insert/Create

**Drizzle:**
```typescript
const [newSession] = await client
    .insert(SessionsTable)
    .values({
        userId,
        sessionId,
        userAgent,
        ip,
    })
    .returning();
```

**TypeORM:**
```typescript
import { Session } from "@/db/entities/Session";
const sessionRepo = client.getRepository(Session);
const newSession = sessionRepo.create({
    userId,
    sessionId,
    userAgent,
    ip,
});
await sessionRepo.save(newSession);
```

### 4. Update

**Drizzle:**
```typescript
await client
    .update(UsersTable)
    .set({ twitchTier: tier })
    .where(eq(UsersTable.twitchId, twitchUserId));
```

**TypeORM:**
```typescript
import { User } from "@/db/entities/User";
await client.getRepository(User).update(
    { twitchId: twitchUserId },
    { twitchTier: tier }
);
```

### 5. Delete

**Drizzle:**
```typescript
await client
    .delete(SessionsTable)
    .where(eq(SessionsTable.sessionId, sessionId));
```

**TypeORM:**
```typescript
import { Session } from "@/db/entities/Session";
await client.getRepository(Session).delete({ sessionId });
```

### 6. Count

**Drizzle:**
```typescript
const result = await client.select({ value: count() }).from(UsersTable).execute();
return result[0]?.value || 0;
```

**TypeORM:**
```typescript
import { User } from "@/db/entities/User";
return await client.getRepository(User).count();
```

### 7. Complex Queries with Conditions

**Drizzle:**
```typescript
const users = await client
    .select()
    .from(UsersTable)
    .where(
        or(
            ilike(UsersTable.username, `%${search}%`),
            ilike(UsersTable.email, `%${search}%`)
        )
    )
    .limit(10);
```

**TypeORM (Option A - Simple):**
```typescript
import { User } from "@/db/entities/User";
import { ILike } from "typeorm";
const users = await client.getRepository(User).find({
    where: [
        { username: ILike(`%${search}%`) },
        { email: ILike(`%${search}%`) }
    ],
    take: 10
});
```

**TypeORM (Option B - QueryBuilder for complex cases):**
```typescript
import { User } from "@/db/entities/User";
const users = await client.getRepository(User)
    .createQueryBuilder("user")
    .where("user.username ILIKE :search OR user.email ILIKE :search", { search: `%${search}%` })
    .take(10)
    .getMany();
```

### 8. Date Comparisons

**Drizzle:**
```typescript
import { gt, lt } from "drizzle-orm";
const users = await client
    .select()
    .from(UsersTable)
    .where(
        and(
            gt(UsersTable.createdAt, lastWeek),
            lt(UsersTable.createdAt, now)
        )
    );
```

**TypeORM:**
```typescript
import { User } from "@/db/entities/User";
import { MoreThan, LessThan } from "typeorm";
const users = await client.getRepository(User).find({
    where: {
        createdAt: MoreThan(lastWeek)
    }
});
```

### 9. Upsert (Insert or Update on Conflict)

**Drizzle:**
```typescript
await client
    .insert(MemberCards)
    .values({ userId, stickers })
    .onConflictDoUpdate({
        target: [MemberCards.userId],
        set: { stickers, updatedAt: new Date() },
    });
```

**TypeORM:**
```typescript
import { MemberCard } from "@/db/entities/MemberCard";
await client.getRepository(MemberCard).save({
    userId,
    stickers,
    updatedAt: new Date()
});
// Note: TypeORM's save() handles upsert automatically based on primary key
```

## Import Changes

### Remove Drizzle Imports
```typescript
// Remove these:
import { and, count, eq, gt, ilike, lt, or, desc } from "drizzle-orm";
import { UsersTable, SessionsTable, ... } from "@/db/schema";
```

### Add TypeORM Imports
```typescript
// Add these as needed:
import { ILike, MoreThan, LessThan, Between } from "typeorm";
import { User } from "@/db/entities/User";
import { Session } from "@/db/entities/Session";
// ... other entities as needed
```

## Entity Mapping Reference

| Drizzle Table | TypeORM Entity |
|--------------|----------------|
| UsersTable | User |
| SessionsTable | Session |
| UserSuspensionsTable | UserSuspension |
| SaltoTagsTable | SaltoTag |
| MemberCards | MemberCard |
| AchievementsTable | Achievement |
| UserAchievementsTable | UserAchievement |
| TournamentsTable | Tournament |
| EventsTable | Event |
| (etc.) | (see src/db/entities/) |

## Testing Strategy

After migrating each file:

1. **Syntax Check:** Ensure TypeScript compiles without errors
2. **Logic Review:** Verify the TypeORM query produces the same results as Drizzle
3. **Relations:** Double-check that entity relations are properly loaded
4. **Error Handling:** Ensure try-catch blocks are maintained

## Common Pitfalls

1. **Array Checks:** Drizzle returns empty arrays, TypeORM might return undefined
   - Check `if (!result)` instead of `if (!result.length)`

2. **Returning Values:** Drizzle's `.returning()` is automatic in TypeORM's `.save()`
   - Just use the returned value from `.save()`

3. **QueryBuilder:** For very complex queries, use TypeORM's QueryBuilder
   - See example in `src/utils/user.ts` `getUsers()` function

4. **Async Operations:** All database operations remain async
   - Keep `async/await` patterns

## Cleanup Phase

After all files are migrated:

1. Delete `drizzle.config.ts`
2. Delete `src/db/schema.ts`
3. Delete `src/db/migrator.ts`
4. Delete `src/db/migrations/` directory
5. Remove from `package.json`:
   - `drizzle-orm`
   - `drizzle-kit`
6. Remove scripts from `package.json`:
   - `db:generate`
   - `db:migrate`
7. Run: `npm install` to clean up package-lock.json

## Resources

- [TypeORM Documentation](https://typeorm.io/)
- [TypeORM Find Options](https://typeorm.io/find-options)
- [TypeORM Query Builder](https://typeorm.io/select-query-builder)
- [TypeORM Entities](https://typeorm.io/entities)
