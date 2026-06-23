; (function () {
  'use strict';

  if (window.__sus_onetap) return;
  window.__sus_onetap = true;

  /* ── Config ─────────────────────────────────────────────── */

  var script = document.currentScript ||
    (function () {
      var scripts = document.querySelectorAll('script[data-client-id]');
      return scripts[scripts.length - 1] || null;
    })();

  if (!script) {
    console.error('[SUS OneTap] No se encontró el script con data-client-id');
    return;
  }

  var cfg = {
    clientId: script.getAttribute('data-client-id'),
    redirectUri: script.getAttribute('data-redirect-uri'),
    scope: script.getAttribute('data-scope') || 'openid profile',
    usePkce: script.getAttribute('data-use-pkce') !== 'false',
    auto: script.getAttribute('data-auto') === 'true',
    position: script.getAttribute('data-position') || 'bottom-right',
    callback: script.getAttribute('data-callback') || null,
  };

  if (!cfg.clientId || !cfg.redirectUri) {
    console.error('[SUS OneTap] data-client-id y data-redirect-uri son obligatorios');
    return;
  }

  var SDK_ORIGIN = new URL(script.src).origin;
  var FRAME_URL = SDK_ORIGIN + '/sdk/onetap-frame.html';

  /* ── Device detection ───────────────────────────────────── */

  function isMobile() {
    return window.matchMedia('(max-width: 600px)').matches ||
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  /* ── State ──────────────────────────────────────────────── */

  var user = null;
  var expanded = false;
  var autoShown = false;
  var frameEl = null;
  var ready = false;
  var els = {};
  var touchStartY = 0;
  var sheetCurrentY = 0;

  /* ── Crypto helpers ─────────────────────────────────────── */

  function b64url(buf) {
    var bytes = new Uint8Array(buf);
    var bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function randomString(len) {
    var arr = new Uint8Array(Math.ceil(len * 3 / 4) + 4);
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
    // FIXED: allow-same-origin + allow-scripts 
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

    var changed = (!prev && user) || (prev && !user) ||
      (prev && user && (prev.name !== user.name || prev.image !== user.image));

    if (changed) {
      // FIXED: syncWidget era llamado antes de ready en race condition
      if (ready) {
        syncWidget();
      }
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
      var verifier = randomString(43);
      var challenge = await sha256Challenge(verifier);
      sessionStorage.setItem('__sus_tap_v', verifier);
      url.searchParams.set('code_challenge', challenge);
      url.searchParams.set('code_challenge_method', 'S256');
    }

    var state = randomString(32);
    sessionStorage.setItem('__sus_tap_s', state);
    url.searchParams.set('state', state);

    if (cfg.callback && typeof window[cfg.callback] === 'function') {
      try {
        window[cfg.callback]({
          user: user ? { name: user.name, image: user.image } : null,
          authorizeUrl: url.toString(),
        });
      } catch (_) { }
    }

    window.location.href = url.toString();
  }

  /* ── Widget sync ────────────────────────────────────────── */

  function syncWidget() {
    if (!ready) return;
    if (!user) {
      setDisplay(false);
      return;
    }
    setDisplay(true);

    var name = user.name || 'Usuario';

    if (els.avatar) {
      els.avatar.src = user.image || '';
      els.avatar.alt = name;
    }
    if (els.name) els.name.textContent = name;
    if (els.btnText) els.btnText.textContent = 'Continuar como ' + name;

    // Sheet-specific elements
    if (els.sheetAvatar) {
      els.sheetAvatar.src = user.image || '';
      els.sheetAvatar.alt = name;
    }
    if (els.sheetName) els.sheetName.textContent = name;
    if (els.sheetBtnText) els.sheetBtnText.textContent = 'Continuar como ' + name;

    // FIXED: auto solo abre una vez por sesión de página
    if (cfg.auto && !autoShown) {
      autoShown = true;
      setTimeout(function () { toggle(true); }, 600);
    }
  }

  function setDisplay(show) {
    if (els.wrap) els.wrap.style.display = show ? '' : 'none';
  }

  /* ── Desktop: FAB + card ────────────────────────────────── */

  function toggle(force) {
    expanded = typeof force === 'boolean' ? force : !expanded;
    if (els.card) {
      els.card.style.opacity = expanded ? '1' : '0';
      els.card.style.pointerEvents = expanded ? 'auto' : 'none';
      els.card.style.transform = expanded
        ? 'translateY(0) scale(1)'
        : 'translateY(8px) scale(0.95)';
    }
    if (els.btnFab) {
      els.btnFab.style.transform = expanded ? 'scale(0.85)' : 'scale(1)';
      els.btnFab.style.opacity = expanded ? '0.5' : '1';
    }
  }

  function buildDesktop() {
    els.wrap = el('div', {
      position: 'fixed',
      bottom: '20px',
      [cfg.position === 'bottom-left' ? 'left' : 'right']: '20px',
      zIndex: '2147483647',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      display: 'none',
    });
    els.wrap.setAttribute('dir', 'ltr');

    // FAB
    els.btnFab = el('button', {
      width: '56px',
      height: '56px',
      borderRadius: '50%',
      border: 'none',
      cursor: 'pointer',
      background: 'linear-gradient(135deg, #9146FF 0%, #772ce8 100%)',
      boxShadow: '0 4px 24px rgba(145,70,255,0.4)',
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
      if (!expanded) els.btnFab.style.boxShadow = '0 4px 24px rgba(145,70,255,0.4)';
    };
    els.btnFab.onclick = function (e) { e.stopPropagation(); toggle(); };

    // Card
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
      boxShadow: '0 12px 48px rgba(0,0,0,0.6)',
      padding: '20px',
      opacity: '0',
      pointerEvents: 'none',
      transform: 'translateY(8px) scale(0.95)',
      transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
    });
    els.card.onclick = function (e) { e.stopPropagation(); };

    var closeBtn = el('button', {
      position: 'absolute', top: '12px', right: '12px',
      width: '28px', height: '28px',
      borderRadius: '8px', border: 'none',
      background: 'rgba(255,255,255,0.06)',
      cursor: 'pointer', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      transition: 'background 0.15s', padding: '0',
    });
    closeBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>';
    closeBtn.onmouseenter = function () { closeBtn.style.background = 'rgba(255,255,255,0.12)'; };
    closeBtn.onmouseleave = function () { closeBtn.style.background = 'rgba(255,255,255,0.06)'; };
    closeBtn.onclick = function (e) { e.stopPropagation(); toggle(false); };

    var header = el('div', {
      display: 'flex', alignItems: 'center',
      gap: '12px', marginBottom: '16px', paddingRight: '28px',
    });

    els.avatar = el('img', {
      width: '44px', height: '44px',
      borderRadius: '50%', objectFit: 'cover',
      border: '2px solid rgba(145,70,255,0.4)', flexShrink: '0',
    });
    els.avatar.alt = '';

    var nameWrap = el('div', { minWidth: '0', flex: '1' });
    els.name = el('div', {
      fontSize: '15px', fontWeight: '600', color: '#fff',
      whiteSpace: 'nowrap', overflow: 'hidden',
      textOverflow: 'ellipsis', lineHeight: '1.3',
    });
    var subtitle = el('div', { fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '1px' });
    subtitle.textContent = 'Sesión activa detectada';
    nameWrap.appendChild(els.name);
    nameWrap.appendChild(subtitle);
    header.appendChild(els.avatar);
    header.appendChild(nameWrap);

    var divider = el('div', { height: '1px', background: 'rgba(255,255,255,0.06)', margin: '0 0 16px' });

    var ctaBtn = el('button', {
      width: '100%', height: '44px', borderRadius: '12px',
      border: 'none',
      background: 'linear-gradient(135deg, #9146FF 0%, #772ce8 100%)',
      color: '#fff', fontSize: '14px', fontWeight: '600',
      fontFamily: 'inherit', cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: '8px', transition: 'all 0.2s',
      boxShadow: '0 2px 12px rgba(145,70,255,0.3)',
    });
    els.btnText = el('span');
    ctaBtn.appendChild(els.btnText);
    ctaBtn.insertAdjacentHTML('beforeend', '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>');
    ctaBtn.onmouseenter = function () {
      ctaBtn.style.background = 'linear-gradient(135deg, #a566ff 0%, #9146FF 100%)';
      ctaBtn.style.boxShadow = '0 4px 20px rgba(145,70,255,0.5)';
    };
    ctaBtn.onmouseleave = function () {
      ctaBtn.style.background = 'linear-gradient(135deg, #9146FF 0%, #772ce8 100%)';
      ctaBtn.style.boxShadow = '0 2px 12px rgba(145,70,255,0.3)';
    };
    ctaBtn.onclick = function (e) { e.stopPropagation(); redirectToAuth(); };

    var footer = el('div', {
      textAlign: 'center', marginTop: '12px',
      fontSize: '11px', color: 'rgba(255,255,255,0.25)',
    });
    footer.textContent = 'Powered by SaltoUruguayServer';

    els.card.appendChild(closeBtn);
    els.card.appendChild(header);
    els.card.appendChild(divider);
    els.card.appendChild(ctaBtn);
    els.card.appendChild(footer);
    els.wrap.appendChild(els.card);
    els.wrap.appendChild(els.btnFab);

    document.addEventListener('click', function () { if (expanded) toggle(false); });
  }

  /* ── Mobile: bottom sheet (Google One Tap style) ─────────── */

  function buildMobile() {
    // Backdrop
    els.backdrop = el('div', {
      position: 'fixed', inset: '0',
      background: 'rgba(0,0,0,0)',
      zIndex: '2147483646',
      transition: 'background 0.3s',
      pointerEvents: 'none',
    });
    document.documentElement.appendChild(els.backdrop);

    // Sheet wrapper (outer = positions bottom:0, inner = the white card)
    els.wrap = el('div', {
      position: 'fixed',
      left: '0', right: '0', bottom: '0',
      zIndex: '2147483647',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      display: 'none',
    });
    els.wrap.setAttribute('dir', 'ltr');

    els.sheet = el('div', {
      background: '#fff',
      borderRadius: '20px 20px 0 0',
      padding: '0 0 env(safe-area-inset-bottom, 12px)',
      boxShadow: '0 -4px 32px rgba(0,0,0,0.18)',
      transform: 'translateY(100%)',
      transition: 'transform 0.35s cubic-bezier(0.32,0.72,0,1)',
      willChange: 'transform',
      userSelect: 'none',
    });

    // Drag handle
    var handle = el('div', {
      width: '36px', height: '4px',
      background: '#e0e0e0',
      borderRadius: '2px',
      margin: '12px auto 0',
    });

    // Brand header row
    var brand = el('div', {
      display: 'flex', alignItems: 'center',
      padding: '16px 20px 0',
      gap: '8px',
    });
    var brandLogo = el('span', { lineHeight: '1' });
    brandLogo.innerHTML = susLogoSvg(20, '#9146FF');
    var brandName = el('span', {
      fontSize: '13px', fontWeight: '600',
      color: '#9146FF', letterSpacing: '0.01em',
    });
    brandName.textContent = 'SaltoUruguayServer';
    brand.appendChild(brandLogo);
    brand.appendChild(brandName);

    // Close button (top-right)
    var closeBtn = el('button', {
      position: 'absolute', top: '12px', right: '12px',
      width: '32px', height: '32px',
      borderRadius: '50%', border: 'none',
      background: '#f1f1f1',
      cursor: 'pointer', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      padding: '0',
    });
    closeBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>';
    closeBtn.onclick = function (e) { e.stopPropagation(); sheetClose(); };

    // User info block
    var userRow = el('div', {
      display: 'flex', alignItems: 'center',
      padding: '20px 20px 4px', gap: '14px',
    });
    els.sheetAvatar = el('img', {
      width: '52px', height: '52px',
      borderRadius: '50%', objectFit: 'cover',
      border: '2px solid #e8e0fc', flexShrink: '0',
    });
    els.sheetAvatar.alt = '';

    var userInfo = el('div', { minWidth: '0', flex: '1' });
    els.sheetName = el('div', {
      fontSize: '16px', fontWeight: '600',
      color: '#111', lineHeight: '1.35',
      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    });
    var sheetSub = el('div', {
      fontSize: '13px', color: '#777', marginTop: '2px',
    });
    sheetSub.textContent = 'Sesión activa · toca para continuar';
    userInfo.appendChild(els.sheetName);
    userInfo.appendChild(sheetSub);
    userRow.appendChild(els.sheetAvatar);
    userRow.appendChild(userInfo);

    // CTA button
    var ctaWrap = el('div', { padding: '16px 20px 4px' });
    var ctaBtn = el('button', {
      width: '100%', height: '52px',
      borderRadius: '14px', border: 'none',
      background: 'linear-gradient(135deg, #9146FF 0%, #772ce8 100%)',
      color: '#fff', fontSize: '15px', fontWeight: '600',
      fontFamily: 'inherit', cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: '8px',
      WebkitTapHighlightColor: 'transparent',
    });
    els.sheetBtnText = el('span');
    ctaBtn.appendChild(els.sheetBtnText);
    ctaBtn.insertAdjacentHTML('beforeend', '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>');
    ctaBtn.addEventListener('touchend', function (e) {
      e.preventDefault();
      redirectToAuth();
    });
    ctaBtn.onclick = function () { redirectToAuth(); };
    ctaWrap.appendChild(ctaBtn);

    // Policy footer
    var policy = el('div', {
      textAlign: 'center', padding: '12px 20px 8px',
      fontSize: '11px', color: '#aaa', lineHeight: '1.5',
    });
    policy.textContent = 'Al continuar, aceptas los Términos de Servicio de SaltoUruguayServer.';

    // Assemble sheet
    els.sheet.style.position = 'relative';
    els.sheet.appendChild(handle);
    els.sheet.appendChild(closeBtn);
    els.sheet.appendChild(brand);
    els.sheet.appendChild(userRow);
    els.sheet.appendChild(ctaWrap);
    els.sheet.appendChild(policy);
    els.wrap.appendChild(els.sheet);

    // Swipe-to-dismiss
    els.sheet.addEventListener('touchstart', onTouchStart, { passive: true });
    els.sheet.addEventListener('touchmove', onTouchMove, { passive: false });
    els.sheet.addEventListener('touchend', onTouchEnd, { passive: true });

    // Backdrop tap-to-dismiss
    els.backdrop.addEventListener('click', function () { sheetClose(); });
  }

  /* ── Sheet open / close ─────────────────────────────────── */

  function sheetOpen() {
    if (expanded) return;
    expanded = true;
    setDisplay(true);
    // Force reflow before animating
    els.sheet.getBoundingClientRect();
    els.sheet.style.transform = 'translateY(0)';
    els.backdrop.style.background = 'rgba(0,0,0,0.45)';
    els.backdrop.style.pointerEvents = 'auto';
    document.body.style.overflow = 'hidden';
  }

  function sheetClose() {
    if (!expanded) return;
    expanded = false;
    els.sheet.style.transition = 'transform 0.3s cubic-bezier(0.32,0.72,0,1)';
    els.sheet.style.transform = 'translateY(100%)';
    els.backdrop.style.background = 'rgba(0,0,0,0)';
    els.backdrop.style.pointerEvents = 'none';
    document.body.style.overflow = '';
    sheetCurrentY = 0;
  }

  /* ── Swipe gestures ─────────────────────────────────────── */

  function onTouchStart(e) {
    touchStartY = e.touches[0].clientY;
    sheetCurrentY = 0;
    els.sheet.style.transition = 'none';
  }

  function onTouchMove(e) {
    var dy = e.touches[0].clientY - touchStartY;
    if (dy < 0) return;
    sheetCurrentY = dy;
    els.sheet.style.transform = 'translateY(' + dy + 'px)';
    var progress = Math.min(dy / 200, 1);
    els.backdrop.style.background = 'rgba(0,0,0,' + (0.45 * (1 - progress)) + ')';
    e.preventDefault();
  }

  function onTouchEnd() {
    els.sheet.style.transition = 'transform 0.3s cubic-bezier(0.32,0.72,0,1)';
    if (sheetCurrentY > 100) {
      sheetClose();
    } else {
      els.sheet.style.transform = 'translateY(0)';
      els.backdrop.style.background = 'rgba(0,0,0,0.45)';
      sheetCurrentY = 0;
    }
  }

  /* ── Override toggle for mobile ─────────────────────────── */

  function toggle(force) {
    if (isMobile()) {
      var open = typeof force === 'boolean' ? force : !expanded;
      open ? sheetOpen() : sheetClose();
    } else {
      expanded = typeof force === 'boolean' ? force : !expanded;
      if (els.card) {
        els.card.style.opacity = expanded ? '1' : '0';
        els.card.style.pointerEvents = expanded ? 'auto' : 'none';
        els.card.style.transform = expanded
          ? 'translateY(0) scale(1)'
          : 'translateY(8px) scale(0.95)';
      }
      if (els.btnFab) {
        els.btnFab.style.transform = expanded ? 'scale(0.85)' : 'scale(1)';
        els.btnFab.style.opacity = expanded ? '0.5' : '1';
      }
    }
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
    if (isMobile()) {
      buildMobile();
    } else {
      buildDesktop();
    }
    document.documentElement.appendChild(els.wrap);
    ready = true;
    // FIXED: re-run syncWidget ahora que ready=true, en caso de que el
    // mensaje del frame ya haya llegado antes
    if (user) syncWidget();
    createFrame();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();