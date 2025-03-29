import type { Session } from "@auth/core/types";
import { actions } from "astro:actions";
import { LucideKey, LucideQrCode, LucideSmartphone } from "lucide-preact";
import { useState, useRef } from 'preact/hooks';
import { toast } from "sonner";

export const SecuritySection = ({ session }: { session: Session }) => {
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(
        session.user.twoFactorEnabled ?? false
    );
    const [setupStep, setSetupStep] = useState(0);
    const dialogRef = useRef<HTMLDialogElement>(null);
    const [verificationCode, setVerificationCode] = useState('');
    const [qrCodeString, setQrCodeString] = useState('');
    const [secret, setSecret] = useState('');

    const openTwoFactorSetup = () => {
        toast.promise(
            actions.users.twoFactor.generateTwoFactor(), {
            loading: 'Generando código QR...',
            success: ({ data }: any) => {
                console.log('Two-Factor Generation Data:', data)
                setQrCodeString(data.qrCode);
                setSecret(data.secret);  // Now set the original base32 secret
                setSetupStep(0);
                dialogRef.current?.showModal();
                return 'Código QR generado';
            },
            error: (error: Error) => {
                console.error('Error generating QR code:', error);
                toast.error('Error generando el código QR');
            }
        }
        );
    };

    const handleTwoFactorToggle = async () => {
        if (!twoFactorEnabled) {
            openTwoFactorSetup();
        } else {
            const confirmation = confirm(
                '¿Estás seguro de que deseas desactivar la autenticación de dos factores?'
            );
            if (!confirmation) return;

            const code = prompt(
                'Introduce el código de 6 dígitos de tu aplicación de autenticación'
            );
            if (!code) return;

            toast.loading('Desactivando 2FA...', {
                id: "disabling-2fa"
            })


            try {
                const { error, data } = await actions.users.twoFactor.disableTwoFactor({ code })

                if (error) {
                    console.error('Error disabling 2FA:', error);
                    toast.error(error.message, {
                        id: "disabling-2fa"
                    })
                    return;
                }
                toast.success('2FA desactivado correctamente', {
                    id: "disabling-2fa"
                })


            } catch (error) {
                console.error('Error disabling 2FA:', error);
                toast.error('Error desactivando 2FA', {
                    id: "disabling-2fa"
                })
            }
        }
    };

    const handleVerificationSubmit = async (e: Event) => {
        e.preventDefault();
        try {
            console.log('Verification Submission Details:', {
                verificationCode,
                secret,
                secretLength: secret.length,
                secretType: typeof secret
            });

            toast.loading('Verificando código...', {
                id: "verifying-code"
            })

            const { error, data } = await actions.users.twoFactor.enableTwoFactor({
                code: verificationCode,
                secret: secret  // Ensure this is the base32 secret
            });

            if (error) {
                console.error('Full Verification Error:', {
                    errorCode: error.code,
                    errorMessage: error.message,
                    fullError: error
                });
                toast.error(error.message, {
                    id: "verifying-code"
                })
                return;
            }

            toast.success('Código verificado correctamente', {
                id: "verifying-code"
            })

            setTwoFactorEnabled(true);
            dialogRef.current?.close();
        } catch (error) {
            console.error('Verification Submission Catch Error:', error);
            setSetupStep(2);
        }
    };

    const renderDialogContent = () => {
        switch (setupStep) {
            case 0: // QR Code Step
                return (
                    <>
                        <div class="flex flex-col items-center space-y-4 p-6">
                            <LucideQrCode class="w-24 h-24 text-blue-500" />
                            <h2 class="text-xl font-semibold">Configura Autenticación de Dos Factores</h2>
                            <p class="text-neutral-500 text-center">
                                Escanea este código QR con tu aplicación de autenticación (Google Authenticator, Authy)
                            </p>

                            <img src={qrCodeString} alt="QR Code" class="w-32 h-32" />
                            <p class="text-sm text-neutral-500">
                                O introduce el código manualmente:
                            </p>

                            <div class="bg-gray-100 p-2 rounded text-center">
                                <strong>{secret}</strong>
                            </div>
                            <button
                                onClick={() => setSetupStep(1)}
                                class="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
                            >
                                Siguiente
                            </button>
                        </div>
                    </>
                );
            case 1: // Verification Code Step
                return (
                    <form onSubmit={handleVerificationSubmit} class="space-y-4 p-6">
                        <div class="flex items-center space-x-2">
                            <LucideSmartphone class="w-6 h-6 text-blue-500" />
                            <h2 class="text-xl font-semibold">Verifica tu Código</h2>
                        </div>
                        <p class="text-neutral-500">
                            Introduce el código de 6 dígitos de tu aplicación de autenticación
                        </p>
                        <input
                            type="text"
                            value={verificationCode}
                            onInput={(e) => setVerificationCode((e.target as HTMLInputElement).value)}
                            maxLength={6}
                            placeholder="Código de verificación"
                            class="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            type="submit"
                            class="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
                        >
                            Verificar
                        </button>
                    </form>
                );
            case 2: // Error Step
                return (
                    <div class="space-y-4 p-6 text-center">
                        <h2 class="text-xl font-semibold text-red-500">Error de Verificación</h2>
                        <p class="text-neutral-500">
                            El código de verificación es incorrecto. Por favor, inténtalo de nuevo.
                        </p>
                        <button
                            onClick={() => setSetupStep(0)}
                            class="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
                        >
                            Reintentar
                        </button>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <>
            <dialog
                ref={dialogRef}
                class="w-96 rounded-lg shadow-xl backdrop:bg-black/50 p-0"
            >
                {renderDialogContent()}
                <button
                    onClick={() => dialogRef.current?.close()}
                    class="absolute top-4 right-4 text-neutral-500 hover:text-neutral-700"
                >
                    ✕
                </button>
            </dialog>

            <div class="flex flex-col space-y-1.5 py-6 px-2">
                <h3 class="text-xl font-semibold leading-none tracking-tight">
                    Seguridad de la cuenta
                </h3>
                <p class="text-sm text-neutral-400">
                    Protege tu cuenta con medidas de seguridad adicionales.
                </p>
            </div>

            <div class="p-6 pt-0 space-y-6">
                <div class="space-y-4">
                    <div class="flex items-start justify-between">
                        <div>
                            <h3 class="font-medium flex items-center gap-2">
                                <LucideKey class="h-4 w-4" />
                                Autenticación de dos factores (2FA)
                            </h3>
                            <p class="text-sm text-neutral-400 mt-1">
                                Añade una capa adicional de seguridad a tu cuenta requiriendo un código de verificación
                            </p>
                        </div>
                        <div class="flex items-center gap-2">
                            <label class="inline-flex relative items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={twoFactorEnabled}
                                    onChange={handleTwoFactorToggle}
                                    class="sr-only peer"
                                />
                                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

