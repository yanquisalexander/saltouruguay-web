import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type Pusher from "pusher-js";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Reemplaza espacios por guiones
    .replace(/[^\w\-]+/g, "") // Elimina caracteres no alfanuméricos
    .replace(/\-\-+/g, "-") // Reemplaza múltiples guiones por uno solo
}

export function createPusher(): Pusher {
  const Pusher = require("pusher-js");

  const pusher = new Pusher(import.meta.env.PUBLIC_PUSHER_APP_KEY, {
    cluster: import.meta.env.PUBLIC_PUSHER_APP_CLUSTER,
    authEndpoint: "/api/pusher/auth",
  });

  return pusher;
}