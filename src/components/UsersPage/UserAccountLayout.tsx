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
            name: "Seguridad",
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
            <div role="tablist" className="flex p-1 bg-white/5 rounded-xl border border-white/5 w-fit">
                {Tabs.map((tab) => {
                    const isActive = activeTab === tab.key;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`
                                flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300
                                ${isActive
                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                                    : "text-white/50 hover:text-white hover:bg-white/5"
                                }
                            `}
                        >
                            <tab.icon size={16} />
                            {tab.name}
                        </button>
                    )
                })}
            </div>

            {/* Content Panel */}
            <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#0a0a0a]/60 backdrop-blur-xl shadow-xl min-h-[400px]">
                {renderTabContent()}
            </div>
        </div>
    )
}