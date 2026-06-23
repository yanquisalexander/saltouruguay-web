; (function () {
  'use strict';

  if (window.__sus_onetap) return;
  window.__sus_onetap = true;

  /* ── Config ─────────────────────────────────────────────── */

  var script = (function () {
    var scripts = document.querySelectorAll('script[data-client-id]');
    return scripts[scripts.length - 1] || document.currentScript || null;
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
    customAuth: script.getAttribute('data-custom-auth') === 'true',
    auto: script.getAttribute('data-auto') === 'true',
    position: script.getAttribute('data-position') || 'bottom-right',
    callback: script.getAttribute('data-callback') || null,
  };

  if (!cfg.customAuth) {
    if (!cfg.clientId || !cfg.redirectUri) {
      console.error('[SUS OneTap] data-client-id y data-redirect-uri son obligatorios');
      return;
    }
  }

  var SDK_ORIGIN = new URL(script.src).origin;
  var FRAME_URL = SDK_ORIGIN + '/sdk/onetap-frame.html';

  /* ── Assets ──────────────────────────────────────────────── */

  var ARROW_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>';
  var SPINNER_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation: sus-spin .8s linear infinite"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>';

  function addSpinnerStyle() {
    var s = document.createElement('style');
    s.textContent = '@keyframes sus-spin{to{transform:rotate(360deg)}}';
    document.head.appendChild(s);
  }

  /* ── Device detection ───────────────────────────────────── */

  function isMobile() {
    return window.matchMedia('(max-width: 600px)').matches ||
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  /* ── State ──────────────────────────────────────────────── */

  var user = null;
  var frameEl = null;
  var ready = false;
  var els = {};

  /* ── Popup management (PKCE mode) ──────────────────────── */

  var currentPopup = null;
  var popupPollId = null;
  var currentVerifier = null;
  var popupInProgress = false;
  var POLL_MIN = 2000;
  var POLL_MAX = 10000;
  var AUTH_EVENT_TIMEOUT = 8000;

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

    // Popup message: popup is ready for verifier
    if (e.data.__sus_tap_popup_ready && currentPopup) {
      currentPopup.postMessage({
        __sus_tap_verifier: currentVerifier || ''
      }, SDK_ORIGIN);
      return;
    }

    // Popup message: token received
    if (e.data.__sus_tap_token) {
      cleanupPopup();
      if (cfg.callback && typeof window[cfg.callback] === 'function') {
        try {
          window[cfg.callback]({
            user: user ? { name: user.name, image: user.image } : null,
            accessToken: e.data.__sus_tap_token
          });
        } catch (_) {}
      }
      return;
    }

    // Popup message: error from popup
    if (e.data.__sus_tap_popup_error) {
      cleanupPopup();
      if (cfg.callback && typeof window[cfg.callback] === 'function') {
        try {
          window[cfg.callback]({
            user: null,
            error: e.data.__sus_tap_popup_error,
            error_description: e.data.error_description || ''
          });
        } catch (_) {}
      }
      return;
    }

    // Session check message from iframe
    var prev = user;
    user = e.data.user || null;

    var changed = (!prev && user) || (prev && !user) ||
      (prev && user && (prev.name !== user.name || prev.image !== user.image));

    if (changed && ready) {
      syncWidget();
    }
  }

  window.addEventListener('message', onMessage);

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

  /* ── OAuth flow ───────────────────────────────────────── */

  function redirectToAuth() {
    if (cfg.usePkce) {
      return redirectPkcePopup();
    }
    redirectServerSide();
  }

  /* ── Server-side redirect (modo 1) ────────────────────── */

  function redirectServerSide() {
    var url = new URL(SDK_ORIGIN + '/oauth/authorize');
    url.searchParams.set('client_id', cfg.clientId);
    url.searchParams.set('redirect_uri', cfg.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', cfg.scope);

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

  /* ── PKCE popup (modo 2) ───────────────────────────────── */

  function redirectPkcePopup() {
    if (popupInProgress) return; // Prevent rapid double-clicks
    popupInProgress = true;

    // Cancel any existing popup
    cleanupPopup();

    // Generate PKCE pair
    var verifier = randomString(43);
    currentVerifier = verifier;

    sha256Challenge(verifier).then(function (challenge) {
      popupInProgress = false;

      var popupUrl = new URL(SDK_ORIGIN + '/sdk/pkce-callback.html');
      popupUrl.searchParams.set('mode', 'pkce');
      popupUrl.searchParams.set('client_id', cfg.clientId);
      popupUrl.searchParams.set('challenge', challenge);
      popupUrl.searchParams.set('scope', cfg.scope);

      // Notify callback before opening popup
      if (cfg.callback && typeof window[cfg.callback] === 'function') {
        try {
          window[cfg.callback]({
            user: user ? { name: user.name, image: user.image } : null,
            authorizeUrl: popupUrl.toString(),
          });
        } catch (_) {}
      }

      // Open popup
      currentPopup = window.open(
        popupUrl.toString(),
        'sus_pkce_popup',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      // Detect if popup was blocked
      if (!currentPopup || currentPopup.closed || typeof currentPopup.closed === 'undefined') {
        cleanupPopup();
        // Fallback to redirect (modo 1)
        redirectServerSide();
        return;
      }

      // Start polling for popup closure (Firebase pattern)
      pollPopupClosed();
    }).catch(function () {
      popupInProgress = false;
      cleanupPopup();
    });
  }

  /* ── Popup lifecycle (Firebase pattern) ────────────────── */

  function pollPopupClosed() {
    if (!currentPopup) return;

    if (currentPopup.closed) {
      // Grace period: popup might be in redirect, wait before
      // declaring it closed by user
      popupPollId = setTimeout(function () {
        if (!currentPopup || currentPopup.closed) {
          cleanupPopup();
          if (cfg.callback && typeof window[cfg.callback] === 'function') {
            try {
              window[cfg.callback]({
                user: null,
                error: 'popup_closed_by_user'
              });
            } catch (_) {}
          }
        }
      }, AUTH_EVENT_TIMEOUT);
      return;
    }

    var delay = Math.min(POLL_MAX, Math.max(POLL_MIN, 2000));
    popupPollId = setTimeout(pollPopupClosed, delay);
  }

  function cleanupPopup() {
    popupInProgress = false;
    if (popupPollId) {
      clearTimeout(popupPollId);
      popupPollId = null;
    }
    if (currentPopup && !currentPopup.closed) {
      try { currentPopup.close(); } catch (_) {}
    }
    currentPopup = null;
    currentVerifier = null;
  }

  /* ── Custom auth helper ────────────────────────────────── */

  function setCtaLoading(loading) {
    var btns = [];
    if (els.ctaBtn) btns.push({ btn: els.ctaBtn, text: els.btnText });
    if (els.sheetCtaBtn) btns.push({ btn: els.sheetCtaBtn, text: els.sheetBtnText });

    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      if (loading) {
        b.btn.disabled = true;
        b.btn.style.cursor = 'wait';
        b.btn.style.opacity = '0.7';
        if (b.text) b.text.textContent = 'Cargando...';
        // Replace last child (arrow SVG) with spinner
        var last = b.btn.lastElementChild;
        if (last && last.tagName === 'svg') {
          last.outerHTML = SPINNER_SVG;
        }
      } else {
        b.btn.disabled = false;
        b.btn.style.cursor = 'pointer';
        b.btn.style.opacity = '1';
        var name = (user && user.name) || 'Usuario';
        if (b.text) b.text.textContent = 'Continuar como ' + name;
        // Replace spinner with arrow
        var last = b.btn.lastElementChild;
        if (last && last.tagName === 'svg') {
          last.outerHTML = ARROW_SVG;
        }
      }
    }
  }

  function handleCtaClick() {
    if (cfg.customAuth && cfg.callback && typeof window[cfg.callback] === 'function') {
      setCtaLoading(true);
      try {
        var result = window[cfg.callback]({
          user: user ? { name: user.name, image: user.image } : null,
        });
        if (result && typeof result.then === 'function') {
          result.then(function () { setCtaLoading(false); }).catch(function () { setCtaLoading(false); });
        } else {
          setTimeout(function () { setCtaLoading(false); }, 2000);
        }
      } catch (_) {
        setCtaLoading(false);
      }
      return;
    }
    redirectToAuth();
  }

  function syncWidget() {
    if (!ready) return;
    if (!user) {
      setDisplay(false);
      return;
    }
    setDisplay(true);

    var name = user.name || 'Usuario';

    // Desktop elements
    if (els.avatar) {
      els.avatar.src = user.image || '';
      els.avatar.alt = name;
    }
    if (els.name) els.name.textContent = name;
    if (els.btnText) els.btnText.textContent = 'Continuar como ' + name;

    // Mobile elements
    if (els.sheetAvatar) {
      els.sheetAvatar.src = user.image || '';
      els.sheetAvatar.alt = name;
    }
    if (els.sheetName) els.sheetName.textContent = name;
    if (els.sheetBtnText) els.sheetBtnText.textContent = 'Continuar como ' + name;

    // Auto-slide mobile sheet up
    if (isMobile() && els.sheet && !els._sheetOpen) {
      els._sheetOpen = true;
      requestAnimationFrame(function () {
        els.sheet.style.transform = 'translateY(0)';
        if (els.backdrop) {
          els.backdrop.style.background = 'rgba(0,0,0,0.45)';
          els.backdrop.style.pointerEvents = 'auto';
        }
        document.body.style.overflow = 'hidden';
      });
    }
  }

  function setDisplay(show) {
    if (els.wrap) els.wrap.style.display = show ? '' : 'none';
    if (!show && isMobile() && els.backdrop) {
      els.backdrop.style.background = 'rgba(0,0,0,0)';
      els.backdrop.style.pointerEvents = 'none';
      document.body.style.overflow = '';
    }
  }

  /* ── Desktop: card sin FAB ──────────────────────────────── */

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

    els.card = el('div', {
      width: '320px',
      background: 'rgba(12,12,14,0.96)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderRadius: '16px',
      border: '1px solid rgba(255,255,255,0.08)',
      boxShadow: '0 12px 48px rgba(0,0,0,0.6)',
      padding: '20px',
    });

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
    closeBtn.onclick = function (e) { e.stopPropagation(); setDisplay(false); };

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
    subtitle.textContent = 'Sesión activa';
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
    ctaBtn.insertAdjacentHTML('beforeend', ARROW_SVG);
    ctaBtn.onmouseenter = function () {
      ctaBtn.style.background = 'linear-gradient(135deg, #a566ff 0%, #9146FF 100%)';
      ctaBtn.style.boxShadow = '0 4px 20px rgba(145,70,255,0.5)';
    };
    ctaBtn.onmouseleave = function () {
      ctaBtn.style.background = 'linear-gradient(135deg, #9146FF 0%, #772ce8 100%)';
      ctaBtn.style.boxShadow = '0 2px 12px rgba(145,70,255,0.3)';
    };
    ctaBtn.onclick = function (e) { e.stopPropagation(); handleCtaClick(); };
    els.ctaBtn = ctaBtn;

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
  }

  /* ── Mobile: bottom sheet oscuro ────────────────────────── */

  function buildMobile() {
    els.backdrop = el('div', {
      position: 'fixed', inset: '0',
      background: 'rgba(0,0,0,0)',
      zIndex: '2147483646',
      transition: 'background 0.3s',
      pointerEvents: 'none',
    });
    document.documentElement.appendChild(els.backdrop);

    els.wrap = el('div', {
      position: 'fixed',
      left: '0', right: '0', bottom: '0',
      zIndex: '2147483647',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      display: 'none',
    });
    els.wrap.setAttribute('dir', 'ltr');

    els.sheet = el('div', {
      background: '#1a1a1e',
      borderRadius: '20px 20px 0 0',
      padding: '0 0 env(safe-area-inset-bottom, 12px)',
      boxShadow: '0 -4px 32px rgba(0,0,0,0.4)',
      transform: 'translateY(100%)',
      transition: 'transform 0.35s cubic-bezier(0.32,0.72,0,1)',
      willChange: 'transform',
    });

    var handle = el('div', {
      width: '36px', height: '4px',
      background: 'rgba(255,255,255,0.15)',
      borderRadius: '2px',
      margin: '12px auto 0',
    });

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

    var closeBtn = el('button', {
      position: 'absolute', top: '12px', right: '12px',
      width: '32px', height: '32px',
      borderRadius: '50%', border: 'none',
      background: 'rgba(255,255,255,0.08)',
      cursor: 'pointer', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      padding: '0',
    });
    closeBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>';
    closeBtn.onclick = function () { setDisplay(false); };

    var userRow = el('div', {
      display: 'flex', alignItems: 'center',
      padding: '20px 20px 4px', gap: '14px',
    });
    els.sheetAvatar = el('img', {
      width: '52px', height: '52px',
      borderRadius: '50%', objectFit: 'cover',
      border: '2px solid rgba(145,70,255,0.4)', flexShrink: '0',
    });
    els.sheetAvatar.alt = '';

    var userInfo = el('div', { minWidth: '0', flex: '1' });
    els.sheetName = el('div', {
      fontSize: '16px', fontWeight: '600',
      color: '#fff', lineHeight: '1.35',
      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    });
    var sheetSub = el('div', {
      fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginTop: '2px',
    });
    sheetSub.textContent = 'Sesión activa';
    userInfo.appendChild(els.sheetName);
    userInfo.appendChild(sheetSub);
    userRow.appendChild(els.sheetAvatar);
    userRow.appendChild(userInfo);

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
    ctaBtn.insertAdjacentHTML('beforeend', ARROW_SVG);
    ctaBtn.onclick = function () { handleCtaClick(); };
    els.sheetCtaBtn = ctaBtn;
    ctaWrap.appendChild(ctaBtn);

    var policy = el('div', {
      textAlign: 'center', padding: '12px 20px 8px',
      fontSize: '11px', color: 'rgba(255,255,255,0.3)', lineHeight: '1.5',
    });
    policy.textContent = 'Al continuar, aceptas los Términos de Servicio de SaltoUruguayServer.';

    els.sheet.style.position = 'relative';
    els.sheet.appendChild(handle);
    els.sheet.appendChild(closeBtn);
    els.sheet.appendChild(brand);
    els.sheet.appendChild(userRow);
    els.sheet.appendChild(ctaWrap);
    els.sheet.appendChild(policy);
    els.wrap.appendChild(els.sheet);

    // Tap backdrop to dismiss
    els.backdrop.addEventListener('click', function () { setDisplay(false); });
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
    addSpinnerStyle();
    if (isMobile()) {
      buildMobile();
    } else {
      buildDesktop();
    }
    document.documentElement.appendChild(els.wrap);
    ready = true;
    if (user) syncWidget();
    createFrame();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
