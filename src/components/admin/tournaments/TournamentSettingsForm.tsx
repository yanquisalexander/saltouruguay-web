import { useState } from 'preact/hooks';
import { actions } from 'astro:actions';
import { toast } from 'sonner';
import { LucideSave, LucideTrash2, LucideAlertTriangle, LucideUpload, LucideImage, LucideX, LucideUsers, LucideShield, LucideLock, LucideStar } from 'lucide-preact';
import type { Tournament } from "@/types/tournaments";

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
        status: tournament.status,
        maxParticipants: tournament.maxParticipants?.toString() || '',
    });

    const [teamConfig, setTeamConfig] = useState({
        teamsEnabled: (tournament.config as any)?.teamsEnabled ?? false,
        playersPerTeam: (tournament.config as any)?.playersPerTeam ?? 2,
        teamNamePrefix: (tournament.config as any)?.teamNamePrefix ?? 'Equipo',
        maxTeams: (tournament.config as any)?.maxTeams ?? '',
    });

    const [participantsVisible, setParticipantsVisible] = useState<boolean>((tournament.config as any)?.showParticipants ?? true);

    // Nuevo: Destacado + Challonge externo (usar columna DB, con fallback a config para compatibilidad)
    const [isFeatured, setIsFeatured] = useState<boolean>(
        tournament.featured !== undefined ? tournament.featured : (tournament.config as any)?.featured ?? false,
    );
    const [externalChallongeId, setExternalChallongeId] = useState<string>(
        tournament.externalChallongeBracketId ?? (tournament.config as any)?.externalChallongeBracketId ?? ''
    );

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
            const formData = new FormData();
            formData.append('tournamentId', tournament.id.toString());
            formData.append('image', file);

            const { data, error } = await actions.tournaments.uploadCover(formData);

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
        console.log('Submitting form with data:', {
            ...formData,
            teamConfig,
        });
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await actions.tournaments.update({
                tournamentId: tournament.id,
                name: formData.name,
                description: formData.description,
                startDate: formData.startDate ? new Date(formData.startDate) : undefined,
                status: formData.status as any,
                maxParticipants: formData.maxParticipants ? parseInt(formData.maxParticipants) : null,
                // Persistir también en columnas top-level (compatibilidad y búsqueda)
                featured: isFeatured,
                externalChallongeBracketId: externalChallongeId?.trim() || null,
                config: {
                    teamsEnabled: teamConfig.teamsEnabled,
                    playersPerTeam: teamConfig.playersPerTeam,
                    teamNamePrefix: teamConfig.teamNamePrefix || 'Equipo',
                    maxTeams: teamConfig.maxTeams ? parseInt(teamConfig.maxTeams as string) : undefined,
                    showParticipants: participantsVisible,
                    // Legacy / fallback
                    featured: isFeatured,
                    externalChallongeBracketId: externalChallongeId?.trim() || undefined,
                } as any,
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                            <LucideUsers className="w-4 h-4" />
                            Límite de Participantes
                        </label>
                        <input
                            type="number"
                            min={2}
                            max={1024}
                            placeholder="Sin límite"
                            className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none"
                            value={formData.maxParticipants}
                            onInput={(e: any) => setFormData(prev => ({ ...prev, maxParticipants: e.target.value }))}
                        />
                        <p className="text-xs text-gray-500">Dejar vacío para no tener límite de inscriptos.</p>
                    </div>
                </div>

                {/* Participant visibility */}
                <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                        <LucideLock className="w-4 h-4" />
                        Mostrar lista de participantes públicamente
                    </label>
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500">Si desactivas esto, los visitantes no verán los nombres de los jugadores (aparecerán placeholders). Los administradores siempre verán la lista completa.</p>
                        <button
                            type="button"
                            onClick={() => setParticipantsVisible(prev => !prev)}
                            className={`relative flex-shrink-0 w-12 h-6 rounded-full transition-colors duration-200 ${participantsVisible ? 'bg-green-600' : 'bg-white/10'}`}>
                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${participantsVisible ? 'translate-x-6' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Nuevo: Destacado + Challonge externo */}
                <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                        <LucideStar className="w-4 h-4 text-yellow-400" />
                        Destacado
                    </label>
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500">Marcar como destacado hará que el torneo ocupe más espacio en el listado y tenga mayor visibilidad.</p>
                        <button
                            type="button"
                            onClick={() => setIsFeatured(prev => !prev)}
                            className={`relative flex-shrink-0 w-12 h-6 rounded-full transition-colors duration-200 ${isFeatured ? 'bg-yellow-400' : 'bg-white/10'}`}>
                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${isFeatured ? 'translate-x-6' : ''}`} />
                        </button>
                    </div>

                    <div className="mt-4">
                        <label className="text-sm font-medium text-gray-300">External Challonge Bracket ID</label>
                        <input
                            type="text"
                            placeholder="Ej: torneorocketleague2026"
                            className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-yellow-400 outline-none"
                            value={externalChallongeId}
                            onInput={(e: any) => setExternalChallongeId(e.target.value)}
                            onKeyDown={(e: KeyboardEvent) => { if ((e as any).key === 'Enter') e.preventDefault(); }}
                        />
                        <p className="text-xs text-gray-500">Si rellenas esto se mostrará un iframe embebido de Challonge en la página del torneo.</p>
                    </div>
                </div>

                {/* Teams Configuration */}
                <div className="space-y-4 p-5 bg-white/[0.03] border border-white/10 rounded-xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                                <LucideShield className="w-4 h-4 text-violet-400" />
                                Modo Equipos
                            </label>
                            <p className="text-xs text-gray-500 mt-1">Los jugadores compiten agrupados en equipos.</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setTeamConfig(prev => ({ ...prev, teamsEnabled: !prev.teamsEnabled }))}
                            className={`relative flex-shrink-0 w-12 h-6 rounded-full transition-colors duration-200 ${teamConfig.teamsEnabled ? 'bg-violet-600' : 'bg-white/10'
                                }`}
                        >
                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${teamConfig.teamsEnabled ? 'translate-x-6' : ''
                                }`} />
                        </button>
                    </div>

                    {teamConfig.teamsEnabled && (
                        <div className="pt-4 border-t border-white/10 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-300">Jugadores por Equipo</label>
                                    <input
                                        type="number"
                                        min={2}
                                        max={50}
                                        className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-violet-500 outline-none"
                                        value={teamConfig.playersPerTeam}
                                        onInput={(e: any) => setTeamConfig(prev => ({ ...prev, playersPerTeam: parseInt(e.target.value) || 2 }))}
                                    />
                                    <p className="text-xs text-gray-500">Mín. 2, Máx. 50</p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-300">Prefijo de Nombre de Equipo</label>
                                    <input
                                        type="text"
                                        maxLength={30}
                                        placeholder="Ej: Equipo, Team, Clan..."
                                        className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-violet-500 outline-none"
                                        value={teamConfig.teamNamePrefix}
                                        onInput={(e: any) => setTeamConfig(prev => ({ ...prev, teamNamePrefix: e.target.value }))}
                                    />
                                    <p className="text-xs text-gray-500">Ej: "Equipo A", "Equipo B"...</p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-300">Máx. de Equipos</label>
                                    <input
                                        type="number"
                                        min={2}
                                        max={256}
                                        placeholder="Sin límite"
                                        className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-violet-500 outline-none"
                                        value={teamConfig.maxTeams}
                                        onInput={(e: any) => setTeamConfig(prev => ({ ...prev, maxTeams: e.target.value }))}
                                    />
                                    <p className="text-xs text-gray-500">Dejar vacío para sin límite.</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 p-3 bg-violet-500/5 border border-violet-500/20 rounded-lg">
                                <LucideShield className="w-4 h-4 text-violet-400 mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-violet-300">
                                    <strong>Modo Equipos activo:</strong> Cada slot del bracket representará un equipo en lugar de un jugador individual.
                                    Se requieren <strong>{teamConfig.playersPerTeam} jugadores</strong> por equipo.
                                    {formData.maxParticipants && (
                                        <> El torneo tendrá un máximo de <strong>{Math.floor(parseInt(formData.maxParticipants) / teamConfig.playersPerTeam)} equipos</strong> ({formData.maxParticipants} jugadores).</>
                                    )}
                                </p>
                            </div>
                        </div>
                    )}
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
