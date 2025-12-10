import { useState } from "preact/hooks";
import { LucidePlus, LucideTrophy } from "lucide-preact";
import CreateTournamentModal from "./CreateTournamentModal";

export default function TournamentAdminControls() {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                className="group relative flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:shadow-[0_0_30px_rgba(124,58,237,0.5)] hover:-translate-y-1"
            >
                <LucidePlus size={20} />
                <span>Crear Torneo</span>
            </button>

            {isModalOpen && (
                <CreateTournamentModal
                    onClose={() => setIsModalOpen(false)}
                    onCreated={() => window.location.reload()}
                />
            )}
        </>
    );
}