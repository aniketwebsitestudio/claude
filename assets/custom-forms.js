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
    [class*="_formContainer_"] {
      max-width: 920px;
      border-radius: 0;
      overflow: hidden;
      grid-template-columns: 1fr 1fr !important;
    }

    /* The app has no image set, so this cell is empty and hidden. Paint the
       photo and the white wordmark into it as two background layers -- the
       logo sits centred on top of the cover photo. */
    [class*="_gridItem_"]:not([class*="_gridItemContent_"]) {
      display: block !important;
      min-height: 460px;
      background-image: url("${LOGO}"), url("${PHOTO}");
      background-repeat: no-repeat, no-repeat;
      background-position: center center, center center;
      background-size: 58% auto, cover;
    }

    [class*="_gridItemContent_"] { padding: 44px 40px 32px; }

    [class*="_textHeading_"] {
      font-family: "ivypresto-display", serif;
      font-weight: 100;
      font-size: 46px;
      line-height: 1.02;
      letter-spacing: 0.02em;
      text-align: left;
      margin: 0 0 10px;
    }
    [class*="_textHeading_"] em { font-style: italic; }

    [class*="_textBody_"],
    [class*="_textBody_"] p {
      font-family: "IBM Plex Sans", sans-serif;
      font-size: 14px;
      line-height: 1.5;
      letter-spacing: 0;
      text-align: left;
      color: #4a4a4a;
      margin: 0;
    }

    [class*="_formInputField_"],
    [class*="_formPhoneInputField_"],
    [class*="_selectToggle_"] {
      border-radius: 0 !important;
      border-color: #d9d9d9;
      font-family: "IBM Plex Sans", sans-serif;
      font-size: 14px;
      min-height: 48px;
    }
    [class*="_formInputFieldLabel_"] {
      font-family: "IBM Plex Sans", sans-serif;
      font-size: 14px;
    }

    [class*="_formSubmitButton_"] {
      background: #7F1416 !important;
      color: #ffffff !important;
      border: 0;
      border-radius: 0 !important;
      min-height: 48px;
      font-family: "IBM Plex Sans", sans-serif;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    [class*="_formDisclaimer_"],
    [class*="_formDisclaimer_"] p {
      font-family: "IBM Plex Sans", sans-serif;
      font-size: 11px;
      line-height: 1.45;
      color: #6b6b6b;
      text-align: left;
    }

    /* Mock order is Name, Email, Phone. The app currently renders the phone
       field second, so push it last from CSS as well -- whichever way the
       field list is saved, the rendered order matches the design. */
    *:has(> [class*="_formPhoneInputContainer_"]) {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    [class*="_formPhoneInputContainer_"] { order: 3; }

    @media (max-width: 749px) {
      [class*="_formContainer_"] { grid-template-columns: 1fr !important; }
      [class*="_gridItem_"]:not([class*="_gridItemContent_"]) {
        min-height: 170px;
        background-size: 46% auto, cover;
      }
      [class*="_gridItemContent_"] { padding: 28px 22px 24px; }
      [class*="_textHeading_"] { font-size: 32px; }
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
