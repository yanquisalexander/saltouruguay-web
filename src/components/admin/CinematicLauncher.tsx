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
        <div className="p-4 border rounded-md shadow-md">
            <h2 className="text-lg font-semibold mb-4">Lanzador de Cinemáticas</h2>

            <div className="mb-4">
                <label htmlFor="cinematic-url" className="block text-sm font-medium mb-2">
                    URL de la Cinemática:
                </label>
                <input
                    id="cinematic-url"
                    type="text"
                    className="w-full bg-black p-2 border rounded-md"
                    value={cinematicUrl || ""}
                    onInput={(e) => setCinematicUrl((e.target as HTMLInputElement).value)}
                />
            </div>

            <div className="mb-4">
                <label htmlFor="target-users" className="block text-sm font-medium mb-2">
                    Usuarios Objetivo (separados por comas):
                </label>
                <input
                    id="target-users"
                    type="text"
                    className="w-full bg-black p-2 border rounded-md"
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
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
                Lanzar Cinemática
            </button>
        </div>
    );
};
