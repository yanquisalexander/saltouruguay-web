# Plan: Sistema de Pencas — Mundial 2026

## Stack
- DB: PostgreSQL + Drizzle ORM (nuevas tablas en `src/db/schema.ts`)
- Server Actions: `astro:actions` via `src/actions/pencas.ts`
- Frontend: Preact TSX en `src/components/pencas/`
- API externa: football-data.org (requiere `FOOTBALL_DATA_API_KEY`)

---

## 1. Modelo de Datos (4 tablas nuevas en `src/db/schema.ts`)

### `wc_groups`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | `serial PK` | |
| name | `char(1) notNull unique` | A–H |
| createdAt | `timestamp default now()` | |

### `wc_teams`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | `serial PK` | |
| groupId | `int FK → wc_groups` | |
| name | `varchar notNull` | |
| flag | `varchar` | URL o emoji |
| fifaCode | `varchar(3)` | URU, BRA, etc. |

### `wc_matches`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | `serial PK` | |
| groupId | `int FK → wc_groups` | nullable para knockout |
| homeTeamId | `int FK → wc_teams` | |
| awayTeamId | `int FK → wc_teams` | |
| matchDate | `timestamp notNull` | |
| stage | `varchar notNull` | `group` / `round_of_16` / `quarter_final` / `semi_final` / `third_place` / `final` |
| status | `varchar notNull default 'scheduled'` | `scheduled` / `live` / `finished` |
| homeScore | `int` | nullable |
| awayScore | `int` | nullable |
| createdAt | `timestamp default now()` | |
| updatedAt | `timestamp default now()` | |

### `wc_predictions`
| Columna | Tipo | Notas |
|---------|------|-------|
| id | `serial PK` | |
| userId | `int FK → users onDelete cascade` | |
| matchId | `int FK → wc_matches onDelete cascade` | |
| homeScore | `int notNull` | |
| awayScore | `int notNull` | |
| points | `int` | nullable, se calcula al finalizar el partido |
| createdAt | `timestamp default now()` | |
| updatedAt | `timestamp default now()` | |
| _unique_ | `(userId, matchId)` | |

---

## 2. Archivos a Crear (8 nuevos)

| Archivo | Propósito |
|---------|-----------|
| `src/actions/pencas.ts` | Acciones de servidor (RPC) |
| `src/utils/pencas/scoring.ts` | Lógica de puntuación y cálculos |
| `src/utils/pencas/api-football-data.ts` | Cliente para football-data.org |
| `src/utils/pencas/rewards.ts` | Lógica de recompensas Saltocoins |
| `src/components/pencas/PencasApp.tsx` | Componente principal Preact |
| `src/components/pencas/GroupsView.tsx` | Vista de grupos con predicciones |
| `src/components/pencas/Leaderboard.tsx` | Tabla de posiciones |
| `src/components/admin/PencasAdmin.tsx` | Panel admin para gestionar pencas |

---

## 3. Archivos a Modificar (6 existentes)

| Archivo | Cambio |
|---------|--------|
| `src/db/schema.ts` | Agregar las 4 tablas nuevas |
| `src/actions/index.ts` | Importar y registrar `pencas` como `server.pencas` |
| `src/pages/comunidad/pencas.astro` | **Nueva página** pública (con PencasApp) |
| `src/pages/admin/pencas.astro` | **Nueva página** admin (con PencasAdmin) |
| `src/components/CommunitySidebar.tsx` | Agregar link "Mundial 2026" |
| `src/components/admin/AdminSidebar.tsx` | Agregar "Pencas Mundial" en categoría Competición |

---

## 4. Acciones del Servidor (`src/actions/pencas.ts`)

| Acción | Auth | Input | Output |
|--------|------|-------|--------|
| `pencas.getGroups` | Público | — | Grupos con equipos y partidos |
| `pencas.getMatches` | Público | `{groupId?, stage?}` | Partidos filtrados |
| `pencas.submitPrediction` | User | `{matchId, homeScore, awayScore}` | Success / error (valida que match no haya empezado) |
| `pencas.getPredictions` | User | `{matchId?}` | Predicciones del usuario |
| `pencas.getLeaderboard` | Público | — | Ranking de usuarios por puntos |
| `pencas.admin.fetchFromApi` | Admin | — | Trae grupos, equipos, partidos desde football-data.org |
| `pencas.admin.updateMatchScore` | Admin | `{matchId, homeScore, awayScore}` | Actualiza score + recalcula puntos |
| `pencas.admin.calculatePoints` | Admin | `{matchId}` | Recalcula puntos de todas las predicciones de ese partido |

---

## 5. Sistema de Puntuación

```
- Resultado exacto:         5 pts  (ej: 2-1 predicho, 2-1 real)
- Ganador/empate correcto:  2 pts  (ej: Uruguay gana, Uruguay ganó)
- Erraste:                   0 pts
```

Se calcula automáticamente cuando un admin actualiza el score del partido (acción `updateMatchScore`).

---

## 6. Recompensas Saltocoins

| Acción | Coins |
|--------|-------|
| Pronosticar un partido | **+1 coin** (al enviar) |
| Acertar resultado exacto | **+5 coins** (al calcularse el partido) |
| **Leaderboard final** | |
| 1er puesto | **5000 coins** |
| 2do puesto | **3000 coins** |
| 3er puesto | **1000 coins** |

---

## 7. Lock de Predicciones

- Al enviar/editar un pronóstico se verifica `match.matchDate > now()`.
- Si el partido ya empezó (`live` o `finished`): rechazar con `ActionError { code: "BAD_REQUEST", message: "El partido ya comenzó" }`.

---

## 8. Flujo UX (Página `/comunidad/pencas`)

- **Tabs**: "Grupos" | "Leaderboard"
- **Grupos**: Acordeón por grupo (A–H). Cada grupo lista partidos.
- **Match card**: Banderas, nombres, score si jugado. Si está pendiente: inputs numéricos + botón "Pronosticar".
- **Leaderboard**: Tabla rankeada con posición, avatar, username, puntos totales.

---

## 9. Flujo UX (Admin `/admin/pencas`)

- **Botón "Fetch desde API"**: Trae grupos, equipos y partidos desde football-data.org.
- **Tabla de partidos**: Filtrable por grupo/etapa. Edición inline de scores.
- **Botón "Calcular Puntos"**: Recalcula todas las predicciones de un partido.

---

## 10. Variables de Entorno

```
FOOTBALL_DATA_API_KEY=tu_api_key_aqui
```

---

## 11. Dependencias

Ninguna nueva — todo se implementa con la pila actual del proyecto.

---

## 12. Orden de Implementación

1. **DB**: Agregar tablas a `schema.ts` → `pnpm db:generate && pnpm db:migrate`
2. **Utils**: `scoring.ts`, `api-football-data.ts`, `rewards.ts`
3. **Actions**: `src/actions/pencas.ts` → importar en `src/actions/index.ts`
4. **Admin**: `PencasAdmin.tsx` → `admin/pencas.astro` → link en `AdminSidebar.tsx`
5. **Community**: `PencasApp.tsx`, `GroupsView.tsx`, `Leaderboard.tsx` → `comunidad/pencas.astro` → link en `CommunitySidebar.tsx`
