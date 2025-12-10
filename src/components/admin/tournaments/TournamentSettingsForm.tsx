import { useState } from 'preact/hooks';
import { actions } from 'astro:actions';
import { toast } from 'sonner';
import { LucideSave, LucideTrash2, LucideAlertTriangle } from 'lucide-preact';
import type { Tournament } from '@/db/schema';

interface Props {
    tournament: Tournament;
}

export default function TournamentSettingsForm({ tournament }: Props) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: tournament.name,
        description: tournament.description || '',
        startDate: tournament.startDate ? new Date(tournament.startDate).toISOString().slice(0, 16) : '',
        status: tournament.status
    });

    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await actions.tournaments.update({
                tournamentId: tournament.id,
                name: formData.name,
                description: formData.description,
                startDate: formData.startDate ? new Date(formData.startDate) : undefined,
                status: formData.status as any
            });

            if (error) {
                toast.error(error.message);
                return;
            }

            toast.success('Torneo actualizado correctamente');
            // Recargar para ver cambios
            window.location.reload();
        } catch (err) {
            toast.error('Error al actualizar el torneo');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('¿ESTÁS SEGURO? Esta acción no se puede deshacer y eliminará todos los partidos y participantes.')) return;

        try {
            const { error } = await actions.tournaments.delete({ tournamentId: tournament.id });

            if (error) {
                toast.error(error.message);
                return;
            }

            toast.success('Torneo eliminado');
            window.location.href = '/admin/torneos';
        } catch (err) {
            toast.error('Error al eliminar el torneo');
        }
    };

    return (
        <div className="space-y-8">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Nombre del Torneo</label>
                        <input
                            type="text"
                            required
                            className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none"
                            value={formData.name}
                            onInput={(e: any) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Fecha de Inicio</label>
                        <input
                            type="datetime-local"
                            className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none [color-scheme:dark]"
                            value={formData.startDate}
                            onInput={(e: any) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Descripción</label>
                    <textarea
                        rows={4}
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none resize-none"
                        value={formData.description}
                        onInput={(e: any) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Estado</label>
                    <select
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none"
                        value={formData.status}
                        onChange={(e: any) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    >
                        <option value="draft">Borrador (Oculto)</option>
                        <option value="registration">Inscripciones Abiertas</option>
                        <option value="in_progress">En Progreso</option>
                        <option value="completed">Finalizado</option>
                    </select>
                    <p className="text-xs text-gray-500">
                        * "Borrador" oculta el torneo del público. "Inscripciones Abiertas" permite que la gente se una.
                    </p>
                </div>

                <div className="pt-4 border-t border-white/5 flex justify-end">
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                        <LucideSave className="w-4 h-4" />
                        {loading ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </form>

            <div className="pt-8 border-t border-white/10">
                <h3 className="text-red-400 font-medium mb-4 flex items-center gap-2">
                    <LucideAlertTriangle className="w-5 h-5" />
                    Zona de Peligro
                </h3>
                <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-4 flex items-center justify-between">
                    <div>
                        <div className="text-white font-medium">Eliminar Torneo</div>
                        <div className="text-gray-500 text-sm">Esta acción eliminará permanentemente el torneo y todos sus datos asociados.</div>
                    </div>
                    <button
                        onClick={handleDelete}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 rounded-lg transition-colors"
                    >
                        <LucideTrash2 className="w-4 h-4" />
                        Eliminar
                    </button>
                </div>
            </div>
        </div>
    );
}
