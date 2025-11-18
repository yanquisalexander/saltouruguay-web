import pako from "pako";

// Convierte base64 normal a Uint8Array
function base64ToUint8Array(base64: string): Uint8Array {
    const binary = Buffer.from(base64, "base64");
    return new Uint8Array(binary);
}

// Convierte Uint8Array a base64 URL safe
function uint8ArrayToBase64Url(uint8: Uint8Array): string {
    const b64 = Buffer.from(uint8).toString("base64");
    return b64
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}

// 👉 Helper principal para enviar por Pusher
export function encodeAudioForPusher(base64Audio: string): string {
    // Console log original size
    console.log("Original size:", Buffer.byteLength(base64Audio, "base64"), "bytes");
    const raw = base64ToUint8Array(base64Audio);
    const gz = pako.gzip(raw); // compresión máxima
    console.log("Compressed size:", gz.length, "bytes");
    // Compara tamaños y porcentaje de compresión
    const compressionRatio = (1 - gz.length / Buffer.byteLength(base64Audio, "base64")) * 100;
    console.log("Compression ratio:", compressionRatio.toFixed(2) + "%");

    return uint8ArrayToBase64Url(gz);
}
