import clsx, { type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { $ } from "./dom-selector";
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

export const slugify = (text: string) => {
  return toSlug(text, { lower: true, strict: true, remove: /[*+~.()'"!:@]/g });
}

export const IS_DEV = import.meta.env.DEV;