import { actions } from "astro:actions";
import { useEffect, useState } from "preact/hooks";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/useDebounce";
import {
    LucideBell,
    LucideEye,
    LucideImage,
    LucideLink,
    LucideLoader2,
    LucideSearch,
    LucideSend,
    LucideUsers,
    LucideX,
    LucideSparkles,
    LucideInfo,
    LucideCheckCircle2,
    LucideAlertTriangle,
    LucideAlertCircle,
    LucideMegaphone
} from "lucide-preact";

type NotificationType = "info" | "success" | "warning" | "error" | "announcement";

type UserOption = {
    id: number;
    displayName: string;
    username: string;
    avatar: string | null;
    email: string;
};

const TYPE_OPTIONS: {
    value: NotificationType;
    label: string;
    icon: typeof LucideInfo;
    chip: string;
}[] = [
    { value: "info", label: "Información", icon: LucideInfo, chip: "bg-sky-500/15 text-sky-300 border-sky-400/30" },
    { value: "announcement", label: "Anuncio", icon: LucideMegaphone, chip: "bg-violet-500/15 text-violet-300 border-violet-400/30" },
    { value: "success", label: "Éxito", icon: LucideCheckCircle2, chip: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30" },
    { value: "warning", label: "Advertencia", icon: LucideAlertTriangle, chip: "bg-amber-500/15 text-amber-300 border-amber-400/30" },
    { value: "error", label: "Urgente", icon: LucideAlertCircle, chip: "bg-rose-500/15 text-rose-300 border-rose-400/30" },
];

const inputClasses =
    "w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 transition-all font-rubik";

export default function NotificationsManager() {
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [type, setType] = useState<NotificationType>("announcement");
    const [link, setLink] = useState("");
    const [image, setImage] = useState("");
    const [audience, setAudience] = useState<"all" | "selected">("all");
    const [selectedUsers, setSelectedUsers] = useState<UserOption[]>([]);
    const [search, setSearch] = useState("");
    const [results, setResults] = useState<UserOption[]>([]);
    const [searching, setSearching] = useState(false);
    const [totalUsers, setTotalUsers] = useState<number | null>(null);
    const [sending, setSending] = useState(false);
    const debouncedSearch = useDebounce(search, 400);

    useEffect(() => {
        actions.admin.notifications.getAudienceCount().then(({ data, error }) => {
            if (error) return;
            setTotalUsers(data.total);
        });
    }, []);

    useEffect(() => {
        if (!debouncedSearch.trim()) {
            setResults([]);
            setSearching(false);
            return;
        }

        let cancelled = false;
        setSearching(true);

        actions.admin.serverTools.getUsers({ page: 1, limit: 8, search: debouncedSearch }).then(({ data, error }) => {
            if (cancelled) return;
            setSearching(false);
            if (error) {
                toast.error("No se pudieron buscar usuarios");
                return;
            }
            setResults(
                (data?.users ?? []).map((user) => ({
                    id: user.id,
                    displayName: user.displayName,
                    username: user.username,
                    avatar: user.avatar,
                    email: user.email,
                }))
            );
        });

        return () => {
            cancelled = true;
        };
    }, [debouncedSearch]);

    const addUser = (user: UserOption) => {
        setSelectedUsers((prev) => (prev.some((item) => item.id === user.id) ? prev : [...prev, user]));
        setSearch("");
        setResults([]);
    };

    const removeUser = (userId: number) => {
        setSelectedUsers((prev) => prev.filter((user) => user.id !== userId));
    };

    const reset = () => {
        setTitle("");
        setMessage("");
        setType("announcement");
        setLink("");
        setImage("");
        setAudience("all");
        setSelectedUsers([]);
        setSearch("");
        setResults([]);
    };

    const handleSubmit = async (event: Event) => {
        event.preventDefault();

        if (!title.trim() || !message.trim()) {
            toast.error("El título y el mensaje son obligatorios");
            return;
        }

        if (audience === "selected" && selectedUsers.length === 0) {
            toast.error("Selecciona al menos un destinatario");
            return;
        }

        if (audience === "all" && totalUsers !== null) {
            const confirmed = confirm(`¿Enviar esta notificación masiva a ${totalUsers} usuarios?`);
            if (!confirmed) return;
        }

        setSending(true);

        const { data, error } = await actions.admin.notifications.send({
            title: title.trim(),
            message: message.trim(),
            type,
            link: link.trim() || undefined,
            image: image.trim() || undefined,
            target: audience,
            userIds: audience === "selected" ? selectedUsers.map((user) => user.id) : undefined,
        });

        setSending(false);

        if (error) {
            toast.error(error.message || "No se pudo enviar la notificación");
            return;
        }

        toast.success(`Notificación enviada a ${data.count} usuario${data.count === 1 ? "" : "s"}`);
        reset();
    };

    const currentType = TYPE_OPTIONS.find((option) => option.value === type) ?? TYPE_OPTIONS[0];

    return (
        <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
            {/* Formulario de Notificación */}
            <form
                onSubmit={handleSubmit}
                className="relative overflow-hidden rounded-2xl bg-[#0f0f16]/90 border border-white/[0.08] p-5 sm:p-6 shadow-xl space-y-5"
            >
                {/* Hairline superior */}
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-violet-400/30 to-transparent pointer-events-none"></div>

                <div className="flex items-center gap-3 border-b border-white/[0.08] pb-4">
                    <div className="rounded-xl bg-violet-500/15 p-2.5 text-violet-300 border border-violet-400/25">
                        <LucideBell size={18} />
                    </div>
                    <div>
                        <h2 className="font-anton text-lg uppercase tracking-wide text-white leading-none">
                            Componer Anuncio
                        </h2>
                        <p className="font-rubik text-xs text-white/40 mt-1">
                            Se enviará al centro de alertas y mediante Web Push / Expo Push.
                        </p>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2 space-y-1">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-rubik font-medium text-white/60">
                                Título del anuncio
                            </label>
                            <span className="font-mono text-[10px] text-white/30">{title.length}/120</span>
                        </div>
                        <input
                            type="text"
                            value={title}
                            maxLength={120}
                            onInput={(event) => setTitle((event.target as HTMLInputElement).value)}
                            placeholder="Ej: ¡Comenzó el Torneo de Bedwars!"
                            className={inputClasses}
                        />
                    </div>

                    <div className="sm:col-span-2 space-y-1">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-rubik font-medium text-white/60">
                                Mensaje o cuerpo
                            </label>
                            <span className="font-mono text-[10px] text-white/30">{message.length}/500</span>
                        </div>
                        <textarea
                            value={message}
                            maxLength={500}
                            rows={3}
                            onInput={(event) => setMessage((event.target as HTMLTextAreaElement).value)}
                            placeholder="Describe el contenido de forma clara y directa..."
                            className={`${inputClasses} resize-y`}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-rubik font-medium text-white/60">
                            Tipo de notificación
                        </label>
                        <select
                            value={type}
                            onChange={(event) => setType((event.target as HTMLSelectElement).value as NotificationType)}
                            className={`${inputClasses} cursor-pointer`}
                        >
                            {TYPE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value} className="bg-[#0f0f16]">
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-rubik font-medium text-white/60">
                            Enlace de destino (opcional)
                        </label>
                        <div className="relative">
                            <LucideLink size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                            <input
                                type="text"
                                value={link}
                                onInput={(event) => setLink((event.target as HTMLInputElement).value)}
                                placeholder="/torneos o https://..."
                                className={`${inputClasses} pl-9`}
                            />
                        </div>
                    </div>

                    <div className="sm:col-span-2 space-y-1">
                        <label className="text-xs font-rubik font-medium text-white/60">
                            URL de imagen o portada (opcional)
                        </label>
                        <div className="relative">
                            <LucideImage size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                            <input
                                type="text"
                                value={image}
                                onInput={(event) => setImage((event.target as HTMLInputElement).value)}
                                placeholder="https://cdn.saltouruguayserver.com/..."
                                className={`${inputClasses} pl-9`}
                            />
                        </div>
                    </div>
                </div>

                {/* Audiencia / Destinatarios */}
                <div className="space-y-3 border-t border-white/[0.08] pt-4">
                    <label className="block text-xs font-rubik font-medium text-white/60">
                        Audiencia destinataria
                    </label>

                    <div className="grid gap-2.5 sm:grid-cols-2">
                        <button
                            type="button"
                            onClick={() => setAudience("all")}
                            className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all cursor-pointer ${
                                audience === "all"
                                    ? "border-violet-500/40 bg-violet-600/15 shadow-sm shadow-violet-950/40"
                                    : "border-white/[0.08] bg-black/30 hover:bg-white/[0.04]"
                            }`}
                        >
                            <span className="p-2 rounded-lg bg-violet-500/20 text-violet-300">
                                <LucideUsers size={16} />
                            </span>
                            <div className="min-w-0">
                                <span className="block text-xs font-semibold text-white">Todos los usuarios</span>
                                <span className="font-rubik text-[11px] text-white/40">
                                    {totalUsers === null ? "Cargando censo..." : `${totalUsers} miembros activos`}
                                </span>
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => setAudience("selected")}
                            className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all cursor-pointer ${
                                audience === "selected"
                                    ? "border-violet-500/40 bg-violet-600/15 shadow-sm shadow-violet-950/40"
                                    : "border-white/[0.08] bg-black/30 hover:bg-white/[0.04]"
                            }`}
                        >
                            <span className="p-2 rounded-lg bg-violet-500/20 text-violet-300">
                                <LucideSearch size={16} />
                            </span>
                            <div className="min-w-0">
                                <span className="block text-xs font-semibold text-white">Miembros específicos</span>
                                <span className="font-rubik text-[11px] text-white/40">
                                    {selectedUsers.length > 0
                                        ? `${selectedUsers.length} seleccionado(s)`
                                        : "Buscar en lista"}
                                </span>
                            </div>
                        </button>
                    </div>

                    {audience === "selected" && (
                        <div className="space-y-3 rounded-xl border border-white/[0.08] bg-black/40 p-3">
                            <div className="relative">
                                <LucideSearch size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                                <input
                                    type="text"
                                    value={search}
                                    onInput={(event) => setSearch((event.target as HTMLInputElement).value)}
                                    placeholder="Buscar miembro por nombre, usuario o email..."
                                    className={`${inputClasses} pl-9 text-xs`}
                                />
                            </div>

                            {selectedUsers.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {selectedUsers.map((user) => (
                                        <span
                                            key={user.id}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-violet-400/25 bg-violet-500/15 py-1 pl-1.5 pr-2 text-xs text-violet-200"
                                        >
                                            {user.avatar ? (
                                                <img src={user.avatar} alt="" className="size-4 rounded-full object-cover" />
                                            ) : (
                                                <span className="size-4 rounded-full bg-violet-600/40 flex items-center justify-center text-[9px]">
                                                    {user.displayName.slice(0, 1)}
                                                </span>
                                            )}
                                            <span className="max-w-[120px] truncate">{user.displayName || user.username}</span>
                                            <button
                                                type="button"
                                                onClick={() => removeUser(user.id)}
                                                className="text-violet-300 hover:text-white cursor-pointer"
                                            >
                                                <LucideX size={12} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}

                            {searching && (
                                <p className="flex items-center gap-2 text-xs text-white/40 py-1">
                                    <LucideLoader2 size={13} className="animate-spin text-violet-400" /> Buscando miembros...
                                </p>
                            )}

                            {!searching && results.length > 0 && (
                                <div className="max-h-48 overflow-auto rounded-xl border border-white/10 bg-[#0c0c12]">
                                    {results.map((user) => (
                                        <button
                                            key={user.id}
                                            type="button"
                                            onClick={() => addUser(user)}
                                            className="flex w-full items-center gap-3 border-b border-white/[0.06] px-3 py-2 text-left last:border-0 hover:bg-white/[0.05] cursor-pointer transition-colors"
                                        >
                                            {user.avatar ? (
                                                <img src={user.avatar} alt="" className="size-7 rounded-lg object-cover" />
                                            ) : (
                                                <div className="flex size-7 items-center justify-center rounded-lg bg-white/10 text-white/40 text-xs">
                                                    {user.displayName.slice(0, 2).toUpperCase()}
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <p className="truncate text-xs font-semibold text-white">{user.displayName || user.username}</p>
                                                <p className="truncate font-mono text-[10px] text-white/40">{user.email}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Acciones del formulario */}
                <div className="flex items-center justify-end gap-2.5 border-t border-white/[0.08] pt-4">
                    <button
                        type="button"
                        onClick={reset}
                        className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-rubik font-medium text-white/70 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                    >
                        Limpiar campos
                    </button>
                    <button
                        type="submit"
                        disabled={sending}
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:brightness-110 px-5 py-2 text-xs font-rubik font-semibold text-white shadow-lg shadow-violet-950/50 border border-violet-400/30 transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {sending ? <LucideLoader2 size={14} className="animate-spin" /> : <LucideSend size={14} />}
                        {sending ? "Enviando broadcast..." : "Despachar Notificación"}
                    </button>
                </div>
            </form>

            {/* Vista Previa Interactiva */}
            <div className="space-y-4">
                <div className="relative overflow-hidden rounded-2xl bg-[#0f0f16]/90 border border-white/[0.08] p-5 shadow-xl">
                    <div className="mb-4 flex items-center gap-3 border-b border-white/[0.08] pb-3">
                        <div className="rounded-xl bg-white/[0.05] p-2 text-white/60">
                            <LucideEye size={16} />
                        </div>
                        <div>
                            <h2 className="font-anton text-base uppercase tracking-wide text-white leading-none">
                                Previsualización en Vivo
                            </h2>
                            <p className="font-rubik text-xs text-white/40 mt-0.5">
                                Vista estimada en el panel de alertas de los usuarios.
                            </p>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#08080c] shadow-lg">
                        {image && (
                            <img
                                src={image}
                                alt="Portada"
                                className="h-36 w-full object-cover"
                                onError={(event) => {
                                    (event.target as HTMLImageElement).style.display = "none";
                                }}
                            />
                        )}
                        <div className="space-y-2 p-4">
                            <div className="flex items-start justify-between gap-3">
                                <h3 className="text-sm font-semibold text-white font-rubik">
                                    {title || "Título del aviso"}
                                </h3>
                                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide ${currentType.chip}`}>
                                    {currentType.label}
                                </span>
                            </div>

                            <p className="font-rubik text-xs leading-relaxed text-white/60">
                                {message || "El cuerpo de la notificación se mostrará en este espacio con estilo nativo."}
                            </p>

                            {link && (
                                <p className="flex items-center gap-1.5 truncate font-mono text-[11px] text-violet-300/80 pt-1 border-t border-white/[0.05]">
                                    <LucideLink size={12} /> {link}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-white/[0.06] bg-[#0f0f16]/50 p-4">
                    <p className="font-rubik text-xs leading-relaxed text-white/40">
                        ⚡ <strong>Despacho multicanal:</strong> El mensaje se persistirá en base de datos para la campana web y se enviará como notificación push de sistema para dispositivos suscritos.
                    </p>
                </div>
            </div>
        </div>
    );
}
