import type { Session } from "@auth/core/types";
import { actions } from "astro:actions";
import {
    LucideKey,
    LucideQrCode,
    LucideSmartphone,
    LucideShieldCheck,
    LucideShieldAlert,
    LucideCopy,
    LucideCheck,
    LucideX,
    LucideLoader2,
    LucideLock
} from "lucide-preact";
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
    const [isLoading, setIsLoading] = useState(false);

    // --- LOGICA EXISTENTE (Con mejoras de UX) ---

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Código copiado al portapapeles");
    };

    const openTwoFactorSetup = () => {
        setIsLoading(true);
        toast.promise(
            actions.users.twoFactor.generateTwoFactor(), {
            loading: 'Generando credenciales de seguridad...',
            success: ({ data }: any) => {
                setQrCodeString(data.qrCode);
                setSecret(data.secret);
                setSetupStep(0);
                setIsLoading(false);
                dialogRef.current?.showModal();
                return 'Listo para configurar';
            },
            error: (error: Error) => {
                console.error('Error generating QR:', error);
                setIsLoading(false);
                return 'Error al iniciar el proceso';
            }
        });
    };

    const handleTwoFactorToggle = async () => {
        if (!twoFactorEnabled) {
            openTwoFactorSetup();
        } else {
            const confirmation = confirm('¿Estás seguro de que deseas desactivar la autenticación de dos factores? Esto reducirá la seguridad de tu cuenta.');
            if (!confirmation) return;

            const code = prompt('Introduce el código de 6 dígitos de tu aplicación para confirmar:');
            if (!code) return;

            toast.loading('Desactivando 2FA...', { id: "disabling-2fa" });

            try {
                const { error } = await actions.users.twoFactor.disableTwoFactor({ code });
                if (error) {
                    toast.error(error.message, { id: "disabling-2fa" });
                    return;
                }
                toast.success('2FA desactivado correctamente', { id: "disabling-2fa" });
                setTwoFactorEnabled(false);
            } catch (error) {
                toast.error('Error interno al desactivar', { id: "disabling-2fa" });
            }
        }
    };

    const handleVerificationSubmit = async (e: Event) => {
        e.preventDefault();
        try {
            toast.loading('Verificando código...', { id: "verifying-code" });

            const { error } = await actions.users.twoFactor.enableTwoFactor({
                code: verificationCode,
                secret: secret
            });

            if (error) {
                toast.error(error.message, { id: "verifying-code" });
                // No cambiamos de paso automáticamente para dejar que el usuario corrija
                return;
            }

            toast.success('¡Seguridad mejorada! 2FA Activado.', { id: "verifying-code" });
            setTwoFactorEnabled(true);
            dialogRef.current?.close();
            setVerificationCode('');
        } catch (error) {
            console.error('Verification Error:', error);
            setSetupStep(2); // Ir a pantalla de error fatal si explota
        }
    };

    // --- RENDERIZADO DEL MODAL ---
    const renderDialogContent = () => {
        switch (setupStep) {
            case 0: // QR Code Step
                return (
                    <div class="flex flex-col items-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-4 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            <LucideQrCode size={48} />
                        </div>

                        <div className="text-center space-y-2">
                            <h2 class="text-2xl font-anton text-white uppercase tracking-wide">Vincular Dispositivo</h2>
                            <p class="text-sm font-rubik text-neutral-400 max-w-xs mx-auto">
                                Escanea el código con <strong>Google Authenticator</strong> o <strong>Authy</strong>.
                            </p>
                        </div>

                        {/* QR Container - Fondo blanco necesario para lectura */}
                        <div className="p-4 bg-white rounded-xl shadow-lg shadow-white/10">
                            <img src={qrCodeString} alt="QR Code" class="w-40 h-40 mix-blend-multiply" />
                        </div>

                        <div className="w-full space-y-2">
                            <p class="text-xs text-neutral-500 uppercase tracking-widest text-center font-bold">O ingresa el código manual</p>
                            <div
                                onClick={() => copyToClipboard(secret)}
                                class="flex items-center justify-between bg-black/40 border border-white/10 p-3 rounded-lg cursor-pointer hover:bg-white/5 transition-colors group"
                            >
                                <code class="font-mono text-yellow-400 text-sm tracking-wider truncate mr-2">
                                    {secret}
                                </code>
                                <LucideCopy size={16} class="text-neutral-500 group-hover:text-white transition-colors" />
                            </div>
                        </div>

                        <button
                            onClick={() => setSetupStep(1)}
                            class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-900/20"
                        >
                            Siguiente Paso
                        </button>
                    </div>
                );
            case 1: // Verification Code Step
                return (
                    <form onSubmit={handleVerificationSubmit} class="flex flex-col items-center space-y-6 animate-in slide-in-from-right-10 duration-200">
                        <div className="p-4 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            <LucideSmartphone size={48} />
                        </div>

                        <div className="text-center space-y-2">
                            <h2 class="text-2xl font-anton text-white uppercase tracking-wide">Confirmar Código</h2>
                            <p class="text-sm font-rubik text-neutral-400">
                                Ingresa los 6 dígitos que aparecen en tu app.
                            </p>
                        </div>

                        <div className="w-full">
                            <input
                                type="text"
                                value={verificationCode}
                                onInput={(e) => {
                                    // Solo números
                                    const val = (e.target as HTMLInputElement).value.replace(/\D/g, '');
                                    setVerificationCode(val);
                                }}
                                maxLength={6}
                                placeholder="000 000"
                                class="w-full bg-[#0a0a0a] border-2 border-white/10 focus:border-purple-500 rounded-xl py-4 text-center text-3xl font-mono tracking-[0.5em] text-white placeholder:text-white/10 outline-none transition-colors"
                                autoFocus
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={verificationCode.length !== 6}
                            class="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2"
                        >
                            <LucideCheck size={20} /> Verificar y Activar
                        </button>

                        <button
                            type="button"
                            onClick={() => setSetupStep(0)}
                            class="text-xs text-neutral-500 hover:text-white underline"
                        >
                            Volver al QR
                        </button>
                    </form>
                );
            case 2: // Error Fatal
                return (
                    <div class="flex flex-col items-center space-y-6 text-center">
                        <div className="p-4 rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
                            <LucideShieldAlert size={48} />
                        </div>
                        <h2 class="text-xl font-bold text-red-400">Error de Configuración</h2>
                        <p class="text-neutral-400 text-sm">
                            No pudimos verificar el código. Por favor reinicia el proceso.
                        </p>
                        <button
                            onClick={() => { setSetupStep(0); setVerificationCode(''); }}
                            class="w-full bg-white/10 hover:bg-white/20 text-white py-2 rounded-lg"
                        >
                            Reintentar
                        </button>
                    </div>
                );
            default:
                return null;
        }
    };

    // --- RENDERIZADO PRINCIPAL ---
    return (
        <div className="p-6 md:p-8 space-y-8 animate-fade-in">

            {/* Dialog Nativo Estilizado */}
            <dialog
                ref={dialogRef}
                class="backdrop:bg-black/80 backdrop:backdrop-blur-sm bg-[#111] text-white border border-white/10 rounded-2xl shadow-2xl p-0 max-w-md w-full m-auto open:animate-in open:fade-in open:zoom-in-95"
                onClick={(e) => {
                    // Cerrar al hacer click fuera
                    const dialog = dialogRef.current;
                    if (dialog && e.target === dialog) dialog.close();
                }}
            >
                <div class="relative p-8">
                    <button
                        onClick={() => dialogRef.current?.close()}
                        class="absolute top-4 right-4 text-neutral-500 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
                    >
                        <LucideX size={20} />
                    </button>
                    {renderDialogContent()}
                </div>
            </dialog>

            {/* Header Sección */}
            <div>
                <h3 className="text-xl font-anton text-white uppercase tracking-wide mb-6 flex items-center gap-2">
                    <div className="w-1 h-6 bg-green-500 rounded-full"></div>
                    Centro de Seguridad
                </h3>

                {/* Tarjeta 2FA */}
                <div className={`
                    relative overflow-hidden rounded-xl border p-6 transition-all duration-500
                    ${twoFactorEnabled
                        ? 'bg-green-500/5 border-green-500/30'
                        : 'bg-white/5 border-white/5 hover:border-white/10'
                    }
                `}>
                    <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">

                        {/* Info */}
                        <div class="flex items-start gap-4">
                            <div className={`
                                p-3 rounded-xl shrink-0 transition-colors
                                ${twoFactorEnabled ? 'bg-green-500 text-black shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 'bg-white/10 text-white/50'}
                            `}>
                                {twoFactorEnabled ? <LucideShieldCheck size={28} /> : <LucideKey size={28} />}
                            </div>
                            <div>
                                <h3 className={`font-bold text-lg ${twoFactorEnabled ? 'text-green-400' : 'text-white'}`}>
                                    Autenticación de Dos Factores (2FA)
                                </h3>
                                <p className="text-sm text-white/50 mt-1 max-w-lg">
                                    {twoFactorEnabled
                                        ? "Tu cuenta está blindada. Se requerirá un código temporal cada vez que inicies sesión en un nuevo dispositivo."
                                        : "Añade una capa extra de protección. Evita accesos no autorizados incluso si roban tu contraseña."
                                    }
                                </p>
                            </div>
                        </div>

                        {/* Action */}
                        <div class="flex items-center">
                            <button
                                onClick={handleTwoFactorToggle}
                                disabled={isLoading}
                                className={`
                                    relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0a0a0a] focus:ring-blue-500
                                    ${twoFactorEnabled ? 'bg-green-500' : 'bg-white/20'}
                                    ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                                `}
                            >
                                <span className="sr-only">Activar 2FA</span>
                                <span
                                    className={`
                                        inline-block h-6 w-6 transform rounded-full bg-white transition-transform duration-300 shadow-md flex items-center justify-center
                                        ${twoFactorEnabled ? 'translate-x-7' : 'translate-x-1'}
                                    `}
                                >
                                    {isLoading ? (
                                        <LucideLoader2 size={12} class="animate-spin text-black" />
                                    ) : (
                                        twoFactorEnabled ? <LucideCheck size={12} class="text-green-600" /> : <LucideLock size={12} class="text-neutral-400" />
                                    )}
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Status Text Footer */}
                    <div class="mt-6 pt-4 border-t border-white/5 flex items-center gap-2 text-xs font-mono uppercase tracking-wider">
                        Estado:
                        <span className={twoFactorEnabled ? "text-green-400 font-bold" : "text-red-400 font-bold"}>
                            {twoFactorEnabled ? "PROTEGIDO" : "VULNERABLE"}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}