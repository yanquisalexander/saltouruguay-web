import clsx, { type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { $ } from "./dom-selector";

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