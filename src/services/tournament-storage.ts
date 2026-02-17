import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";

const s3Client = new S3Client({
    region: "auto",
    endpoint: process.env.R2_PUBLIC_URL
        ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
        : undefined,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME || "saltogram";
const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1080;
const QUALITY = 85;

export interface UploadImageResult {
    url: string;
    key: string;
}

/**
 * Upload and optimize a tournament cover image
 * Converts to WebP and resizes to max 1920x1080 while maintaining aspect ratio
 * @param buffer - The image buffer
 * @param fileName - The name of the file
 * @param tournamentId - The tournament ID
 * @returns The public URL and key of the uploaded file
 */
export async function uploadTournamentCover(
    buffer: Buffer,
    fileName: string,
    tournamentId: number
): Promise<UploadImageResult> {
    // Validate image first
    await validateTournamentImage(buffer);

    // Optimize image: convert to WebP and resize
    const optimizedBuffer = await sharp(buffer)
        .rotate() // Auto-rotate based on EXIF
        .resize(MAX_WIDTH, MAX_HEIGHT, {
            fit: "inside",
            withoutEnlargement: true,
        })
        .webp({ quality: QUALITY })
        .toBuffer();

    // Generate a unique key
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const key = `tournaments/${tournamentId}/cover-${timestamp}-${randomString}.webp`;

    // Upload to R2
    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: optimizedBuffer,
        ContentType: "image/webp",
    });

    await s3Client.send(command);

    // Return the public URL
    const publicUrl = process.env.R2_PUBLIC_URL
        ? `${process.env.R2_PUBLIC_URL}/${key}`
        : `https://${BUCKET_NAME}.${process.env.R2_ACCOUNT_ID}.r2.dev/${key}`;

    return {
        url: publicUrl,
        key,
    };
}

/**
 * Validates a tournament cover image
 * @param buffer - The image buffer
 * @returns true if valid, throws error otherwise
 */
export async function validateTournamentImage(buffer: Buffer): Promise<boolean> {
    try {
        const metadata = await sharp(buffer).metadata();

        // Check if it's a valid image format
        if (!metadata.format || !['jpeg', 'jpg', 'png', 'webp', 'gif'].includes(metadata.format)) {
            throw new Error("Formato de imagen no válido. Solo se permiten JPEG, PNG, WebP y GIF.");
        }

        // Check file size (max 15MB)
        if (buffer.length > 15 * 1024 * 1024) {
            throw new Error("La imagen es demasiado grande. Tamaño máximo: 15MB.");
        }

        // Check dimensions
        if (metadata.width && metadata.height) {
            if (metadata.width < 400 || metadata.height < 200) {
                throw new Error("La imagen es demasiado pequeña. Dimensiones mínimas: 400x200.");
            }
        }

        return true;
    } catch (error) {
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("Error al validar la imagen.");
    }
}
