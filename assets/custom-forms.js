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
    /* Sizes follow the Figma: 755x444 modal, 355px media column, title at
       54px / 100% / 2%, fields 44px, submit a 36px strip in #7F1416.
       IvyPresto and IBM Plex stand in for Playfair and Inter. */
    [class*="_overlayBackground_"] { background: rgba(30, 20, 20, 0.55) !important; }

    /* Media column. The app renders no image (the container carries
       _noImage_), so we insert our own cell and paint the photo plus the
       wordmark into it -- an element we create and name ourselves, rather
       than trying to repurpose one of the app's. */
    .bh-media {
      background-image: url("${LOGO}"), url("${PHOTO}");
      background-repeat: no-repeat, no-repeat;
      background-position: center center, center center;
      background-size: 175px auto, cover;
      min-height: 444px;
    }
    [class*="_formContainer_"]:has(.bh-media) {
      display: grid !important;
      grid-template-columns: 355px 1fr !important;
      align-items: stretch !important;
      min-height: 444px !important;
    }
    /* The app's empty placeholder cell would otherwise sit beside ours. */
    [class*="_imageLoading_"]:not(.bh-media) { display: none !important; }

    [class*="_formContainer_"] {
      width: min(755px, 94vw) !important;
      max-width: 755px !important;
      border-radius: 0 !important;
      overflow: hidden !important;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.30) !important;
    }
    [class*="_formContainer_"]:not([class*="_noImage_"]) {
      grid-template-columns: 355px 1fr !important;
      min-height: 444px !important;
    }

    /* If the app ever gets its own side image, style that instead. */
    [class*="_gridItem_"]:not([class*="_gridItemContent_"]) {
      position: relative !important;
      padding: 0 !important;
    }
    [class*="_gridItem_"]:not([class*="_gridItemContent_"]) img {
      width: 100% !important;
      height: 100% !important;
      object-fit: cover !important;
      display: block !important;
    }
    [class*="_gridItem_"]:not([class*="_gridItemContent_"]):has(img)::after {
      content: "";
      position: absolute;
      inset: 0;
      background-image: url("${LOGO}");
      background-repeat: no-repeat;
      background-position: center center;
      background-size: 175px auto;
      pointer-events: none;
    }

    [class*="_gridItemContent_"] {
      padding: 38px 36px 40px 34px !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: flex-start !important;
    }

    [class*="_formHeader_"] { margin: 0 !important; }

    [class*="_textHeading_"] {
      font-family: "ivypresto-display", serif !important;
      font-weight: 300 !important;
      font-size: 54px !important;
      line-height: 1 !important;
      letter-spacing: 0.02em !important;
      text-align: left !important;
      text-transform: none !important;
      color: #000 !important;
      margin: 6px 0 0 !important;
    }
    [class*="_textHeading_"] em { font-style: italic !important; }

    [class*="_textBody_"],
    [class*="_textBody_"] p {
      font-family: "IBM Plex Sans", sans-serif !important;
      font-weight: 400 !important;
      font-size: 13px !important;
      line-height: 1.5 !important;
      text-align: left !important;
      color: #6b6b6b !important;
      margin: 12px 0 0 !important;
    }

    /* Fields sit in the optical middle of the column, 18px apart, in the
       order Name, Email, Phone. Every sibling needs an explicit order --
       ordering the phone field alone left it behind the button, which still
       had the default order of 0. */
    form[class*="_formFieldset_"],
    shop-lead-capture,
    *:has(> [class*="_formPhoneInputContainer_"]) {
      display: flex !important;
      flex-direction: column !important;
      gap: 18px !important;
    }
    form[class*="_formFieldset_"] { margin: auto 0 !important; }
    [class*="_formFieldContainer_"]:has(#first_name) { order: 1 !important; }
    [class*="_formFieldContainer_"]:has(#email) { order: 2 !important; }
    [class*="_formPhoneInputContainer_"] { order: 3 !important; margin: 0 !important; }
    [class*="_formSubmitButton_"] { order: 4 !important; }
    [class*="_formDisclaimer_"] { order: 5 !important; }

    /* The app floats each label into the top of its own field once the
       field has a value -- so the input needs top padding, otherwise the
       value lands on the label (the +91 country prefix showed this
       immediately, since the phone field is never empty). */
    [class*="_formInputField_"],
    [class*="_formPhoneInputField_"] {
      height: 52px !important;
      min-height: 52px !important;
      padding: 20px 16px 6px !important;
      border: 1px solid #d9d9d9 !important;
      border-radius: 3px !important;
      background: #fff !important;
      font-family: "IBM Plex Sans", sans-serif !important;
      font-size: 14px !important;
      line-height: 1.2 !important;
      color: #333 !important;
      box-shadow: none !important;
    }
    [class*="_selectToggle_"] {
      height: 52px !important;
      min-height: 52px !important;
      border: 1px solid #d9d9d9 !important;
      border-radius: 3px !important;
      background: #fff !important;
      box-shadow: none !important;
    }
    [class*="_formInputField_"]:focus,
    [class*="_formPhoneInputField_"]:focus {
      border-color: #7F1416 !important;
      outline: none !important;
    }
    /* Font size is left to the app here on purpose: it shrinks the label
       when the field fills, and pinning a size would freeze it large. */
    [class*="_formInputFieldLabel_"] {
      font-family: "IBM Plex Sans", sans-serif !important;
      color: #9b9b9b !important;
    }

    /* Submit reads as a thin strip, per the Figma (29px there; 36 here so
       the label has room to breathe). */
    [class*="_formSubmitButton_"] {
      width: 100% !important;
      height: 36px !important;
      min-height: 36px !important;
      padding: 0 !important;
      line-height: 36px !important;
      margin-top: 24px !important;
      border: 0 !important;
      border-radius: 0 !important;
      background: #7F1416 !important;
      color: #fff !important;
      font-family: "IBM Plex Sans", sans-serif !important;
      font-size: 11px !important;
      font-weight: 600 !important;
      letter-spacing: 1.5px !important;
      text-transform: uppercase !important;
    }
    [class*="_formSubmitButton_"]:hover { background: #6a1012 !important; }

    [class*="_formDisclaimer_"],
    [class*="_formDisclaimer_"] p {
      font-family: "IBM Plex Sans", sans-serif !important;
      font-size: 10px !important;
      line-height: 1.45 !important;
      color: #9b9b9b !important;
      text-align: left !important;
      margin: 12px 0 0 !important;
    }

    [class*="_formContainerCloseButtonPosition_"] {
      top: 16px !important;
      right: 18px !important;
    }
    [class*="_formCloseButton_"] { color: #2a2a2a !important; }

    /* Reference breakpoint: stack, photo strip on top, tighter padding. */
    @media (max-width: 640px) {
      [class*="_formContainer_"],
      [class*="_formContainer_"]:not([class*="_noImage_"]),
      [class*="_formContainer_"]:has(.bh-media) {
        grid-template-columns: 1fr !important;
        width: min(400px, 94vw) !important;
        max-width: 400px !important;
        min-height: 0 !important;
      }
      .bh-media {
        min-height: 190px !important;
        background-position: center center, center center;
        background-size: 150px auto, cover;
      }
      /* 36px is fine with a mouse; a thumb needs more. */
      [class*="_formSubmitButton_"] {
        height: 44px !important;
        min-height: 44px !important;
        line-height: 44px !important;
      }
      [class*="_gridItem_"]:not([class*="_gridItemContent_"]) {
        height: 190px !important;
        min-height: 190px !important;
      }
      [class*="_gridItem_"]:not([class*="_gridItemContent_"]):has(img)::after {
        background-size: 150px auto;
      }
      [class*="_gridItemContent_"] { padding: 30px 26px 32px !important; }
      [class*="_textHeading_"] { font-size: 44px !important; }
      form[class*="_formFieldset_"] { margin: 26px 0 !important; }
    }
  `;

  /* Give the popup its left-hand media column. Skipped entirely if the
     app ever gets a side image of its own, so turning that setting on
     later does not produce two images. */
  const ensureMedia = (root) => {
    const container = root.querySelector('[class*="_formContainer_"]');
    if (!container || container.querySelector('.bh-media')) return;

    const appImage = Array.from(container.children).some((cell) =>
      !/_gridItemContent_/.test(String(cell.className)) && cell.querySelector('img'));
    if (appImage) return;

    const media = document.createElement('div');
    media.className = 'bh-media';
    media.setAttribute('aria-hidden', 'true');
    container.prepend(media);
  };

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
    ensureMedia(root);
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
