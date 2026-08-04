/* ==========================================================================
   "Coming soon" popup for header entry points that are not ready yet.

   Catches, in the desktop header and the mobile drawer:
     - every primary menu link (Collections, Craft, About, FAQ)
     - the Log in / Register links
     - the Search button

   The logo still goes home, and the hamburger still opens the drawer --
   only the navigation itself is held back. Drop a selector from NOT_READY
   below to let that entry point through once its page is ready.

   The click is caught in the capture phase and stopped there, so the
   theme's own handlers (the search dialog opener, the mobile drawer's
   navigation) never run.
   ========================================================================== */
(() => {
  const NOT_READY = [
    /* primary menu, desktop + mobile drawer */
    '#mainHeader .menu a',
    '#mainHeader ul[menu-list] a',
    '#mobmenu nav a',
    /* account */
    '#mainHeader a[href*="customer_authentication"]',
    '#mobmenu a[href*="customer_authentication"]',
    '#mobmenu a[href*="/account"]',
    '#mobmenu .quicks a',
    /* search */
    '#mainHeader [data-open="#searchBox"]'
  ].join(',');

  const STYLES = `
    dialog.bh-soon {
      border: 1px solid #000;
      border-radius: 0;
      padding: 0;
      width: min(92vw, 420px);
      background: #fff;
      color: #000;
      font-family: "IBM Plex Sans", sans-serif;
    }
    dialog.bh-soon::backdrop { background: rgba(0, 0, 0, 0.45); }
    .bh-soon__inner { padding: 28px 24px 24px; text-align: center; }
    .bh-soon__title {
      font-family: "ivypresto-display", serif;
      font-weight: 100;
      font-size: 32px;
      line-height: 1.1;
      letter-spacing: 0.02em;
      margin: 0 0 10px;
    }
    .bh-soon__text {
      font-size: 14px;
      line-height: 1.5;
      margin: 0 0 22px;
    }
    .bh-soon__ok {
      appearance: none;
      border: 1px solid #000;
      border-radius: 0;
      background: #000;
      color: #fff;
      font-family: inherit;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      padding: 12px 28px;
      cursor: pointer;
    }
    .bh-soon__close {
      position: absolute;
      top: 8px;
      right: 10px;
      appearance: none;
      border: 0;
      background: none;
      color: inherit;
      font-size: 22px;
      line-height: 1;
      padding: 4px 8px;
      cursor: pointer;
    }
  `;

  let dialog;

  const build = () => {
    const style = document.createElement('style');
    style.textContent = STYLES;
    document.head.appendChild(style);

    dialog = document.createElement('dialog');
    dialog.className = 'bh-soon';
    dialog.setAttribute('aria-labelledby', 'bhSoonTitle');
    dialog.innerHTML = `
      <button type="button" class="bh-soon__close" aria-label="Close">&times;</button>
      <div class="bh-soon__inner">
        <p class="bh-soon__title" id="bhSoonTitle">Coming soon</p>
        <p class="bh-soon__text">This page will be live soon. Thank you for your patience.</p>
        <button type="button" class="bh-soon__ok">Got it</button>
      </div>
    `;
    document.body.appendChild(dialog);

    dialog.querySelector('.bh-soon__close').addEventListener('click', () => dialog.close());
    dialog.querySelector('.bh-soon__ok').addEventListener('click', () => dialog.close());

    /* Click outside the panel closes it: on a <dialog>, clicks on the
       backdrop are reported with the dialog itself as the target. */
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });

    return dialog;
  };

  const open = () => {
    const el = dialog || build();
    /* The mobile menu is a popover in the top layer; close it so the
       dialog is not rendered behind it. */
    const drawer = document.getElementById('mobmenu');
    if (drawer && drawer.matches(':popover-open')) drawer.hidePopover();
    if (!el.open) el.showModal();
  };

  document.addEventListener('click', (event) => {
    const target = event.target.closest && event.target.closest(NOT_READY);
    if (!target) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    open();
  }, true);
})();
