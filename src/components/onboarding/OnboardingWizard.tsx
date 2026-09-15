import { useState, useEffect } from "preact/hooks";
import { getSessionClient } from "@/lib/auth-client";
import type { Session } from "@auth/core/types";
import { actions } from "astro:actions";
import {
    LucideLoader2,
    LucideCheckCircle2,
    LucideArrowRight,
    LucideArrowLeft,
    LucidePartyPopper,
    LucideSkipForward,
} from "lucide-preact";

type Step = "welcome" | "discord" | "complete";

const STEPS: Step[] = ["welcome", "discord", "complete"];

function getStepFromURL(): number {
    const params = new URLSearchParams(window.location.search);
    const step = params.get("step") as Step | null;
    if (step) {
        const idx = STEPS.indexOf(step);
        if (idx !== -1) return idx;
    }
    return 0;
}

function setStepURL(step: Step) {
    const url = new URL(window.location.href);
    url.searchParams.set("step", step);
    history.replaceState(null, "", url.toString());
}

const DiscordIcon = (props: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.947 2.418-2.157 2.418z" />
    </svg>
);

export default function OnboardingWizard() {
    const [stepIdx, setStepIdx] = useState(0);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [completing, setCompleting] = useState(false);

    const currentStep = STEPS[stepIdx];
    const isLast = stepIdx === STEPS.length - 1;
    const discordLinked = !!session?.user?.linkedAccounts?.discord;

    // Sync step from URL on client
    useEffect(() => {
        setStepIdx(getStepFromURL());
    }, []);

    useEffect(() => {
        getSessionClient()
            .then((s) => {
                setSession(s);
                setLoading(false);
            })
            .catch(() => {
                window.location.href = "/";
            });
    }, []);

    // Listen for Discord linked event from popup
    useEffect(() => {
        const handleDiscordLinked = () => {
            getSessionClient().then(setSession);
        };
        window.addEventListener("DiscordLinked", handleDiscordLinked);
        return () => window.removeEventListener("DiscordLinked", handleDiscordLinked);
    }, []);

    const goToStep = (idx: number) => {
        const clamped = Math.max(0, Math.min(idx, STEPS.length - 1));
        setStepIdx(clamped);
        setStepURL(STEPS[clamped]);
    };

    const next = () => {
        if (isLast) {
            complete();
        } else {
            goToStep(stepIdx + 1);
        }
    };

    const prev = () => {
        goToStep(stepIdx - 1);
    };

    const skip = () => {
        complete();
    };

    const complete = async () => {
        setCompleting(true);
        try {
            await actions.onboarding.completeOnboarding();
            window.location.href = "/";
        } catch {
            setCompleting(false);
        }
    };

    const linkDiscord = () => {
        const width = 600;
        const height = 700;
        const left = window.innerWidth / 2 - width / 2;
        const top = window.innerHeight / 2 - height / 2;

        window.open(
            "/auth/discord",
            "Discord Link",
            `toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=${width}, height=${height}, top=${top}, left=${left}`
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-dvh">
                <LucideLoader2 className="animate-spin text-white/30" size={32} />
            </div>
        );
    }

    return (
        <div className="relative flex min-h-dvh w-full flex-col items-center justify-center px-6">
            {/* Background glow */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(145,70,255,0.06)_0%,transparent_60%)]" />

            {/* Card */}
            <div className="relative z-10 w-full max-w-lg">
                {/* Step indicator */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    {STEPS.map((_, i) => (
                        <div
                            key={i}
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                                i === stepIdx
                                    ? "w-8 bg-electric-violet-500"
                                    : i < stepIdx
                                    ? "w-4 bg-electric-violet-500/50"
                                    : "w-4 bg-white/10"
                            }`}
                        />
                    ))}
                </div>

                {/* Step content */}
                <div className="rounded-2xl border border-white/10 bg-[#0a0a0a]/80 backdrop-blur-xl p-8 shadow-2xl shadow-black/40">
                    {currentStep === "welcome" && (
                        <div className="flex flex-col items-center text-center gap-6 animate-in fade-in duration-300">
                            <div className="relative">
                                <div className="absolute -inset-4 rounded-full bg-electric-violet-500/10 blur-2xl" />
                                <img
                                    src="/favicon.svg"
                                    alt="SaltoUruguayServer"
                                    className="relative h-20 w-auto"
                                />
                            </div>

                            <div className="space-y-2">
                                <h1 className="font-anton text-4xl text-white uppercase tracking-wide">
                                    Bienvenido
                                </h1>
                                <p className="font-rubik text-white/50 text-sm leading-relaxed">
                                    Te damos la bienvenida a la comunidad de{" "}
                                    <span className="text-electric-violet-400 font-medium">
                                        SaltoUruguayServer
                                    </span>
                                    . Configuremos tu cuenta en unos simples pasos.
                                </p>
                            </div>

                            <button
                                onClick={next}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-electric-violet-500 hover:bg-electric-violet-600 text-white font-teko text-lg uppercase tracking-wide transition-all duration-200 hover:shadow-[0_0_20px_rgba(145,70,255,0.4)] active:scale-95"
                            >
                                Comenzar
                                <LucideArrowRight size={18} />
                            </button>
                        </div>
                    )}

                    {currentStep === "discord" && (
                        <div className="flex flex-col items-center text-center gap-6 animate-in fade-in duration-300">
                            <div className="p-4 rounded-full bg-[#5865F2]/10 border border-[#5865F2]/20">
                                <DiscordIcon className="size-10 text-[#5865F2]" />
                            </div>

                            <div className="space-y-2">
                                <h1 className="font-anton text-3xl text-white uppercase tracking-wide">
                                    Conecta tu Discord
                                </h1>
                                <p className="font-rubik text-white/50 text-sm leading-relaxed">
                                    Vincula tu cuenta de Discord para acceder a roles exclusivos, eventos y más dentro de la comunidad.
                                </p>
                            </div>

                            {discordLinked ? (
                                <div className="flex flex-col items-center gap-3">
                                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/20">
                                        <LucideCheckCircle2 size={18} className="text-green-400" />
                                        <span className="font-rubik text-sm text-green-300">
                                            Discord vinculado como{" "}
                                            <span className="font-medium text-green-200">
                                                {session?.user?.linkedAccounts?.discord?.username}
                                            </span>
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={linkDiscord}
                                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-teko text-lg uppercase tracking-wide transition-all duration-200 hover:shadow-[0_0_20px_rgba(88,101,242,0.4)] active:scale-95"
                                >
                                    <DiscordIcon className="size-5" />
                                    Vincular Discord
                                </button>
                            )}

                            <div className="flex items-center gap-3 mt-2">
                                <button
                                    onClick={prev}
                                    className="flex items-center gap-1 px-4 py-2 rounded-xl text-white/40 hover:text-white/70 font-rubik text-sm transition-colors"
                                >
                                    <LucideArrowLeft size={14} />
                                    Atrás
                                </button>

                                <button
                                    onClick={next}
                                    className="flex items-center gap-1 px-4 py-2 rounded-xl text-white/40 hover:text-white/70 font-rubik text-sm transition-colors"
                                >
                                    {discordLinked ? "Continuar" : "Omitir por ahora"}
                                    <LucideArrowRight size={14} />
                                </button>
                            </div>
                        </div>
                    )}

                    {currentStep === "complete" && (
                        <div className="flex flex-col items-center text-center gap-6 animate-in fade-in duration-300">
                            <div className="p-4 rounded-full bg-electric-violet-500/10 border border-electric-violet-500/20">
                                <LucidePartyPopper size={32} className="text-electric-violet-400" />
                            </div>

                            <div className="space-y-2">
                                <h1 className="font-anton text-3xl text-white uppercase tracking-wide">
                                    ¡Todo listo!
                                </h1>
                                <p className="font-rubik text-white/50 text-sm leading-relaxed">
                                    Tu cuenta está configurada. Explora la comunidad, participa en eventos y conecta con otros miembros.
                                </p>
                            </div>

                            <div className="flex items-center gap-3 mt-2">
                                <button
                                    onClick={prev}
                                    className="flex items-center gap-1 px-4 py-2 rounded-xl text-white/40 hover:text-white/70 font-rubik text-sm transition-colors"
                                >
                                    <LucideArrowLeft size={14} />
                                    Atrás
                                </button>

                                <button
                                    onClick={complete}
                                    disabled={completing}
                                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-electric-violet-500 hover:bg-electric-violet-600 text-white font-teko text-lg uppercase tracking-wide transition-all duration-200 hover:shadow-[0_0_20px_rgba(145,70,255,0.4)] active:scale-95 disabled:opacity-50"
                                >
                                    {completing ? (
                                        <LucideLoader2 size={18} className="animate-spin" />
                                    ) : (
                                        <>
                                            Entrar
                                            <LucideArrowRight size={18} />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Skip button (always visible, except on last step) */}
                {!isLast && (
                    <div className="flex justify-center mt-4">
                        <button
                            onClick={skip}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-white/20 hover:text-white/50 font-rubik text-xs transition-colors"
                        >
                            <LucideSkipForward size={12} />
                            Saltar onboarding
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
