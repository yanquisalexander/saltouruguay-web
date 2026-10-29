import { getPreloadedSession } from "@/lib/preloaded-data";
import type { Session } from "@auth/core/types";
import { signOut } from "auth-astro/client";
import { NOMINEES } from "@/awards/Nominees";
import { LucideLoader2, LucideLogOut, LucideUser, LucideLayoutDashboard, LucideMessageSquare, LucideChevronDown, LucideTrophy, LucideGamepad2, LucideIdCard, LucideShieldCheck, LucideArrowUpRight } from "lucide-preact";
import { useState, useEffect, useRef, useId } from "preact/hooks";
import { toast } from "sonner";
import { AchievementsNotifier } from "./AchievementsNotifier";
import { CinematicPlayer } from "./CinematicPlayer";
import { usePusher } from "@/hooks/usePusher";
import { navigate } from "astro:transitions/client";
import type { JSX } from 'preact';
import { CHRISTMAS_MODE, HALLOWEEN_MODE } from "@/config";
import { Suspense } from "preact/compat";
import './styles/current-user.css';

const TwitchBrandIcon = (props: JSX.IntrinsicElements['svg']) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M11.64 5.93h1.43v4.28h-1.43m3.93-4.28H17v4.28h-1.43M7 2L3.43 5.57v12.86h4.28V22l3.58-3.57h2.85L20.57 12V2m-1.43 9.29l-2.85 2.85h-2.86l-2.5 2.5v-2.5H7.71V3.43h11.43Z" />
    </svg>
);

export const CurrentUser = ({ user: initialUser, isPrerenderedPath }: { user: Session['user'] | null; isPrerenderedPath: boolean }) => {
    const [user, setUser] = useState<Session['user'] | null>(() => initialUser || getPreloadedSession());
    const [fetchingUser, setFetchingUser] = useState(isPrerenderedPath && !user);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [signingOut, setSigningOut] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const panelId = useId();
    const { pusher } = usePusher();
    const nominated = !!(user && NOMINEES[user.username as keyof typeof NOMINEES]);
    const season = HALLOWEEN_MODE ? 'halloween' : CHRISTMAS_MODE ? 'christmas' : 'regular';
    const name = user?.name || user?.username || 'Saltano';
    const avatar = user?.image || '/favicon.svg';

    useEffect(() => {
        if (user || !isPrerenderedPath) return;
        const controller = new AbortController();
        const load = async () => {
            try {
                const response = await fetch('/api/auth/session', { signal: controller.signal });
                if (response.ok) {
                    const data = await response.json();
                    if (controller.signal.aborted) return;
                    setUser(data?.user || null);
                    if (data?.user?.isSuspended) void navigate('/suspended');
                }
            } catch (error) {
                if (!controller.signal.aborted) console.error('Error al obtener el usuario', error);
            } finally {
                if (!controller.signal.aborted) setFetchingUser(false);
            }
        };
        void load();
        return () => controller.abort();
    }, [isPrerenderedPath]);

    useEffect(() => {
        const error = () => toast.error('Ocurrió un error al iniciar sesión. Volvé a intentarlo.');
        const close = () => setDropdownOpen(false);
        window.addEventListener('SignInError', error);
        document.addEventListener('astro:before-swap', close);
        return () => {
            window.removeEventListener('SignInError', error);
            document.removeEventListener('astro:before-swap', close);
        };
    }, []);

    useEffect(() => {
        if (!dropdownOpen) return;
        const outside = (event: PointerEvent) => {
            if (!dropdownRef.current?.contains(event.target as Node)) setDropdownOpen(false);
        };
        const keyboard = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                setDropdownOpen(false);
                triggerRef.current?.focus();
            }
        };
        const root = dropdownRef.current;
        document.addEventListener('pointerdown', outside);
        root?.addEventListener('keydown', keyboard);
        return () => {
            document.removeEventListener('pointerdown', outside);
            root?.removeEventListener('keydown', keyboard);
        };
    }, [dropdownOpen]);

    function signIn() {
        const width = 600, height = 700;
        const popup = window.open('/auth/twitch', 'Twitch Login', [
            'toolbar=no,location=no,menubar=no,resizable=yes,scrollbars=yes',
            'width=' + width, 'height=' + height,
            'left=' + (window.screenX + (window.outerWidth - width) / 2),
            'top=' + Math.max(0, window.screenY + (window.outerHeight - height) / 2),
        ].join(','));
        if (!popup) window.location.assign('/auth/twitch');
    }

    async function logout() {
        if (signingOut) return;
        setSigningOut(true);
        const options = { prefix: '/api/auth', callbackUrl: '/' };
        try { await signOut(options); }
        catch { toast.error('No pudimos cerrar la sesión. Volvé a intentarlo.'); setSigningOut(false); }
    }

    if (fetchingUser) return <div class="account-control" data-season={season}><span class="account-loading" role="status"><LucideLoader2 size={18} class="animate-spin" /><span class="sr-only">Cargando tu cuenta</span></span></div>;
    if (!user) return <div class="account-control" data-season={season}><button type="button" class="account-login" onClick={signIn} aria-label="Iniciar sesión con Twitch"><TwitchBrandIcon class="account-twitch" /><span>Conectar</span></button></div>;

    const entries = [
        { href: '/usuario', label: 'Mi perfil', icon: LucideUser },
        { href: '/comunidad/member-card', label: 'Member Card', icon: LucideIdCard },
        { href: '/comunidad/logros', label: 'Mis logros', icon: LucideTrophy },
        { href: 'https://play.saltouruguayserver.com/', label: 'SaltoPlay', icon: LucideGamepad2 },
    ];

    return <div class="account-control" data-season={season} ref={dropdownRef} onFocusOut={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropdownOpen(false);
    }}>
        <button type="button" class="account-trigger" ref={triggerRef} aria-expanded={dropdownOpen} aria-controls={panelId} aria-label={'Opciones de cuenta de ' + name}
            onClick={() => setDropdownOpen(value => !value)} onKeyDown={event => {
                if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    setDropdownOpen(true);
                    requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>('a,button')?.focus());
                }
            }}>
            <span class="account-avatar" data-nominated={nominated}><img src={avatar} alt="" width="32" height="32" />{season !== 'regular' && <span class="account-season-accessory" aria-hidden="true">{season === 'halloween' ? '🎃' : '🎅'}</span>}</span>
            <span class="account-trigger-name">{name}</span><LucideChevronDown size={13} class="account-chevron" />
        </button>
        {dropdownOpen && <div class="account-panel" id={panelId} ref={panelRef}>
            <div class="account-profile"><img class="account-profile-avatar" src={avatar} alt="" width="44" height="44" /><div class="account-profile-text"><span class="account-profile-name">{name}</span><span class="account-profile-email">{user.email || '@' + user.username}</span></div></div>
            {nominated && <div class="account-nominee"><LucideTrophy size={12} />Nominado SaltoAwards 2025</div>}
            <nav class="account-links" aria-label="Tu cuenta">{entries.map(({ href, label, icon: Icon }) => <a key={href} href={href} onClick={() => setDropdownOpen(false)}><span class="account-link-icon"><Icon size={17} /></span><span>{label}</span><LucideArrowUpRight size={13} class="account-link-arrow" /></a>)}</nav>
            <div class="account-settings">
                {!user.linkedAccounts?.discord && <button type="button" class="account-discord" onClick={() => window.location.assign('/api/linked-accounts/discord/link')}><LucideMessageSquare size={17} /><span>Vincular Discord</span><span class="account-connect-tag">Conectar</span></button>}
                {user.isAdmin && <a href="/admin" onClick={() => setDropdownOpen(false)}><LucideLayoutDashboard size={17} /><span>Administración</span><LucideShieldCheck size={14} class="account-admin-icon" /></a>}
                <button type="button" class="account-logout" onClick={logout} disabled={signingOut}>{signingOut ? <LucideLoader2 size={17} class="animate-spin" /> : <LucideLogOut size={17} />}<span>{signingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}</span></button>
            </div>
        </div>}
        {pusher && <Suspense fallback={null}><AchievementsNotifier userId={String(user.id)} /><CinematicPlayer userId={String(user.id)} /></Suspense>}
    </div>;
};
