/**
 * SaltoUruguayServer OneTap SDK v1.0.0
 *
 * Embedable "Sign in with SaltoUruguayServer" widget.
 * Detects active sessions and presents a one-tap OAuth login.
 *
 * Usage:
 *   <script
 *     src="https://saltouruguayserver.com/sdk/onetap.js"
 *     data-client-id="YOUR_CLIENT_ID"
 *     data-redirect-uri="https://yoursite.com/auth/callback"
 *     data-scope="openid profile"
 *     data-use-pkce="true"
 *     data-auto="false"
 *     data-position="bottom-right"
 *     data-callback="onSaltoAuth"
 *   ></script>
 */
;(function () {
  'use strict';

  if (window.__sus_onetap) return;
  window.__sus_onetap = true;

  /* ── Config ─────────────────────────────────────────────── */

  var script = document.currentScript;
  if (!script) {
    console.error('[SUS OneTap] document.currentScript is null — make sure the script is not async/defer');
    return;
  }

  var cfg = {
    clientId:    script.getAttribute('data-client-id'),
    redirectUri: script.getAttribute('data-redirect-uri'),
    scope:       script.getAttribute('data-scope')       || 'openid profile',
    usePkce:     script.getAttribute('data-use-pkce')    !== 'false',
    auto:        script.getAttribute('data-auto')         === 'true',
    position:    script.getAttribute('data-position')     || 'bottom-right',
    callback:    script.getAttribute('data-callback')     || null,
  };

  if (!cfg.clientId || !cfg.redirectUri) {
    console.error('[SUS OneTap] data-client-id and data-redirect-uri are required');
    return;
  }

  var SDK_ORIGIN = new URL(script.src).origin;
  var FRAME_URL  = SDK_ORIGIN + '/sdk/onetap-frame.html';

  /* ── State ──────────────────────────────────────────────── */

  var user     = null;   // { name, image } | null
  var expanded = false;
  var frameEl  = null;
  var ready    = false;
  var els      = {};     // DOM references

  /* ── Crypto helpers ─────────────────────────────────────── */

  function b64url(buf) {
    var bytes = new Uint8Array(buf);
    var bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function randomString(len) {
    var arr = new Uint8Array(len);
    crypto.getRandomValues(arr);
    return b64url(arr).slice(0, len);
  }

  async function sha256Challenge(verifier) {
    var data = new TextEncoder().encode(verifier);
    var hash = await crypto.subtle.digest('SHA-256', data);
    return b64url(hash);
  }

  /* ── Iframe session check ───────────────────────────────── */

  function createFrame() {
    frameEl = document.createElement('iframe');
    frameEl.src = FRAME_URL;
    frameEl.sandbox = 'allow-scripts allow-same-origin';
    frameEl.style.cssText = 'position:absolute;width:0;height:0;border:0;opacity:0;pointer-events:none;overflow:hidden;';
    document.documentElement.appendChild(frameEl);
  }

  function requestRecheck() {
    if (frameEl && frameEl.contentWindow) {
      frameEl.contentWindow.postMessage({ __sus_tap_cmd: 'recheck' }, SDK_ORIGIN);
    }
  }

  function onMessage(e) {
    if (e.origin !== SDK_ORIGIN) return;
    if (!e.data || e.data.__sus_tap !== true) return;

    var prev = user;
    user = e.data.user || null;

    // State changed → update widget
    if ((!prev && user) || (prev && !user) ||
        (prev && user && (prev.name !== user.name || prev.image !== user.image))) {
      syncWidget();
    }
  }

  window.addEventListener('message', onMessage);

  /* ── OAuth redirect ─────────────────────────────────────── */

  async function redirectToAuth() {
    var url = new URL(SDK_ORIGIN + '/oauth/authorize');
    url.searchParams.set('client_id', cfg.clientId);
    url.searchParams.set('redirect_uri', cfg.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', cfg.scope);

    if (cfg.usePkce) {
      var verifier  = randomString(43);
      var challenge = await sha256Challenge(verifier);
      sessionStorage.setItem('__sus_tap_v', verifier);
      url.searchParams.set('code_challenge', challenge);
      url.searchParams.set('code_challenge_method', 'S256');
    }

    var state = randomString(32);
    sessionStorage.setItem('__sus_tap_s', state);
    url.searchParams.set('state', state);

    // Fire callback (if defined) — lets the developer track or intercept
    if (cfg.callback && typeof window[cfg.callback] === 'function') {
      try {
        window[cfg.callback]({
          user: user ? { name: user.name, image: user.image } : null,
          authorizeUrl: url.toString(),
        });
      } catch (_) { /* swallow */ }
    }

    window.location.href = url.toString();
  }

  /* ── Widget rendering ───────────────────────────────────── */

  function syncWidget() {
    if (!ready) return;
    if (!user) {
      setDisplay(false);
      return;
    }
    setDisplay(true);
    els.avatar.src = user.image || '';
    els.avatar.alt = user.name || 'Usuario';
    els.name.textContent = user.name || 'Usuario';
    els.btnText.textContent = 'Iniciar sesión como ' + (user.name || 'Usuario');

    if (cfg.auto && !expanded) {
      toggle(true);
    }
  }

  function setDisplay(show) {
    if (els.wrap) els.wrap.style.display = show ? '' : 'none';
  }

  function toggle(force) {
    expanded = typeof force === 'boolean' ? force : !expanded;
    if (els.card) {
      els.card.style.opacity  = expanded ? '1' : '0';
      els.card.style.pointerEvents = expanded ? 'auto' : 'none';
      els.card.style.transform = expanded ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.95)';
    }
    if (els.btnFab) {
      els.btnFab.style.transform = expanded ? 'scale(0.85)' : 'scale(1)';
      els.btnFab.style.opacity   = expanded ? '0.5' : '1';
    }
  }

  /* ── DOM builder ────────────────────────────────────────── */

  function build() {
    // Wrapper
    els.wrap = el('div', {
      position: 'fixed',
      bottom: '20px',
      [cfg.position === 'bottom-left' ? 'left' : 'right']: '20px',
      zIndex: '2147483647',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      display: 'none',
    });
    els.wrap.setAttribute('dir', 'ltr');

    // --- FAB button (collapsed state) ---
    els.btnFab = el('button', {
      width: '56px',
      height: '56px',
      borderRadius: '50%',
      border: 'none',
      cursor: 'pointer',
      background: 'linear-gradient(135deg, #9146FF 0%, #772ce8 100%)',
      boxShadow: '0 4px 24px rgba(145,70,255,0.4), 0 0 0 0 rgba(145,70,255,0)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
      outline: 'none',
      padding: '0',
    });
    els.btnFab.title = 'Iniciar sesión con SaltoUruguayServer';
    els.btnFab.innerHTML = susLogoSvg(28, '#fff');
    els.btnFab.onmouseenter = function () {
      if (!expanded) els.btnFab.style.boxShadow = '0 6px 32px rgba(145,70,255,0.6), 0 0 0 3px rgba(145,70,255,0.25)';
    };
    els.btnFab.onmouseleave = function () {
      if (!expanded) els.btnFab.style.boxShadow = '0 4px 24px rgba(145,70,255,0.4), 0 0 0 0 rgba(145,70,255,0)';
    };
    els.btnFab.onclick = function (e) {
      e.stopPropagation();
      toggle();
    };

    // --- Card (expanded state) ---
    els.card = el('div', {
      position: 'absolute',
      bottom: '68px',
      [cfg.position === 'bottom-left' ? 'left' : 'right']: '0',
      width: '320px',
      background: 'rgba(12,12,14,0.96)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderRadius: '16px',
      border: '1px solid rgba(255,255,255,0.08)',
      boxShadow: '0 12px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
      padding: '20px',
      opacity: '0',
      pointerEvents: 'none',
      transform: 'translateY(8px) scale(0.95)',
      transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
    });
    els.card.onclick = function (e) { e.stopPropagation(); };

    // Close btn
    var closeBtn = el('button', {
      position: 'absolute',
      top: '12px',
      right: '12px',
      width: '28px',
      height: '28px',
      borderRadius: '8px',
      border: 'none',
      background: 'rgba(255,255,255,0.06)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'background 0.15s',
      padding: '0',
    });
    closeBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>';
    closeBtn.onmouseenter = function () { closeBtn.style.background = 'rgba(255,255,255,0.12)'; };
    closeBtn.onmouseleave = function () { closeBtn.style.background = 'rgba(255,255,255,0.06)'; };
    closeBtn.onclick = function (e) { e.stopPropagation(); toggle(false); };

    // Header: avatar + name
    var header = el('div', {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '16px',
      paddingRight: '28px',
    });

    els.avatar = el('img', {
      width: '44px',
      height: '44px',
      borderRadius: '50%',
      objectFit: 'cover',
      border: '2px solid rgba(145,70,255,0.4)',
      flexShrink: '0',
    });
    els.avatar.alt = '';

    var nameWrap = el('div', { minWidth: '0', flex: '1' });
    els.name = el('div', {
      fontSize: '15px',
      fontWeight: '600',
      color: '#fff',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      lineHeight: '1.3',
    });
    var subtitle = el('div', {
      fontSize: '12px',
      color: 'rgba(255,255,255,0.4)',
      marginTop: '1px',
    });
    subtitle.textContent = 'Sesión activa detectada';

    nameWrap.appendChild(els.name);
    nameWrap.appendChild(subtitle);
    header.appendChild(els.avatar);
    header.appendChild(nameWrap);

    // Divider
    var divider = el('div', {
      height: '1px',
      background: 'rgba(255,255,255,0.06)',
      margin: '0 0 16px',
    });

    // CTA button
    var ctaBtn = el('button', {
      width: '100%',
      height: '44px',
      borderRadius: '12px',
      border: 'none',
      background: 'linear-gradient(135deg, #9146FF 0%, #772ce8 100%)',
      color: '#fff',
      fontSize: '14px',
      fontWeight: '600',
      fontFamily: 'inherit',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      transition: 'all 0.2s',
      boxShadow: '0 2px 12px rgba(145,70,255,0.3)',
    });
    els.btnText = el('span');
    ctaBtn.appendChild(els.btnText);
    var arrowSvg = document.createElement('span');
    arrowSvg.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>';
    ctaBtn.appendChild(arrowSvg);
    ctaBtn.onmouseenter = function () {
      ctaBtn.style.background = 'linear-gradient(135deg, #a566ff 0%, #9146FF 100%)';
      ctaBtn.style.boxShadow = '0 4px 20px rgba(145,70,255,0.5)';
    };
    ctaBtn.onmouseleave = function () {
      ctaBtn.style.background = 'linear-gradient(135deg, #9146FF 0%, #772ce8 100%)';
      ctaBtn.style.boxShadow = '0 2px 12px rgba(145,70,255,0.3)';
    };
    ctaBtn.onclick = function (e) {
      e.stopPropagation();
      redirectToAuth();
    };

    // Footer text
    var footer = el('div', {
      textAlign: 'center',
      marginTop: '12px',
      fontSize: '11px',
      color: 'rgba(255,255,255,0.25)',
    });
    footer.textContent = 'Powered by SaltoUruguayServer';

    // Assemble card
    els.card.appendChild(closeBtn);
    els.card.appendChild(header);
    els.card.appendChild(divider);
    els.card.appendChild(ctaBtn);
    els.card.appendChild(footer);

    // Assemble wrapper
    els.wrap.appendChild(els.card);
    els.wrap.appendChild(els.btnFab);

    // Close on outside click
    document.addEventListener('click', function () {
      if (expanded) toggle(false);
    });
  }

  /* ── DOM helpers ────────────────────────────────────────── */

  function el(tag, styles) {
    var e = document.createElement(tag);
    if (styles) Object.assign(e.style, styles);
    return e;
  }

  function susLogoSvg(size, color) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="' + color + '">' +
      '<path d="M11.64 5.93h1.43v4.28h-1.43m3.93-4.28H17v4.28h-1.43M7 2L3.43 5.57v12.86h4.28V22l3.58-3.57h2.85L20.57 12V2m-1.43 9.29l-2.85 2.85h-2.86l-2.5 2.5v-2.5H7.71V3.43h11.43Z"/>' +
      '</svg>';
  }

  /* ── Init ───────────────────────────────────────────────── */

  function init() {
    build();
    document.documentElement.appendChild(els.wrap);
    ready = true;
    createFrame();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
