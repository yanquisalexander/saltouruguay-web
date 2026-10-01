import type { Session } from "@auth/core/types";
import { SecuritySection } from "./Security";
import { useState } from "preact/hooks";
import { GeneralInfo } from "./GeneralInfo";
import type { APIUser } from "discord-api-types/v10";
import { LucideUser, LucideShieldCheck } from "lucide-preact";

export const UserAccountLayout = ({ session, discordUser }: { session: Session, discordUser: APIUser | null }) => {
    const discordConnected = !!discordUser;
    const Tabs = [
        {
            name: "Perfil",
            desc: "Datos y conexiones",
            key: "info",
            icon: LucideUser,
            badge: discordConnected ? "2/2" : "1/2",
            component: <GeneralInfo session={session} discordUser={discordUser} />
        },
        {
            name: "Seguridad",
            desc: "2FA y accesos",
            key: "security",
            icon: LucideShieldCheck,
            badge: session.user.twoFactorEnabled ? "ON" : "OFF",
            badgeOn: Boolean(session.user.twoFactorEnabled),
            component: <SecuritySection session={session} />
        }
    ];

    const [activeTab, setActiveTab] = useState(Tabs[0].key);

    const active = Tabs.find(tab => tab.key === activeTab) ?? Tabs[0];

    return (
        <div className="space-y-4">
            {/* Segmented tabs */}
            <div role="tablist" aria-label="Secciones de la cuenta" className="grid grid-cols-2 gap-1.5 p-1.5 rounded-2xl bg-zinc-950/70 backdrop-blur-xl border border-white/10 shadow-xl">
                {Tabs.map((tab) => {
                    const isActive = activeTab === tab.key;
                    return (
                        <button
                            key={tab.key}
                            role="tab"
                            aria-selected={isActive}
                            onClick={() => setActiveTab(tab.key)}
                            className={`
                                relative flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-300 cursor-pointer
                                ${isActive
                                    ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-950/50 border border-violet-300/30"
                                    : "text-white/55 hover:text-white hover:bg-white/5 border border-transparent"
                                }
                            `}
                        >
                            <span className={`size-9 rounded-lg flex items-center justify-center shrink-0 ${isActive ? "bg-white/20" : "bg-white/5 border border-white/10"}`}>
                                <tab.icon size={17} className={isActive ? "text-white" : "text-white/50"} />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wider leading-none">
                                    {tab.name}
                                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${isActive ? "bg-black/30 text-white" : (tab as any).badgeOn ? "bg-emerald-500/15 text-emerald-300" : "bg-white/10 text-white/50"}`}>
                                        {(tab as any).badge}
                                    </span>
                                </span>
                                <span className={`block text-xs mt-1 truncate ${isActive ? "text-white/75" : "text-white/35"}`}>{tab.desc}</span>
                            </span>
                        </button>
                    )
                })}
            </div>

            {/* Content Panel */}
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/70 backdrop-blur-2xl shadow-2xl min-h-[420px]">
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-violet-400/40 to-transparent pointer-events-none" />
                <div key={active.key} className="animate-fade-in">
                    {active.component}
                </div>
            </div>
        </div>
    )
}