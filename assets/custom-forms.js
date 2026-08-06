/* ==========================================================================
   Bhoomija styling for the Shopify Forms waitlist popup.

   The app renders inside <shopify-forms-embed>'s shadow root, so a normal
   stylesheet cannot reach it -- that is why the accent colour set in the
   app never reached the button. The shadow root is open, so we inject a
   <style> into it instead.

   Class names inside the app are hashed CSS modules
   (_formSubmitButton_jnbzb_106). The hash changes whenever Shopify rebuilds
   the app, so every selector matches on the stable middle segment via
   [class*="_name_"]. This is unsupported territory: if Shopify renames
   these internals the popup quietly reverts to its default look. Nothing
   breaks -- it just stops being branded.
   ========================================================================== */
(() => {
  const HOST = 'shopify-forms-embed';
  const PHOTO = 'https://cdn.shopify.com/s/files/1/0774/6987/6271/files/image_76_1.png?v=1785950178';
  const LOGO = 'https://cdn.shopify.com/s/files/1/0774/6987/6271/files/White_Bhoomija_Unit.png?v=1785257087';
  const STYLE_ID = 'bhoomija-forms-style';

  const CSS = `
    /* The app lays the popup out as a single column while no image is set,
       and its own rules are specific enough to need !important throughout. */
    [class*="_formContainer_"] {
      display: grid !important;
      grid-template-columns: 1fr 1fr !important;
      align-items: stretch !important;
      width: min(940px, 94vw) !important;
      max-width: none !important;
      border-radius: 0 !important;
      overflow: hidden !important;
      padding: 0 !important;
    }

    /* Left panel: photo as cover, wordmark centred on top. The logo is sized
       in px, not %, so it cannot scale with the cell and overflow. */
    [class*="_gridItem_"]:not([class*="_gridItemContent_"]) {
      display: block !important;
      min-height: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      background-image: url("${LOGO}"), url("${PHOTO}");
      background-repeat: no-repeat, no-repeat;
      background-position: center center, center center;
      background-size: 200px auto, cover;
    }

    [class*="_gridItemContent_"] {
      padding: 46px 44px 40px !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: center !important;
    }

    [class*="_formHeader_"] { margin: 0 0 26px !important; }

    [class*="_textHeading_"] {
      font-family: "ivypresto-display", serif !important;
      font-weight: 100 !important;
      font-size: 52px !important;
      line-height: 1.04 !important;
      letter-spacing: 0.02em !important;
      text-align: left !important;
      text-transform: none !important;
      margin: 0 0 12px !important;
      color: #000 !important;
    }
    [class*="_textHeading_"] em { font-style: italic !important; }

    [class*="_textBody_"],
    [class*="_textBody_"] p {
      font-family: "IBM Plex Sans", sans-serif !important;
      font-weight: 400 !important;
      font-size: 14px !important;
      line-height: 1.5 !important;
      text-align: left !important;
      color: #4a4a4a !important;
      margin: 0 !important;
    }

    /* Name, Email, Phone, button, disclaimer -- explicit order on every
       sibling. Ordering only the phone field left it behind the button,
       which still had the default order of 0. */
    form[class*="_formFieldset_"],
    shop-lead-capture,
    *:has(> [class*="_formPhoneInputContainer_"]) {
      display: flex !important;
      flex-direction: column !important;
      gap: 12px !important;
    }
    [class*="_formFieldContainer_"]:has(#first_name) { order: 1 !important; }
    [class*="_formFieldContainer_"]:has(#email) { order: 2 !important; }
    [class*="_formPhoneInputContainer_"] { order: 3 !important; margin: 0 !important; }
    [class*="_formSubmitButton_"] { order: 4 !important; }
    [class*="_formDisclaimer_"] { order: 5 !important; }

    [class*="_formInputField_"],
    [class*="_formPhoneInputField_"],
    [class*="_selectToggle_"] {
      border-radius: 0 !important;
      border: 1px solid #dcdcdc !important;
      font-family: "IBM Plex Sans", sans-serif !important;
      font-size: 14px !important;
      min-height: 46px !important;
      box-shadow: none !important;
    }
    [class*="_formInputField_"]:focus,
    [class*="_formPhoneInputField_"]:focus {
      border-color: #7F1416 !important;
      outline: none !important;
    }
    [class*="_formInputFieldLabel_"] {
      font-family: "IBM Plex Sans", sans-serif !important;
      font-size: 14px !important;
      color: #8a8a8a !important;
    }

    [class*="_formSubmitButton_"] {
      background: #7F1416 !important;
      color: #ffffff !important;
      border: 0 !important;
      border-radius: 0 !important;
      min-height: 48px !important;
      margin-top: 10px !important;
      font-family: "IBM Plex Sans", sans-serif !important;
      font-size: 12px !important;
      font-weight: 600 !important;
      letter-spacing: 0.06em !important;
      text-transform: uppercase !important;
    }

    [class*="_formDisclaimer_"],
    [class*="_formDisclaimer_"] p {
      font-family: "IBM Plex Sans", sans-serif !important;
      font-size: 11px !important;
      line-height: 1.45 !important;
      color: #6b6b6b !important;
      text-align: left !important;
      margin: 0 !important;
    }

    [class*="_formCloseButton_"] { color: #000 !important; }

    @media (max-width: 749px) {
      [class*="_formContainer_"] { grid-template-columns: 1fr !important; }
      [class*="_gridItem_"]:not([class*="_gridItemContent_"]) {
        min-height: 190px !important;
        background-size: 150px auto, cover;
      }
      [class*="_gridItemContent_"] { padding: 30px 24px 26px !important; }
      [class*="_textHeading_"] { font-size: 34px !important; }
    }
  `;

  /* "Join the waitlist" is one plain-text field in the app, and CSS cannot
     italicise a single word inside it -- so split it here. Rewriting only
     when the text still matches exactly keeps this from looping when our
     own change triggers the observer. */
  const splitHeading = (root) => {
    const heading = root.querySelector('[class*="_textHeading_"]');
    if (heading && /^\s*Join the waitlist\s*$/i.test(heading.textContent)) {
      heading.innerHTML = 'Join the<br><em>waitlist</em>';
    }
  };

  const paint = (root) => {
    if (!root) return;
    if (!root.getElementById(STYLE_ID)) {
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = CSS;
      root.appendChild(style);
    }
    splitHeading(root);
  };

  const seen = new WeakSet();

  const scan = () => {
    document.querySelectorAll(HOST).forEach((host) => {
      const root = host.shadowRoot;
      if (!root) return;
      paint(root);
      /* The app mounts the popup well after page load and re-renders it on
         open/close, which would drop our style node -- watch each shadow
         root and re-apply. */
      if (!seen.has(root)) {
        seen.add(root);
        new MutationObserver(() => paint(root)).observe(root, { childList: true, subtree: true });
      }
    });
  };

  scan();
  new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
})();
