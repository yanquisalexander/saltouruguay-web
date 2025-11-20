import { useEffect, useRef, useState } from "preact/hooks";
import type { Session } from "@auth/core/types";
import { actions } from "astro:actions";

interface AdminChatProps {
    session: Session;
    channel: any; // Pusher channel
    isAdmin: boolean;
}

const COMMANDS = [
    { name: "/announce", description: "Send an announcement", args: ["message"] },
    { name: "/kill", description: "Kill one or more players", args: ["playerNumber", "..."] },
    { name: "/launch", description: "Launch a game", args: ["gameId", "args?"] },
    { name: "/episode", description: "Show episode title", args: ["number"] },
    { name: "/team", description: "View team members", args: ["color"] },
    { name: "/waiting", description: "Show or hide waiting screen", args: ["show", "expected"] },
    { name: "/play-cinematic", description: "Play a cinematic", args: ["id"] },
    { name: "/waiting-room", description: "Send players to waiting room", args: [] },
    { name: "/chat", description: "Lock or unlock the chat", args: ["unlock|lock"] },
    { name: "/dalgona", description: "Control Dalgona minigame", args: ["start|end"] },
    { name: "/timer", description: "Show a timer for the specified seconds", args: ["seconds"] },
    { name: "/cuerda", description: "Control Tug of War game", args: ["start|end|next|clear"] },
    { name: "/bomb", description: "Control Bomb minigame", args: ["start|end|status"] }
];

export const AdminChat = ({ session, channel, isAdmin }: AdminChatProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [command, setCommand] = useState("");
    const [suggestions, setSuggestions] = useState<typeof COMMANDS>([]);
    const [history, setHistory] = useState<{ type: 'command' | 'response' | 'error', text: string }[]>([]);
    const [currentHistoryIndex, setCurrentHistoryIndex] = useState<number | null>(null);
    const [commandHistory, setCommandHistory] = useState<string[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 't' || e.key === 'T') {
                const activeElement = document.activeElement as HTMLElement;
                if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.contentEditable === 'true')) {
                    return;
                }
                e.preventDefault();
                setIsOpen(true);
            } else if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
                setCommand("");
                setSuggestions([]);
                setCurrentHistoryIndex(null);
            } else if (e.key === 'Tab' && isOpen && suggestions.length > 0) {
                e.preventDefault();
                setCommand(suggestions[0].name + ' ');
                setSuggestions([]);
            } else if (e.key === 'ArrowUp' && isOpen) {
                e.preventDefault();
                navigateHistory('up');
            } else if (e.key === 'ArrowDown' && isOpen) {
                e.preventDefault();
                navigateHistory('down');
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, suggestions, commandHistory, currentHistoryIndex]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    useEffect(() => {
        if (command.startsWith('/')) {
            const query = command.slice(1).toLowerCase();
            const filtered = COMMANDS.filter(cmd => cmd.name.slice(1).toLowerCase().startsWith(query));
            setSuggestions(filtered);
        } else {
            setSuggestions([]);
        }
    }, [command]);

    const handleSubmit = (e: Event) => {
        e.preventDefault();
        if (command.trim()) {
            if (!command.startsWith('/')) {
                setHistory(prev => [...prev.slice(-9), { type: 'error', text: 'Error: Commands must start with /' }]);
                setCommand("");
                return;
            }

            const parts = command.trim().split(' ');
            const cmd = parts[0];
            const args = parts.slice(1);

            const commandExists = COMMANDS.some(c => c.name === cmd);
            if (!commandExists) {
                setHistory(prev => [...prev.slice(-9), { type: 'error', text: `Error: Command ${cmd} does not exist` }]);
                setCommand("");
                return;
            }

            // Call the action
            actions.streamerWars.executeAdminCommand({ command: cmd, args }).then(result => {
                if (result.error) {
                    setHistory(prev => [...prev.slice(-9), { type: 'error', text: result.error.message || 'Error executing command' }]);
                } else if (result.data.success) {
                    setHistory(prev => [...prev.slice(-9), { type: 'command', text: `> ${command.trim()}` }, { type: 'response', text: result.data.feedback || 'Executed successfully' }]);
                } else {
                    setHistory(prev => [...prev.slice(-9), { type: 'error', text: result.data.feedback || 'Execution failed' }]);
                }
                setCommand("");
                setCurrentHistoryIndex(null);
                // Add to command history
                setCommandHistory(prev => {
                    const newHistory = [...prev];
                    if (command.trim() && (newHistory.length === 0 || newHistory[newHistory.length - 1] !== command.trim())) {
                        newHistory.push(command.trim());
                        if (newHistory.length > 10) newHistory.shift(); // Keep only last 10
                    }
                    return newHistory;
                });
            }).catch(error => {
                setHistory(prev => [...prev.slice(-9), { type: 'error', text: 'Error executing command' }]);
                setCommand("");
                setCurrentHistoryIndex(null);
            });
        }
    };

    const selectSuggestion = (cmd: string) => {
        setCommand(cmd + ' ');
        setSuggestions([]);
        inputRef.current?.focus();
    };

    const navigateHistory = (direction: 'up' | 'down') => {
        if (direction === 'up') {
            if (currentHistoryIndex === null) {
                if (commandHistory.length > 0) {
                    setCurrentHistoryIndex(commandHistory.length - 1);
                    setCommand(commandHistory[commandHistory.length - 1]);
                }
            } else if (currentHistoryIndex > 0) {
                setCurrentHistoryIndex(currentHistoryIndex - 1);
                setCommand(commandHistory[currentHistoryIndex - 1]);
            }
        } else {
            if (currentHistoryIndex !== null) {
                if (currentHistoryIndex < commandHistory.length - 1) {
                    setCurrentHistoryIndex(currentHistoryIndex + 1);
                    setCommand(commandHistory[currentHistoryIndex + 1]);
                } else {
                    setCurrentHistoryIndex(null);
                    setCommand('');
                }
            }
        }
    };

    if (!isAdmin || !isOpen) return null;

    return (
        <div class="fixed bottom-20 left-4 z-[10000] bg-black/80 backdrop-blur-md border border-white/20 rounded-lg p-4 min-w-[300px] max-w-[400px]">
            {history.length > 0 && (
                <div class="mb-4 max-h-32 overflow-y-auto text-xs">
                    {history.map((msg, i) => (
                        <div key={i} class={`mb-1 ${msg.type === 'error' ? 'text-red-500' : msg.type === 'command' ? 'text-white' : 'text-white/70'}`}>
                            {msg.text}
                        </div>
                    ))}
                </div>
            )}
            <form onSubmit={handleSubmit}>
                <input
                    ref={inputRef}
                    type="text"
                    value={command}
                    onInput={(e) => setCommand((e.target as HTMLInputElement).value)}
                    placeholder="Enter admin command..."
                    class="w-full bg-transparent text-white placeholder-white/50 outline-none"
                    autoComplete="off"
                />
            </form>
            {suggestions.length > 0 && (
                <ul class="mt-2 bg-black/60 rounded-md border border-white/10 max-h-32 overflow-y-auto">
                    {suggestions.map((sug) => (
                        <li
                            key={sug.name}
                            class="px-3 py-2 hover:bg-white/10 cursor-pointer text-white/80"
                            onClick={() => selectSuggestion(sug.name)}
                        >
                            <div class="font-semibold">{sug.name}</div>
                            <div class="text-xs text-white/50">{sug.description} - Args: {sug.args.join(', ')}</div>
                        </li>
                    ))}
                </ul>
            )}
            <div class="text-xs text-white/50 mt-2">
                Press Enter to send, Escape to cancel
            </div>
        </div>
    );
};