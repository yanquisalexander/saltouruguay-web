import { h } from 'preact';
import { MessageSquare, MessageCircle, Calendar, HelpCircle, LucideHome, LucideUsers, LucidePiggyBank, LucideTrophy, LucidePaw } from 'lucide-preact';

export default function CommunitySidebar() {
    return (
        <nav className="s-ui-sidebar">
            <ul className="flex flex-col gap-4">
                <li>
                    <a href="/" className="pixel-btn-chunky variant-home" title="Inicio">
                        <LucideHome size={24} />
                    </a>
                </li>
                <li>
                    <a href="/comunidad" className="pixel-btn-chunky variant-violet" title="Comunidad">
                        <LucideUsers size={24} />
                    </a>
                </li>
                <li>
                    <a href="/comunidad/banco" className="pixel-btn-chunky variant-yellow" title="Banco Saltano">
                        <LucidePiggyBank size={24} />
                    </a>
                </li>
                <li>
                    <a href="/comunidad/mascota" className="pixel-btn-chunky variant-pink" title="Mascota Saltana">
                        <LucidePaw size={24} />
                    </a>
                </li>
                <li>
                    <a href="/comunidad/logros" className="pixel-btn-chunky variant-green" title="Logros">
                        <LucideTrophy size={24} />
                    </a>
                </li>
            </ul>
        </nav>
    );
}