import type { Session } from "@auth/core/types";
import { SecuritySection } from "./Security";
import { useState } from "preact/hooks";
import { GeneralInfo } from "./GeneralInfo";
import type { APIUser } from "discord-api-types/v10";


export const UserAccountLayout = ({ session, discordUser }: { session: Session, discordUser: APIUser | null }) => {
    const Tabs = [
        {
            name: "Información",
            key: "info",
            component: <GeneralInfo session={session} discordUser={discordUser} />
        },
        {
            name: "Seguridad",
            key: "security",
            component: <SecuritySection session={session} />
        }
    ]

    const [activeTab, setActiveTab] = useState(Tabs[0].key);

    const handleTabClick = (key: string) => {
        setActiveTab(key);
    }

    const renderTabContent = () => {
        const activeTabContent = Tabs.find(tab => tab.key === activeTab);
        return activeTabContent ? activeTabContent.component : null;
    }

    return (
        <div class="space-y-6">
            <div role="tablist"
                class="h-10 items-center justify-center rounded-md bg-neutral-500/10 p-1 text-neutral-500 grid w-full grid-cols-2 md:w-[400px]">
                {Tabs.map((tab) => (
                    <button
                        key={tab.key}
                        class={`${activeTab === tab.key
                            ? "bg-neutral-500 text-white"
                            : "text-neutral-500 hover:bg-neutral-500/10"
                            } flex h-8 items-center justify-center rounded-md px-4 text-sm font-medium transition-all duration-200`}
                        onClick={() => handleTabClick(tab.key)}
                        type="button"
                        role="tab"
                        aria-selected="false"
                    >
                        {tab.name}
                    </button>
                ))}
            </div>

            <div class="rounded-lg px-2 md:p-4 bg-[#0b1422] border border-line">
                {renderTabContent()}
            </div>
        </div>
    )
}