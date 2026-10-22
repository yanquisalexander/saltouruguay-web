import { actions } from "astro:actions";
import { useState } from "preact/hooks";
import { toast } from "sonner";

export const CinematicLauncher = () => {
    const [cinematicUrl, setCinematicUrl] = useState<string | null>(null);
    const [targetUsers, setTargetUsers] = useState<number[]>([]);

    const handleLaunch = async () => {
        if (!cinematicUrl) {
            alert("Por favor, ingresa una URL para la cinemática.");
            return;
        }

        try {
            const { data, error } = await actions.admin.launchCinematic({
                url: cinematicUrl,
                targetUsers,
            });

            if (error) {
                console.error("Error lanzando la cinemática:", error);
                toast.error("Ocurrió un error inesperado. Por favor, inténtalo nuevamente.");
                return;
            }



            toast("Cinemática lanzada con éxito!");
            setCinematicUrl(null);
            setTargetUsers([]);
        } catch (error) {
            console.error("Error lanzando la cinemática:", error);
            toast.error("Ocurrió un error inesperado. Por favor, inténtalo nuevamente.");
        }
    };

    return (
        <div className="p-4 border border-white/[0.08] rounded-2xl bg-[#0f0f16]">
            <h2 className="text-lg font-anton uppercase mb-4">Lanzador de Cinemáticas</h2>

            <div className="mb-4">
                <label htmlFor="cinematic-url" className="block text-xs font-rubik text-white/60 mb-2">
                    URL de la Cinemática:
                </label>
                <input
                    id="cinematic-url"
                    type="text"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                    value={cinematicUrl || ""}
                    onInput={(e) => setCinematicUrl((e.target as HTMLInputElement).value)}
                />
            </div>

            <div className="mb-4">
                <label htmlFor="target-users" className="block text-xs font-rubik text-white/60 mb-2">
                    Usuarios Objetivo (separados por comas):
                </label>
                <input
                    id="target-users"
                    type="text"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                    value={targetUsers.join(", ")}
                    onInput={(e) =>
                        setTargetUsers(
                            (e.target as HTMLInputElement).value.split(",").map((user) => parseInt(user.trim(), 10)).filter((user) => !isNaN(user))
                        )
                    }
                />
            </div>

            <button
                onClick={handleLaunch}
                className="px-4 py-2 bg-violet-600 text-white rounded-xl hover:bg-violet-500 transition"
            >
                Lanzar Cinemática
            </button>
        </div>
    );
};
