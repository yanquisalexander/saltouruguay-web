import pako from "pako";

// Convierte base64 URL safe a Uint8Array
function base64UrlToUint8Array(base64url: string): Uint8Array {
    const b64 = base64url
        .replace(/-/g, "+")
        .replace(/_/g, "/")
        + "===".slice((base64url.length + 3) % 4);

    const binary = atob(b64);
    const len = binary.length;
    const bytes = new Uint8Array(len);

    for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
    }

    return bytes;
}

// 👉 Helper principal para decodificar el audio
export function decodeAudioFromPusher(encoded: string): Uint8Array {
    const gzipData = base64UrlToUint8Array(encoded);
    const raw = pako.ungzip(gzipData);
    return raw; // Uint8Array con los bytes del audio WAV/MP3
}
