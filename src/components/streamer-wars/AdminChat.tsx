import { useEffect, useRef, useState, useMemo } from "preact/hooks";
import type { Session } from "@auth/core/types";
import { actions } from "astro:actions";

interface AdminChatProps { session: Session; channel: any; isAdmin: boolean; }

interface Command {
    name: string;
    description: string;
    args: string[];
    useAction?: (args: string[]) => Promise<any>;
}

const COMMANDS: Command[] = [
    { name: "/announce", description: "Enviar un anuncio", args: ["mensaje"] },
    { name: "/kill", description: "Eliminar uno o más jugadores", args: ["playerNumber", "..."] },
    { name: "/launch", description: "Iniciar un juego", args: ["gameId", "args?"] },
    { name: "/episode", description: "Mostrar título de episodio", args: ["número"] },
    {
        name: "/journey", description: "Bloquear o desbloquear la jornada", args: ["unlock|lock"], useAction: async (args: string[]) => {
            const action = args[0];
            if (action === 'unlock') return actions.streamerWars.setDayAsAvailable();
            if (action === 'lock') return actions.streamerWars.finishDay();
            throw new Error('Usá "unlock" o "lock"');
        }
    },
    { name: "/team", description: "Ver miembros de un equipo", args: ["color"] },
    { name: "/waiting", description: "Mostrar/ocultar pantalla de espera", args: ["show", "expected"] },
    { name: "/play-cinematic", description: "Reproducir cinemática", args: ["id"] },
    { name: "/waiting-room", description: "Enviar jugadores a sala de espera", args: [] },
    { name: "/chat", description: "Bloquear o desbloquear el chat", args: ["unlock|lock"] },
    { name: "/dalgona", description: "Controlar minijuego Dalgona", args: ["start|end"] },
    { name: "/timer", description: "Mostrar temporizador", args: ["segundos"] },
    { name: "/cuerda", description: "Controlar Tug of War", args: ["start|end|next|clear"] },
    { name: "/bomb", description: "Controlar Bomb", args: ["start|end|status"] },
    { name: "/fishing", description: "Controlar Fishing", args: ["start [maxEliminations]", "end", "reset"] },
    { name: "/andi", description: "Controlar And I Challenge", args: ["start|next|end|reset"] },
    { name: "/revive", description: "Revivir un jugador", args: ["playerNumber"] },
    { name: "/instructions", description: "Enviar instrucciones por ID", args: ["id"] },
    { name: "/cinematic3d", description: "Reproducir cinemática 3D", args: ["id"] }
];

type LogEntry = {
    id: number;
    type: 'command' | 'response' | 'error';
    text: string;
    timestamp: string;
};

let logId = 0;

const fmtTime = () => new Date().toLocaleTimeString("es-UY", { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export const AdminChat = ({ isAdmin }: AdminChatProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [command, setCommand] = useState("");
    const [selectedSuggestion, setSelectedSuggestion] = useState(0);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [cmdHistory, setCmdHistory] = useState<string[]>([]);
    const [historyIdx, setHistoryIdx] = useState(-1);

    const inputRef = useRef<HTMLInputElement>(null);
    const logsEndRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    const suggestions = useMemo(() => {
        if (!command.startsWith('/')) return [];
        const parts = command.split(' ');
        const query = parts[0].slice(1).toLowerCase();
        return COMMANDS.filter(c => c.name.slice(1).startsWith(query));
    }, [command]);

    const selectedCmd = useMemo(() => {
        if (!command.startsWith('/')) return null;
        const parts = command.split(' ');
        const cmdName = parts[0];
        return COMMANDS.find(c => c.name === cmdName) || null;
    }, [command]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.key === 't' || e.key === 'T') && !isOpen) {
                const active = document.activeElement;
                if (active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA') return;
                e.preventDefault();
                setIsOpen(true);
            } else if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) inputRef.current?.focus();
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [isOpen, logs]);

    useEffect(() => {
        setSelectedSuggestion(0);
    }, [command]);

    const addLog = (entry: Omit<LogEntry, 'id' | 'timestamp'>) => {
        setLogs(prev => [...prev.slice(-49), { ...entry, id: ++logId, timestamp: fmtTime() }]);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (suggestions.length > 0 && e.key === 'Tab') {
            e.preventDefault();
            setCommand(suggestions[selectedSuggestion].name + ' ');
            setSelectedSuggestion(0);
            return;
        }

        if (e.key === 'ArrowUp' && !e.shiftKey) {
            e.preventDefault();
            if (historyIdx < cmdHistory.length - 1) {
                const next = historyIdx + 1;
                setHistoryIdx(next);
                setCommand(cmdHistory[cmdHistory.length - 1 - next]);
            }
            return;
        }

        if (e.key === 'ArrowDown' && !e.shiftKey) {
            e.preventDefault();
            if (historyIdx > 0) {
                const next = historyIdx - 1;
                setHistoryIdx(next);
                setCommand(cmdHistory[cmdHistory.length - 1 - next]);
            } else if (historyIdx === 0) {
                setHistoryIdx(-1);
                setCommand("");
            }
            return;
        }
    };

    const handleSubmit = (e: Event) => {
        e.preventDefault();
        const raw = command.trim();
        if (!raw) return;

        if (!raw.startsWith('/')) {
            addLog({ type: 'error', text: 'Los comandos deben empezar con /' });
            setCommand("");
            return;
        }

        const parts = raw.split(' ');
        const cmdName = parts[0];
        const args = parts.slice(1);

        const cmd = COMMANDS.find(c => c.name === cmdName);
        if (!cmd) {
            addLog({ type: 'error', text: `Comando no encontrado: ${cmdName}` });
            setCommand("");
            return;
        }

        addLog({ type: 'command', text: `${cmdName} ${args.join(' ')}` });
        setCmdHistory(prev => [...prev.slice(-49), raw]);
        setHistoryIdx(-1);
        setCommand("");

        const promise = cmd.useAction
            ? cmd.useAction(args)
            : actions.streamerWars.executeAdminCommand({ command: cmdName, args });

        promise
            .then((result: any) => {
                if (result?.error) {
                    addLog({ type: 'error', text: result.error.message || String(result.error) || 'ERROR' });
                } else {
                    const feedback = result?.data?.feedback || result?.data?.message || 'OK';
                    addLog({ type: 'response', text: feedback });
                }
            })
            .catch((err: any) => {
                addLog({ type: 'error', text: err?.message || 'SYSTEM ERROR' });
            });
    };

    const selectSuggestion = (cmd: Command) => {
        setCommand(cmd.name + ' ');
        inputRef.current?.focus();
    };

    if (!isAdmin || !isOpen) return null;

    return (
        <div class="fixed inset-0 z-10000 flex items-start justify-end p-4 pointer-events-none">
            <div
                ref={panelRef}
                class="w-full max-w-lg pointer-events-auto flex flex-col bg-[#08080a]/95 backdrop-blur-md border border-[#1c1c1e] shadow-[0_0_60px_rgba(0,0,0,0.9)]"
            >
                {/* HEADER */}
                <div class="flex items-center justify-between px-4 py-2 border-b border-[#1c1c1e]">
                    <div class="flex items-center gap-2">
                        <span class="w-1.5 h-1.5 rounded-full bg-[#b4cd02] shadow-[0_0_6px_#b4cd02]" />
                        <span class="font-anton text-[10px] tracking-[0.2em] text-neutral-500 uppercase">
                            ADMIN TERMINAL
                        </span>
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="font-teko text-[10px] text-neutral-700 tracking-widest">
                            [T] ABRIR
                        </span>
                        <span class="font-teko text-[10px] text-neutral-700 tracking-widest">
                            [ESC] CERRAR
                        </span>
                    </div>
                </div>

                {/* LOGS */}
                <div class="h-56 overflow-y-auto p-3 font-mono text-[12px] leading-relaxed bg-[#050508] scrollbar-thin scrollbar-thumb-[#1c1c1e]">
                    {logs.length === 0 && (
                        <div class="text-neutral-700 italic select-none py-2 text-center text-[11px]">
                            Consola lista. Escribí un comando...
                        </div>
                    )}
                    {logs.map(log => (
                        <div key={log.id} class={`py-1 px-2 mb-0.5 ${
                            log.type === 'command'
                                ? 'text-[#b4cd02] border-l-[2px] border-[#b4cd02]/50 bg-[#b4cd02]/[0.03]'
                                : log.type === 'error'
                                    ? 'text-red-400 border-l-[2px] border-red-500/60 bg-red-950/20'
                                    : 'text-neutral-300 border-l-[2px] border-transparent'
                        }`}>
                            <span class="text-neutral-700 mr-2 select-none">[{log.timestamp}]</span>
                            {log.type === 'command' && <span class="text-neutral-500 mr-1 select-none">{'>'}</span>}
                            {log.type === 'error' && <span class="mr-1 select-none">{'✕'}</span>}
                            {log.type === 'response' && <span class="text-[#b4cd02]/60 mr-1 select-none">{'✓'}</span>}
                            {log.text}
                        </div>
                    ))}
                    <div ref={logsEndRef} />
                </div>

                {/* SUGGESTIONS */}
                {suggestions.length > 0 && (
                    <div class="border-t border-[#1c1c1e] bg-[#0a0a0c] p-2">
                        <div class="flex flex-wrap gap-1.5">
                            {suggestions.map((s, i) => (
                                <button
                                    key={s.name}
                                    onClick={() => selectSuggestion(s)}
                                    class={`text-[11px] px-2.5 py-1 border transition-all duration-150 ${
                                        i === selectedSuggestion
                                            ? 'border-[#b4cd02]/60 bg-[#b4cd02]/10 text-[#b4cd02]'
                                            : 'border-[#1c1c1e] bg-[#08080a] text-neutral-400 hover:border-[#b4cd02]/30 hover:text-neutral-200'
                                    }`}
                                >
                                    <span class="font-anton tracking-wider">{s.name}</span>
                                    {s.args.length > 0 && (
                                        <span class="text-neutral-600 ml-1.5 font-mono text-[10px]">
                                            {s.args.join(' ')}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* ARGUMENT HINT */}
                {selectedCmd && !suggestions.find(s => s.name !== selectedCmd.name) && (
                    <div class="border-t border-[#1c1c1e] bg-[#0a0a0c]/50 px-4 py-1.5">
                        <span class="text-[10px] text-neutral-600 font-mono">
                            {selectedCmd.description}
                            {selectedCmd.args.length > 0 && (
                                <span class="text-neutral-700 ml-2">
                                    — args: {selectedCmd.args.join(', ')}
                                </span>
                            )}
                        </span>
                    </div>
                )}

                {/* INPUT */}
                <div class="border-t border-[#1c1c1e] px-4 py-3 bg-[#08080a]">
                    <form onSubmit={handleSubmit} class="flex items-center gap-2">
                        <span class="font-mono text-[#b4cd02] text-lg select-none leading-none">{'>'}</span>
                        <input
                            ref={inputRef}
                            type="text"
                            value={command}
                            onInput={(e) => setCommand((e.target as HTMLInputElement).value)}
                            onKeyDown={handleKeyDown}
                            placeholder="escribí un comando..."
                            class="flex-1 bg-transparent text-white text-sm outline-hidden border-none font-mono tracking-wide placeholder:text-neutral-700"
                            autoComplete="off"
                            spellcheck={false}
                        />
                    </form>
                    <div class="mt-1 flex gap-3 font-teko text-[10px] text-neutral-700 tracking-widest">
                        <span>[↑↓] HISTORIAL</span>
                        <span>[TAB] AUTOCOMPLETAR</span>
                        <span>[ENTER] EJECUTAR</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
