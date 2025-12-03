import { h } from 'preact';
import { MessageSquare, MessageCircle, Calendar, HelpCircle, LucideHome, LucideUsers } from 'lucide-preact';

export default function CommunitySidebar() {
    return (
        <nav className="s-ui-sidebar">
            <ul className="flex flex-col gap-4">
                <li>
                    <a href="/" className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-700 transition-colors" title="Foros">
                        <LucideHome size={20} />
                    </a>
                </li>
                <li>
                    <a href="/comunidad" className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-700 transition-colors" title="Chat">
                        <LucideUsers size={20} />
                    </a>
                </li>
                <li>
                    <a href="/comunidad/eventos" className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-700 transition-colors" title="Eventos">
                        <Calendar size={20} />
                    </a>
                </li>
                <li>
                    <a href="/comunidad/ayuda" className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-700 transition-colors" title="Ayuda">
                        <HelpCircle size={20} />
                    </a>
                </li>
            </ul>
        </nav>
    );
}