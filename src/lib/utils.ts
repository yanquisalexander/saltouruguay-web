import clsx, { type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { $ } from "./dom-selector";
import Pusher from "pusher-js";
import { PUSHER_APP_ID, PUSHER_APP_KEY } from "astro:env/client";
const toSlug = (await import("slugify")).default;


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const showSignInDialog = () => {

  const $signInDialog = $("#login-modal") as HTMLDialogElement;

  if ($signInDialog) {
    $signInDialog.showModal();
    return;
  }
}

export const createPusher = () => {
  const host = /* import.meta.env.DEV ? 'localhost' :  */`soketi.saltouruguayserver.com`;
  return new Pusher(PUSHER_APP_KEY, {
    wsHost: host,
    cluster: "us2",
    enabledTransports: ['ws', 'wss'],
    forceTLS: true
  });
}

export const slugify = (text: string) => {
  return toSlug(text, { lower: true, strict: true, remove: /[*+~.()'"!:@]/g });
}