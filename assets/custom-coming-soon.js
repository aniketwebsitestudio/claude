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

  /* On the home page nothing may navigate away at all: product cards,
     category cards, the hero button, the footer links and the Shopify
     credit all raise the popup instead. In-page anchors (#), and links
     back to the home page itself, are left working. */
  const IS_HOME = document.body.getAttribute('coretex-page') === 'index';

  const leavesPage = (anchor) => {
    const href = anchor.getAttribute('href');
    if (href === null) return false;
    /* href="" reloads the current page -- the hero CTA looks broken that
       way, so treat it as a dead end and show the popup. */
    if (href === '') return true;
    if (href.charAt(0) === '#') return false;
    let url;
    try {
      url = new URL(anchor.href, window.location.href);
    } catch (error) {
      return false;
    }
    const samePage = url.origin === window.location.origin &&
      url.pathname === window.location.pathname;
    return !samePage;
  };

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
      <div class="bh-soon__inner">
        <p class="bh-soon__title" id="bhSoonTitle">Coming soon</p>
        <p class="bh-soon__text">This page will be live soon. Thank you for your patience.</p>
        <button type="button" class="bh-soon__ok">Got it</button>
      </div>
    `;
    document.body.appendChild(dialog);

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

  const wanted = (event) => {
    if (!event.target.closest) return false;
    if (event.target.closest(NOT_READY)) return true;
    if (!IS_HOME) return false;
    const anchor = event.target.closest('a');
    return Boolean(anchor) && leavesPage(anchor);
  };

  document.addEventListener('click', (event) => {
    if (!wanted(event)) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    open();
  }, true);
})();
