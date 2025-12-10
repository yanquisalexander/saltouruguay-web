import { useState } from 'preact/hooks';
import { actions } from 'astro:actions';
import { toast } from 'sonner';
import { LucideTrophy, LucideUsers, LucideCalendar, LucidePlus } from 'lucide-preact';

export default function CreateTournamentModal({ onClose, onCreated }: { onClose: () => void, onCreated: () => void }) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        format: 'single_elimination',
        maxParticipants: 16,
        privacy: 'public',
    });

    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data, error } = await actions.tournaments.create(formData);
            if (error) {
                toast.error(error.message);
                return;
            }
            toast.success('Torneo creado exitosamente');
            onCreated();
            onClose();
        } catch (err) {
            toast.error('Error inesperado');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#1a1b1e] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <LucideTrophy className="text-yellow-500" /> Crear Torneo
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Nombre del Torneo</label>
                        <input
                            type="text"
                            required
                            className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-violet-500 outline-none"
                            value={formData.name}
                            onInput={(e: any) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Formato</label>
                        <select
                            className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-violet-500 outline-none"
                            value={formData.format}
                            onChange={(e: any) => setFormData({ ...formData, format: e.target.value })}
                        >
                            <option value="single_elimination">Eliminación Simple</option>
                            <option value="double_elimination">Doble Eliminación</option>
                            <option value="round_robin">Round Robin (Liga)</option>
                            <option value="groups">Fase de Grupos + Bracket</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Participantes Máx.</label>
                            <input
                                type="number"
                                min="2"
                                max="128"
                                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-violet-500 outline-none"
                                value={formData.maxParticipants}
                                onInput={(e: any) => setFormData({ ...formData, maxParticipants: parseInt(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Privacidad</label>
                            <select
                                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-violet-500 outline-none"
                                value={formData.privacy}
                                onChange={(e: any) => setFormData({ ...formData, privacy: e.target.value })}
                            >
                                <option value="public">Público</option>
                                <option value="private">Privado</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Descripción</label>
                        <textarea
                            className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-violet-500 outline-none h-24 resize-none"
                            value={formData.description}
                            onInput={(e: any) => setFormData({ ...formData, description: e.target.value })}
                        ></textarea>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-gray-300 hover:bg-white/5 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold shadow-lg shadow-violet-900/20 disabled:opacity-50 flex items-center gap-2"
                        >
                            {loading ? 'Creando...' : 'Crear Torneo'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
