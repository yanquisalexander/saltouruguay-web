import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

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

function detectAudioFormat(buffer: Buffer): { mime: string; ext: string } {
    if (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) {
        return { mime: "audio/mpeg", ext: "mp3" };
    }
    if (buffer[0] === 0xff && (buffer[1] & 0xf0) === 0xf0) {
        return { mime: "audio/mpeg", ext: "mp3" };
    }
    if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
        return { mime: "audio/wav", ext: "wav" };
    }
    if (buffer[0] === 0x4f && buffer[1] === 0x67 && buffer[2] === 0x67 && buffer[3] === 0x53) {
        return { mime: "audio/ogg", ext: "ogg" };
    }
    if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
        return { mime: "audio/webm", ext: "webm" };
    }
    return { mime: "audio/mpeg", ext: "mp3" };
}

export async function uploadAudio(base64Audio: string): Promise<string> {
    const buffer = Buffer.from(base64Audio, "base64");
    const { mime, ext } = detectAudioFormat(buffer);

    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const key = `tts/${timestamp}-${randomString}.${ext}`;

    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: mime,
    });

    await s3Client.send(command);

    const publicUrl = process.env.R2_PUBLIC_URL
        ? `${process.env.R2_PUBLIC_URL}/${key}`
        : `https://${BUCKET_NAME}.${process.env.R2_ACCOUNT_ID}.r2.dev/${key}`;

    return publicUrl;
}
