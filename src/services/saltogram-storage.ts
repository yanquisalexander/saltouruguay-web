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
const MAX_WIDTH = 1200;
const MAX_HEIGHT = 1200;
const QUALITY = 80;

export interface UploadImageResult {
    url: string;
    key: string;
}

/**
 * Upload a file (image or video) to R2
 * @param buffer - The file buffer
 * @param fileName - The name of the file
 * @param userId - The user ID of the uploader
 * @param mimeType - The MIME type of the file
 * @returns The public URL of the uploaded file
 */
export async function uploadMedia(
    buffer: Buffer,
    fileName: string,
    userId: number,
    mimeType: string
): Promise<UploadImageResult> {
    let body = buffer;
    let contentType = mimeType;
    let extension = fileName.split('.').pop() || 'bin';

    // Optimize images
    if (mimeType.startsWith('image/')) {
        try {
            body = await sharp(buffer)
                .rotate()
                .resize(MAX_WIDTH, MAX_HEIGHT, {
                    fit: "inside",
                    withoutEnlargement: true,
                })
                .jpeg({ quality: QUALITY })
                .toBuffer();
            contentType = "image/jpeg";
            extension = "jpg";
        } catch (e) {
            console.warn("Could not optimize image, uploading original", e);
        }
    }

    // Generate a unique key
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const key = `saltogram/${userId}/${timestamp}-${randomString}.${extension}`;

    // Upload to R2
    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: body,
        ContentType: contentType,
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
 * Compress and upload an image to R2
 * @deprecated Use uploadMedia instead
 */
export async function uploadImage(
    imageBuffer: Buffer,
    fileName: string,
    userId: number
): Promise<UploadImageResult> {
    return uploadMedia(imageBuffer, fileName, userId, "image/jpeg");
}

/**
 * Validates an image file
 * @param buffer - The image buffer
 * @returns true if valid, throws error otherwise
 */
export async function validateImage(buffer: Buffer): Promise<boolean> {
    try {
        const metadata = await sharp(buffer).metadata();

        // Check if it's a valid image format
        if (!metadata.format || !['jpeg', 'jpg', 'png', 'webp'].includes(metadata.format)) {
            throw new Error("Formato de imagen no válido. Solo se permiten JPEG, PNG y WebP.");
        }

        // Check file size (max 10MB)
        if (buffer.length > 10 * 1024 * 1024) {
            throw new Error("La imagen es demasiado grande. Tamaño máximo: 10MB.");
        }

        return true;
    } catch (error) {
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("No se pudo validar la imagen.");
    }
}
