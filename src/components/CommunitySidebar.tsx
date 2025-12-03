import { h } from 'preact';
import { MessageSquare, MessageCircle, Calendar, HelpCircle, LucideHome, LucideUsers, LucidePiggyBank, LucideTrophy } from 'lucide-preact';

export default function CommunitySidebar() {
    return (
        <nav className="s-ui-sidebar">
            <ul className="flex flex-col gap-4">
                <li>
                    <a href="/" className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-electric-violet-700 transition-all pixel-container" title="Inicio">
                        <LucideHome size={20} />
                    </a>
                </li>
                <li>
                    <a href="/comunidad" className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-electric-violet-700 transition-all pixel-container" title="Comunidad">
                        <LucideUsers size={20} />
                    </a>
                </li>
                <li>
                    <a href="/comunidad/banco" className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-yellow-600 transition-all pixel-container" title="Banco Saltano">
                        <LucidePiggyBank size={20} />
                    </a>
                </li>
                <li>
                    <a href="/comunidad/logros" className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-green-600 transition-all pixel-container" title="Logros">
                        <LucideTrophy size={20} />
                    </a>
                </li>
            </ul>
        </nav>
    );
}