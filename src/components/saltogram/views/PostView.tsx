import { useState, useEffect } from "preact/hooks";
import { toast } from "sonner";
import { LucideLoader2, LucideAlertCircle } from "lucide-preact";
import PostCard from "../PostCard";
import SaltogramFeed from "../SaltogramFeed";
import type { Session } from "@auth/core/types";
import type { SaltogramPost } from "@/types/saltogram";

interface PostViewProps {
    user?: Session["user"];
    postId?: string; // From router
    initialPost?: SaltogramPost | null;
    path?: string;
}

export default function PostView({ user, postId, initialPost }: PostViewProps) {
    const [post, setPost] = useState<SaltogramPost | null>(
        (postId && String(initialPost?.id) === postId) ? (initialPost ?? null) : null
    );
    const [loading, setLoading] = useState(!post);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!postId) return;

        // If we already have the correct post loaded (from initialPost or previous fetch), don't refetch
        if (post && String(post.id) === postId) {
            document.title = `${post.user.displayName} en Saltogram`;
            return;
        }

        setLoading(true);
        setError(false);

        fetch(`/api/saltogram/post/${postId}`)
            .then(res => {
                if (!res.ok) throw new Error("Error");
                return res.json();
            })
            .then(data => {
                setPost(data.post);
                document.title = `${data.post.user.displayName} en Saltogram`;
            })
            .catch(() => {
                setError(true);
                toast.error("No pudimos abrir esta publicación");
                setPost(null);
                document.title = "Publicación no encontrada - Saltogram";
            })
            .finally(() => {
                setLoading(false);
            });
    }, [postId, initialPost]);

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <LucideLoader2 size={32} className="animate-spin text-white/50" />
            </div>
        );
    }

    if (error || !post) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-white/50 gap-4">
                <LucideAlertCircle size={48} />
                <p>Esta publicación no está disponible.</p>
            </div>
        );
    }

    return (
        <section className="space-y-6">
            <div className="bg-white/5 backdrop-blur rounded-3xl border border-white/10 p-4">
                <PostCard post={post} currentUserId={user?.id} isAdmin={user?.isAdmin} />
            </div>

        </section>
    );
}
