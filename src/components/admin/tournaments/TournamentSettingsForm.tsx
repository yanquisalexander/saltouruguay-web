import { useState } from 'preact/hooks';
import { actions } from 'astro:actions';
import { toast } from 'sonner';
import { LucideSave, LucideTrash2, LucideAlertTriangle, LucideUpload, LucideImage, LucideX } from 'lucide-preact';
import type { Tournament } from '@/db/schema';

interface Props {
    tournament: Tournament;
}

export default function TournamentSettingsForm({ tournament }: Props) {
    const [loading, setLoading] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(tournament.bannerUrl || null);
    const [formData, setFormData] = useState({
        name: tournament.name,
        description: tournament.description || '',
        startDate: tournament.startDate ? new Date(tournament.startDate).toISOString().slice(0, 16) : '',
        status: tournament.status
    });

    const handleImageUpload = async (e: Event) => {
        const input = e.target as HTMLInputElement;
        const file = input.files?.[0];

        if (!file) return;

        // Validación básica
        if (!file.type.startsWith('image/')) {
            toast.error('Solo se permiten imágenes');
            return;
        }

        if (file.size > 15 * 1024 * 1024) {
            toast.error('La imagen es demasiado grande (máx. 15MB)');
            return;
        }

        setUploadingImage(true);

        try {
            // Preview local
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result as string);
            };
            reader.readAsDataURL(file);

            // Upload to server
            const { data, error } = await actions.tournaments.uploadCover({
                tournamentId: tournament.id,
                image: file
            });

            if (error) {
                toast.error(error.message);
                setPreviewUrl(tournament.bannerUrl || null);
                return;
            }

            toast.success('Imagen subida correctamente');
            setPreviewUrl(data.url);
        } catch (err: any) {
            toast.error(err.message || 'Error al subir la imagen');
            setPreviewUrl(tournament.bannerUrl || null);
        } finally {
            setUploadingImage(false);
        }
    };

    const handleRemoveImage = () => {
        setPreviewUrl(null);
        // Aquí podrías agregar lógica para eliminar del servidor si lo deseas
    };

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
                {/* Cover Image Section */}
                <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                        <LucideImage className="w-4 h-4" />
                        Imagen de Portada
                    </label>
                    <div className="relative">
                        {previewUrl ? (
                            <div className="relative group rounded-xl overflow-hidden border-2 border-white/10">
                                <img
                                    src={previewUrl}
                                    alt="Cover"
                                    className="w-full h-64 object-cover"
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                    <label className="cursor-pointer px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2">
                                        <LucideUpload className="w-4 h-4" />
                                        Cambiar
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleImageUpload}
                                            disabled={uploadingImage}
                                        />
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleRemoveImage}
                                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                                    >
                                        <LucideX className="w-4 h-4" />
                                        Quitar
                                    </button>
                                </div>
                                {uploadingImage && (
                                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                                        <div className="text-white font-medium">Subiendo imagen...</div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-white/10 rounded-xl cursor-pointer bg-black/20 hover:bg-black/30 transition-colors">
                                <LucideUpload className="w-12 h-12 text-gray-500 mb-3" />
                                <p className="text-gray-400 font-medium mb-1">Click para subir imagen</p>
                                <p className="text-xs text-gray-600">PNG, JPG, WebP o GIF (máx. 15MB)</p>
                                <p className="text-xs text-gray-600 mt-1">Dimensiones recomendadas: 1920x1080</p>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleImageUpload}
                                    disabled={uploadingImage}
                                />
                            </label>
                        )}
                    </div>
                    <p className="text-xs text-gray-500">
                        La imagen se convertirá automáticamente a WebP y se redimensionará a máximo 1920x1080 manteniendo la proporción.
                    </p>
                </div>

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
