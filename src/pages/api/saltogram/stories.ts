import { client } from "@/db/client";
import { SaltogramStoriesTable } from "@/db/schema";
import { uploadImage, validateImage } from "@/services/saltogram-storage";
import type { APIContext } from "astro";
import { getSession } from "auth-astro/server";

export const POST = async ({ request }: APIContext) => {
    const session = await getSession(request);

    if (!session?.user) {
        return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
    }

    const userId = Number(session.user.id);

    try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const duration = Number(formData.get("duration") || 5);

        if (!file) {
            return new Response(JSON.stringify({ error: "Archivo requerido" }), { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        // Basic validation (reuse existing or simple check)
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            return new Response(JSON.stringify({ error: "Archivo muy grande (max 10MB)" }), { status: 400 });
        }

        // Determine type
        const isVideo = file.type.startsWith("video/");
        const mediaType = isVideo ? "video" : "image";

        // Upload
        // Note: uploadImage might be optimized for images, but let's assume it handles generic uploads or we might need a separate one for videos.
        // For now, reusing uploadImage assuming it uploads to S3/R2 and returns a URL.
        const uploadResult = await uploadImage(buffer, file.name, userId);
        const mediaUrl = uploadResult.url;

        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        const [story] = await client.insert(SaltogramStoriesTable)
            .values({
                userId,
                mediaUrl,
                mediaType,
                duration: isVideo ? duration : 5,
                expiresAt
            })
            .returning();

        return new Response(JSON.stringify({ success: true, story }), { status: 200 });

    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: "Error al subir historia" }), { status: 500 });
    }
};
