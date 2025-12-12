-- Migration: add comment reactions table

CREATE TABLE IF NOT EXISTS public.saltogram_comment_reactions (
    id SERIAL PRIMARY KEY,
    comment_id INTEGER NOT NULL REFERENCES public.saltogram_comments(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    emoji VARCHAR(10) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT current_timestamp
);

CREATE UNIQUE INDEX IF NOT EXISTS unique_user_comment_emoji ON public.saltogram_comment_reactions(comment_id, user_id, emoji);

CREATE INDEX IF NOT EXISTS idx_saltogram_comment_reactions_comment_id ON public.saltogram_comment_reactions(comment_id);
