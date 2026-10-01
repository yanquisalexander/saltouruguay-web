import type { Session } from "@auth/core/types";
import { SecuritySection } from "./Security";
import { useState } from "preact/hooks";
import { GeneralInfo } from "./GeneralInfo";
import type { APIUser } from "discord-api-types/v10";
import { LucideUser, LucideShieldCheck } from "lucide-preact";

export const UserAccountLayout = ({ session, discordUser }: { session: Session, discordUser: APIUser | null }) => {
    const Tabs = [
        {
            name: "Perfil General",
            key: "info",
            icon: LucideUser,
            component: <GeneralInfo session={session} discordUser={discordUser} />
        },
        {
            name: "Seguridad & Acceso",
            key: "security",
            icon: LucideShieldCheck,
            component: <SecuritySection session={session} />
        }
    ];

    const [activeTab, setActiveTab] = useState(Tabs[0].key);

    const renderTabContent = () => {
        const activeTabContent = Tabs.find(tab => tab.key === activeTab);
        return activeTabContent ? activeTabContent.component : null;
    }

    return (
        <div className="space-y-6">
            {/* Tab Navigation */}
            <div role="tablist" className="flex p-1.5 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 w-full sm:w-fit shadow-lg">
                {Tabs.map((tab) => {
                    const isActive = activeTab === tab.key;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`
                                flex-1 sm:flex-initial flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl text-sm font-bold tracking-wide uppercase transition-all duration-300
                                ${isActive
                                    ? "bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white shadow-lg shadow-purple-900/30 border border-purple-400/40"
                                    : "text-white/60 hover:text-white hover:bg-white/5 border border-transparent"
                                }
                            `}
                        >
                            <tab.icon size={18} className={isActive ? "text-white" : "text-white/50"} />
                            <span>{tab.name}</span>
                        </button>
                    )
                })}
            </div>

            {/* Content Panel */}
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0d]/80 backdrop-blur-2xl shadow-2xl min-h-[420px]">
                {renderTabContent()}
            </div>
        </div>
    )
}