-- Índices compuestos para optimizar queries de Saltogram

-- 1. Feed queries: filtrar posts no ocultos y ordenar por fecha
CREATE INDEX IF NOT EXISTS idx_saltogram_posts_hidden_created
ON saltogram_posts (is_hidden, created_at DESC);

-- 2. Sorting: pinned -> featured -> fecha
CREATE INDEX IF NOT EXISTS idx_saltogram_posts_pin_feature_created
ON saltogram_posts (is_pinned DESC, is_featured DESC, created_at DESC);

-- 3. Messages: conteo de no leídos por receptor
CREATE INDEX IF NOT EXISTS idx_saltogram_messages_receiver_unread
ON saltogram_messages (receiver_id, is_read)
WHERE is_read = false;

-- 4. Messages: historial de conversación entre 2 usuarios
CREATE INDEX IF NOT EXISTS idx_saltogram_messages_participants_created
ON saltogram_messages (sender_id, receiver_id, created_at DESC);

-- 5. Stories: activas por usuario (para getFeed)
CREATE INDEX IF NOT EXISTS idx_saltogram_stories_user_expires
ON saltogram_stories (user_id, expires_at DESC);

-- 6. Notes: activas por usuario (para getFeed)
CREATE INDEX IF NOT EXISTS idx_saltogram_notes_user_expires
ON saltogram_notes (user_id, expires_at DESC);

-- 7. Reactions: búsqueda por post (N+1 eliminado, pero índice ayuda a las subqueries)
CREATE INDEX IF NOT EXISTS idx_saltogram_reactions_post_created
ON saltogram_reactions (post_id, created_at DESC);

-- 8. Comments: búsqueda por post (para latestComments subquery)
CREATE INDEX IF NOT EXISTS idx_saltogram_comments_post_created
ON saltogram_comments (post_id, created_at DESC);
