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
    '#mainHeader [data-open="#searchBox"]',
    /* footer menu -- same four destinations as the header */
    '#f-links a'
  ].join(',');

  /* Anchors that drive a control rather than navigate: the country and
     language pickers are <a href="#"> handled by the theme's own JS. */
  const FUNCTIONAL = 'localization-form, .localization-list, #languageBox, #countryBox';

  /* Pages that are written and stay reachable from body copy -- one policy
     page linking to another, or a link inside a section on the home page,
     which otherwise lets nothing through. Everything under /policies/ is
     Shopify's own set.

     This does NOT override the lists above: a header or footer menu link is
     held back whatever it points at, so the navigation reads as uniformly
     unfinished rather than half-open. */
  const READY_PATHS = [
    '/pages/privacy-policy',
    '/pages/terms-and-conditions',
    '/pages/shipping-policy',
    '/pages/contact-us'
  ];

  const isReady = (anchor) => {
    let url;
    try {
      url = new URL(anchor.href, window.location.href);
    } catch (error) {
      return false;
    }
    /* Locale-prefixed paths (/en-in/pages/...) end in the same handle. */
    const path = url.pathname.replace(/\/$/, '');
    if (path.indexOf('/policies/') !== -1) return true;
    return READY_PATHS.some((ready) => path.endsWith(ready));
  };

  /* On the home page nothing may navigate away at all: product cards,
     category cards, the hero button, the footer links and the Shopify
     credit all raise the popup instead. In-page anchors (#), and links
     back to the home page itself, are left working. */
  const IS_HOME = document.body.getAttribute('coretex-page') === 'index';

  const leavesPage = (anchor) => {
    const href = anchor.getAttribute('href');
    /* No href at all: a category card whose block has no collection
       assigned renders as a bare <a> (see custom-shop-by-category.liquid),
       which otherwise does nothing whatsoever when clicked. href="" merely
       reloads the page. Both are dead ends -- show the popup. */
    if (href === null || href === '') return true;
    /* href="#" is a placeholder that just jumps to the top of the page --
       treat it as a dead end too, unless it belongs to a control. A real
       in-page anchor (#mainContent) is left alone. */
    if (href === '#') return !anchor.closest(FUNCTIONAL);
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

    /* The header and footer menus are held back first and unconditionally,
       on every page and whatever the link points at. Sitting above the ready
       check means the navigation never has one live entry among the held
       ones, which is what made it read as broken rather than unfinished. */
    if (event.target.closest(NOT_READY)) return true;

    /* Everywhere else, a finished page opens normally. */
    const link = event.target.closest('a[href]');
    if (link && isReady(link)) return false;

    if (!IS_HOME) return false;

    /* The category carousel fires a click after a drag. It suppresses that
       click itself, but in its own capture listener -- which runs after
       this one, since this is bound on document. Read the drag distance it
       records so a swipe scrolls the row instead of raising the popup. */
    const slider = event.target.closest('sbc-slider');
    if (slider && slider.moved > 6) return false;

    const anchor = event.target.closest('a');
    return Boolean(anchor) && leavesPage(anchor);
  };

  const intercept = (event) => {
    if (!wanted(event)) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    open();
  };

  document.addEventListener('click', intercept, true);
  /* Middle-click and "open in new tab" raise auxclick, not click, and would
     otherwise sail straight past the popup into the unfinished page. */
  document.addEventListener('auxclick', intercept, true);
})();
