# Mascota Saltana - Sistema de Mascota Virtual

## Descripción General

La **Mascota Saltana** es un sistema de mascota virtual integrado en SaltoUruguayServer, similar a Pou o Tamagotchi, donde los usuarios pueden criar, alimentar y cuidar su propia mascota, personalizar su casa, jugar mini-juegos y visitar las mascotas de otros usuarios.

## Características Implementadas

### ✅ Sistema Base
- Creación automática de mascota para cada usuario
- Sistema de estadísticas dinámicas:
  - 🍔 Hambre
  - 😊 Felicidad
  - ⚡ Energía
  - ✨ Higiene
- Degradación automática de stats con el tiempo
- Sistema de etapas de crecimiento (huevo → bebé → niño → adolescente → adulto)
- Sistema de experiencia y niveles

### ✅ Acciones Básicas
- **Alimentar**: Reduce el hambre, aumenta felicidad, gana experiencia
- **Limpiar**: Restaura higiene, aumenta felicidad, gana experiencia
- **Dormir**: Restaura energía, aumenta felicidad, gana experiencia

### ✅ Economía Integrada
- Tienda de items con Saltocoins
- Tipos de items:
  - 🍔 Comida
  - 🏠 Decoración
  - 👕 Ropa
  - 🎩 Accesorios
  - 🎮 Juguetes
- Sistema de inventario
- Transacciones registradas en Banco Saltano

### ✅ Mini-Juegos
- **Clicker de Monedas**: Juego de clicks con límite diario
- Sistema de recompensas basado en puntuación
- Límite de 5 partidas por día
- Experiencia para la mascota

### ✅ Sistema Social
- Visitar mascotas de otros usuarios
- Dejar "likes" (recompensados con Saltocoins)
- Sistema de registro de visitas

## Estructura de Base de Datos

### Tablas Principales

#### `pets`
- Almacena información de cada mascota
- Estadísticas, apariencia, etapa de crecimiento
- Timestamps de última alimentación, limpieza, descanso

#### `pet_houses`
- Sistema de decoración de casas
- Layout personalizable (papel tapiz, piso, tema)
- Posicionamiento de items decorativos

#### `pet_items`
- Catálogo de items disponibles en la tienda
- Precios en Saltocoins
- Metadata con efectos de cada item

#### `pet_inventory`
- Inventario de cada usuario
- Cantidad de items poseídos

#### `pet_visits`
- Historial de visitas entre usuarios
- Registro de likes y regalos

#### `pet_mini_game_sessions`
- Historial de partidas de mini-juegos
- Puntuaciones y recompensas

#### `pet_mini_game_limits`
- Control de límites diarios de juego
- Reset automático cada día

## API y Acciones

### Acciones de Mascota (`actions.pets`)

```typescript
// Obtener mascota
actions.pets.getPet()
actions.pets.getPetSummary()

// Acciones básicas
actions.pets.feedPet({ itemId?: number })
actions.pets.cleanPet()
actions.pets.sleepPet()

// Personalización
actions.pets.updateAppearance({ color, shape, accessories, clothing })

// Tienda e inventario
actions.pets.getShopItems({ type?: 'food' | 'decoration' | ... })
actions.pets.purchaseItem({ itemId })
actions.pets.getInventory()

// Casa
actions.pets.getHouse()
actions.pets.updateHouse({ layout?, items? })

// Social
actions.pets.visitPet({ ownerId })
actions.pets.leaveLike({ ownerId })

// Mini-juegos
actions.pets.canPlayMinigame({ gameName })
actions.pets.recordMinigameSession({ gameName, score })
```

## Páginas Disponibles

- `/mascota` - Página principal de la mascota
- `/mascota/tienda` - Tienda de items
- `/mascota/inventario` - Inventario del usuario
- `/mascota/casa` - Decoración de casa (en desarrollo)
- `/mascota/juegos` - Lista de mini-juegos
- `/mascota/juegos/coin-clicker` - Mini-juego Clicker de Monedas

## Sistema de Cron

### Actualización Automática de Stats
El endpoint `/api/cron` incluye la tarea `update-pet-stats` que:
- Actualiza las estadísticas de todas las mascotas
- Aplica degradación basada en tiempo transcurrido
- Se recomienda ejecutar cada 1-6 horas

### Ejemplo de uso:
```bash
curl -X POST https://tu-dominio.com/api/cron \
  -H "Content-Type: application/json" \
  -d '{"secret": "TU_CRON_SECRET", "task": "update-pet-stats"}'
```

## Seeding de Items

### Inicializar Catálogo de Items
Para poblar la tienda con items iniciales:

```bash
# Opción 1: Via script
npm run tsx src/db/seed-pet-items.ts

# Opción 2: Via API
curl -X POST https://tu-dominio.com/api/pet-items/seed \
  -H "Content-Type: application/json" \
  -d '{"secret": "TU_CRON_SECRET"}'

# Verificar estado
curl https://tu-dominio.com/api/pet-items/seed
```

## Configuración

### Variables de Entorno Requeridas
Las mismas que el resto de la aplicación. El sistema utiliza:
- `CRON_SECRET` para endpoints de cron y seeding

### Migración de Base de Datos
```bash
npm run db:generate  # Genera migración
npm run db:migrate   # Aplica migración
```

## Economía del Sistema

### Precios de Items
- Comida: 30-75 Saltocoins
- Decoración: 100-200 Saltocoins
- Ropa: 100-150 Saltocoins
- Accesorios: 80-200 Saltocoins
- Juguetes: 50-300 Saltocoins

### Recompensas
- **Mini-juegos**: Hasta 50 Saltocoins por partida (según puntuación)
- **Likes recibidos**: 5 Saltocoins por like
- **Experiencia**: Ganada al realizar acciones y jugar

### Límites Diarios
- 5 partidas de mini-juegos por día
- 1 like por mascota por día (por usuario)

## Próximas Características

### En Desarrollo
- [ ] Sistema completo de decoración con drag & drop
- [ ] Más mini-juegos (Saltano Runner, Atrapa la Moneda)
- [ ] Sistema de misiones diarias
- [ ] Eventos globales
- [ ] Competencias de decoración
- [ ] Mascotas secundarias
- [ ] Sistema de regalos entre usuarios
- [ ] Chat en visitas
- [ ] Rankings de mascotas

## Arquitectura Técnica

### Frontend
- **Framework**: Astro + Preact
- **Componentes principales**:
  - `PetApp.tsx`: Vista principal de mascota
  - `ShopApp.tsx`: Tienda
  - `InventoryApp.tsx`: Inventario
  - `CoinClickerGame.tsx`: Mini-juego

### Backend
- **Servicio**: `PetService` (src/services/pet-service.ts)
- **Acciones**: Capa de acciones Astro (src/actions/pets.ts)
- **Base de datos**: PostgreSQL con Drizzle ORM
- **Integración**: Banco Saltano para economía

### Serverless Ready
- ✅ Sin estado de servidor
- ✅ Sin websockets (excepto Pusher para eventos opcionales)
- ✅ Todas las operaciones via API
- ✅ Cron jobs externalizables

## Mantenimiento

### Monitoreo
- Verificar degradación de stats
- Monitorear transacciones de Saltocoins
- Revisar límites diarios de juegos

### Backups
- Incluir todas las tablas `pet_*` en backups
- Considerar histórico de `pet_visits` y `pet_mini_game_sessions`

## Troubleshooting

### La mascota no aparece
- Verificar que la migración se aplicó correctamente
- La mascota se crea automáticamente en primer acceso

### No aparecen items en la tienda
- Ejecutar el seeding: `npm run tsx src/db/seed-pet-items.ts`
- O usar el endpoint `/api/pet-items/seed`

### Stats no se degradan
- Verificar que el cron job esté configurado
- Las stats solo se actualizan al cargar la mascota o via cron

### Error al comprar items
- Verificar saldo de Saltocoins en Banco Saltano
- Revisar que el item existe y está disponible

## Contribuir

Para agregar nuevas características:

1. **Nuevos items**: Agregar en `src/db/seeds/pet-items.ts`
2. **Nuevos mini-juegos**: Crear componente en `src/components/mascota/`
3. **Nuevas acciones**: Agregar en `src/actions/pets.ts` y `src/services/pet-service.ts`

## Licencia

Parte del proyecto SaltoUruguayServer
