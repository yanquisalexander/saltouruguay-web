import type { Session } from "@auth/core/types";
import { actions } from "astro:actions";
import {
    LucideKey,
    LucideSmartphone,
    LucideShieldCheck,
    LucideShieldAlert,
    LucideCopy,
    LucideCheck,
    LucideX,
    LucideLoader2,
    LucideLock,
    LucideFingerprint
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
                return;
            }

            toast.success('¡Seguridad mejorada! 2FA Activado.', { id: "verifying-code" });
            setTwoFactorEnabled(true);
            dialogRef.current?.close();
            setVerificationCode('');
        } catch (error) {
            console.error('Verification Error:', error);
            setSetupStep(2);
        }
    };

    const renderDialogContent = () => {
        switch (setupStep) {
            case 0:
                return (
                    <div class="flex flex-col items-center space-y-5 animate-fade-in">
                        <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-white/40">
                            <span className="size-6 rounded-full bg-blue-500 text-white text-[11px] font-bold flex items-center justify-center">1</span>
                            <span className="w-6 h-px bg-white/15" />
                            <span className="size-6 rounded-full bg-white/10 text-white/40 text-[11px] font-bold flex items-center justify-center">2</span>
                        </div>

                        <div className="text-center space-y-1.5">
                            <h2 class="text-xl font-anton text-white uppercase tracking-wide">Vinculá tu app</h2>
                            <p class="text-[13px] font-rubik text-white/50 max-w-xs mx-auto leading-relaxed">
                                Escaneá el QR con <strong className="text-white/80">Google Authenticator</strong>, <strong className="text-white/80">Authy</strong> o <strong className="text-white/80">1Password</strong>.
                            </p>
                        </div>

                        <div className="p-3.5 bg-white rounded-2xl shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)]">
                            <img src={qrCodeString} alt="QR Code" class="w-44 h-44 mix-blend-multiply" />
                        </div>

                        <div className="w-full space-y-1.5">
                            <p class="text-[10px] text-white/35 uppercase tracking-widest text-center font-bold">O ingresá el código manual</p>
                            <div
                                onClick={() => copyToClipboard(secret)}
                                class="flex items-center justify-between bg-black/50 border border-white/10 p-3 rounded-xl cursor-pointer hover:bg-white/5 hover:border-white/20 transition-colors group"
                            >
                                <code class="font-mono text-amber-300 text-[13px] tracking-wider truncate mr-2">
                                    {secret}
                                </code>
                                <LucideCopy size={15} class="text-white/30 group-hover:text-white transition-colors shrink-0" />
                            </div>
                        </div>

                        <button
                            onClick={() => setSetupStep(1)}
                            class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm uppercase tracking-wider py-3 rounded-xl transition-all shadow-lg shadow-blue-950/50 cursor-pointer"
                        >
                            Ya lo escaneé — continuar
                        </button>
                    </div>
                );
            case 1:
                return (
                    <form onSubmit={handleVerificationSubmit} class="flex flex-col items-center space-y-5 animate-fade-in">
                        <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-white/40">
                            <span className="size-6 rounded-full bg-emerald-500 text-white text-[11px] font-bold flex items-center justify-center"><LucideCheck size={13} /></span>
                            <span className="w-6 h-px bg-white/15" />
                            <span className="size-6 rounded-full bg-violet-500 text-white text-[11px] font-bold flex items-center justify-center">2</span>
                        </div>

                        <div className="text-center space-y-1.5">
                            <h2 class="text-xl font-anton text-white uppercase tracking-wide">Confirmá el código</h2>
                            <p class="text-[13px] font-rubik text-white/50">
                                Ingresá los 6 dígitos de tu app.
                            </p>
                        </div>

                        <input
                            type="text"
                            value={verificationCode}
                            onInput={(e) => {
                                const val = (e.target as HTMLInputElement).value.replace(/\D/g, '');
                                setVerificationCode(val);
                            }}
                            maxLength={6}
                            placeholder="000 000"
                            inputMode="numeric"
                            class="w-full bg-black/50 border-2 border-white/10 focus:border-violet-500 rounded-2xl py-4 text-center text-3xl font-mono tracking-[0.5em] text-white placeholder:text-white/10 outline-hidden transition-colors"
                            autoFocus
                        />

                        <button
                            type="submit"
                            disabled={verificationCode.length !== 6}
                            class="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm uppercase tracking-wider py-3 rounded-xl transition-all shadow-lg shadow-violet-950/50 flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <LucideCheck size={17} /> Verificar y activar
                        </button>

                        <button
                            type="button"
                            onClick={() => setSetupStep(0)}
                            class="text-xs text-white/35 hover:text-white underline underline-offset-4 cursor-pointer"
                        >
                            Volver al QR
                        </button>
                    </form>
                );
            case 2:
                return (
                    <div class="flex flex-col items-center space-y-5 text-center animate-fade-in">
                        <div className="size-16 rounded-2xl bg-red-500/10 text-red-400 border border-red-400/25 flex items-center justify-center">
                            <LucideShieldAlert size={30} />
                        </div>
                        <div>
                            <h2 class="text-xl font-anton text-white uppercase">Algo salió mal</h2>
                            <p class="text-white/50 text-[13px] mt-1">
                                No pudimos verificar el código. Revisá la hora de tu teléfono y reintentá.
                            </p>
                        </div>
                        <button
                            onClick={() => { setSetupStep(0); setVerificationCode(''); }}
                            class="w-full bg-white/10 hover:bg-white/15 text-white text-sm font-bold uppercase tracking-wider py-3 rounded-xl cursor-pointer"
                        >
                            Reintentar
                        </button>
                    </div>
                );
            default:
                return null;
        }
    };

    const score = twoFactorEnabled ? 100 : 60;

    return (
        <div className="p-5 sm:p-7 space-y-6 animate-fade-in">

            <dialog
                ref={dialogRef}
                class="backdrop:bg-black/80 backdrop:backdrop-blur-sm bg-[#131318] text-white border border-white/10 rounded-3xl shadow-2xl p-0 max-w-sm w-[calc(100%-2rem)] m-auto"
                onClick={(e) => {
                    const dialog = dialogRef.current;
                    if (dialog && e.target === dialog) dialog.close();
                }}
            >
                <div class="relative p-6 sm:p-7">
                    <button
                        onClick={() => dialogRef.current?.close()}
                        class="absolute top-4 right-4 text-white/35 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                        aria-label="Cerrar"
                    >
                        <LucideX size={17} />
                    </button>
                    {renderDialogContent()}
                </div>
            </dialog>

            {/* Header + score */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h3 className="text-lg font-anton text-white uppercase tracking-wide leading-none">
                        Centro de seguridad
                    </h3>
                    <p className="text-xs text-white/40 mt-1.5">
                        Protegé tu cuenta contra accesos no autorizados.
                    </p>
                </div>
                <div className="text-right shrink-0">
                    <p className={`text-2xl font-anton leading-none ${twoFactorEnabled ? "text-emerald-300" : "text-amber-300"}`}>{score}%</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/35 mt-1">Nivel seguro</p>
                </div>
            </div>

            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-700 ${twoFactorEnabled ? "bg-gradient-to-r from-emerald-500 to-teal-300" : "bg-gradient-to-r from-amber-500 to-orange-400"}`}
                    style={{ width: `${score}%` }}
                />
            </div>

            {/* Tarjeta 2FA */}
            <div className={`
                relative overflow-hidden rounded-2xl border p-5 transition-all duration-500
                ${twoFactorEnabled
                    ? 'bg-emerald-500/[0.06] border-emerald-400/25'
                    : 'bg-white/[0.04] border-white/10 hover:border-white/20'
                }
            `}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                    <div className="flex items-start gap-4">
                        <div className={`
                            size-12 rounded-2xl shrink-0 flex items-center justify-center transition-all
                            ${twoFactorEnabled ? 'bg-emerald-400 text-black shadow-[0_0_24px_-4px_rgba(52,211,153,0.6)]' : 'bg-white/8 border border-white/10 text-white/50'}
                        `}>
                            {twoFactorEnabled ? <LucideShieldCheck size={24} /> : <LucideFingerprint size={24} />}
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h4 className={`font-bold text-[15px] ${twoFactorEnabled ? 'text-emerald-200' : 'text-white'}`}>
                                    Verificación en dos pasos
                                </h4>
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${twoFactorEnabled ? "text-emerald-300 bg-emerald-500/10 border-emerald-400/25" : "text-amber-300 bg-amber-500/10 border-amber-400/25"}`}>
                                    {twoFactorEnabled ? "Activado" : "Recomendado"}
                                </span>
                            </div>
                            <p className="text-[13px] text-white/50 mt-1 leading-relaxed max-w-md">
                                {twoFactorEnabled
                                    ? "Tu cuenta pide un código temporal al iniciar sesión en un dispositivo nuevo."
                                    : "Sumá una capa extra: aunque roben tu contraseña, no podrán entrar sin tu teléfono."}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleTwoFactorToggle}
                        disabled={isLoading}
                        aria-pressed={twoFactorEnabled}
                        className={`
                            relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-300 shrink-0 cursor-pointer disabled:opacity-50
                            ${twoFactorEnabled ? 'bg-emerald-500' : 'bg-white/15 hover:bg-white/20'}
                        `}
                    >
                        <span className="sr-only">Activar 2FA</span>
                        <span
                            className={`
                                inline-block size-6 transform rounded-full bg-white transition-transform duration-300 shadow-md items-center justify-center flex
                                ${twoFactorEnabled ? 'translate-x-7' : 'translate-x-1'}
                            `}
                        >
                            {isLoading ? (
                                <LucideLoader2 size={12} class="animate-spin text-black" />
                            ) : (
                                twoFactorEnabled ? <LucideCheck size={12} class="text-emerald-600" /> : <LucideLock size={12} class="text-zinc-500" />
                            )}
                        </span>
                    </button>
                </div>

                <div className="mt-4 pt-3.5 border-t border-white/5 flex items-center justify-between text-[11px] font-mono uppercase tracking-wider">
                    <span className="text-white/30">Estado</span>
                    <span className={twoFactorEnabled ? "text-emerald-300 font-bold" : "text-amber-300 font-bold"}>
                        {twoFactorEnabled ? "● Protegido" : "● Expuesto"}
                    </span>
                </div>
            </div>

            {/* Métodos de acceso */}
            <div className="grid sm:grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-4 flex items-center gap-3">
                    <span className="size-10 rounded-xl bg-[#9146FF]/15 border border-[#9146FF]/25 flex items-center justify-center shrink-0">
                        <LucideKey size={17} className="text-violet-300" />
                    </span>
                    <div className="min-w-0">
                        <p className="text-[13px] font-bold text-white">Login con Twitch</p>
                        <p className="text-xs text-emerald-300/90 flex items-center gap-1 mt-0.5"><LucideCheck size={12} /> Activo y verificado</p>
                    </div>
                </div>
                <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-4 flex items-center gap-3">
                    <span className="size-10 rounded-xl bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center shrink-0">
                        <LucideSmartphone size={17} className="text-cyan-200" />
                    </span>
                    <div className="min-w-0">
                        <p className="text-[13px] font-bold text-white">App autenticadora</p>
                        <p className={`text-xs mt-0.5 ${twoFactorEnabled ? "text-emerald-300/90" : "text-white/35"}`}>
                            {twoFactorEnabled ? "Vinculada correctamente" : "Sin configurar"}
                        </p>
                    </div>
                </div>
            </div>

            {/* Tips */}
            <div className="rounded-2xl border border-white/[0.07] bg-black/30 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/35 mb-2.5 flex items-center gap-1.5">
                    <LucideShieldAlert size={12} /> Buenas prácticas
                </p>
                <ul className="space-y-2 text-xs text-white/50 leading-relaxed">
                    <li className="flex gap-2"><LucideCheck size={13} className="text-emerald-400 shrink-0 mt-0.5" /> Nunca compartas tu código 2FA ni tu email de acceso.</li>
                    <li className="flex gap-2"><LucideCheck size={13} className="text-emerald-400 shrink-0 mt-0.5" /> Si perdés tu teléfono, contactanos desde Discord para recuperar tu cuenta.</li>
                </ul>
            </div>
        </div>
    )
}
