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
    /* Geometry straight off the Figma frame:
         media column 354  |  content 34 + 271 + 30  =  689 wide
         top 34 + content 376 + bottom 34            =  444 tall
       Heading to fields gap 62, gaps inside the field stack 30,
       every field and the button 271 x 29, placeholders IBM Plex 11/140%
       at 80% black, 11px in from the left edge. */
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
    [class*="_imageLoading_"]:not(.bh-media) { display: none !important; }

    [class*="_formContainer_"] {
      width: min(689px, 94vw) !important;
      max-width: 689px !important;
      border-radius: 0 !important;
      overflow: hidden !important;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.30) !important;
    }
    [class*="_formContainer_"]:has(.bh-media),
    [class*="_formContainer_"]:not([class*="_noImage_"]) {
      display: grid !important;
      grid-template-columns: 354px 1fr !important;
      align-items: stretch !important;
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
      padding: 34px 30px 34px 34px !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: flex-start !important;
    }

    /* 62px from the heading block down to the first field. */
    [class*="_formHeader_"] { margin: 0 0 62px !important; }

    [class*="_textHeading_"] {
      font-family: "ivypresto-display", serif !important;
      font-weight: 300 !important;
      font-size: 54px !important;
      line-height: 1 !important;
      letter-spacing: 0.02em !important;
      text-align: left !important;
      text-transform: none !important;
      color: #000 !important;
      margin: 0 !important;
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
      margin: 10px 0 0 !important;
    }

    /* Field stack: 30px apart, Name / Email / Phone / button. Every sibling
       needs an explicit order -- ordering the phone field alone left it
       behind the button, which still had the default order of 0. */
    form[class*="_formFieldset_"],
    shop-lead-capture,
    *:has(> [class*="_formPhoneInputContainer_"]) {
      display: flex !important;
      flex-direction: column !important;
      gap: 30px !important;
      margin: 0 !important;
    }
    [class*="_formFieldContainer_"]:has(#first_name) { order: 1 !important; }
    [class*="_formFieldContainer_"]:has(#email) { order: 2 !important; }
    [class*="_formPhoneInputContainer_"] { order: 3 !important; }
    [class*="_formSubmitButton_"] { order: 4 !important; }
    [class*="_formDisclaimer_"] { order: 5 !important; }

    /* Phone row: the country picker is dropped -- its flag renders clipped
       at 29px and it adds nothing while the form is India-only. The number
       field takes the full 271px and keeps the +91 prefix, so the dialing
       code is still submitted. */
    [class*="_formPhoneInputContainer_"] {
      display: flex !important;
      flex-direction: row !important;
      align-items: stretch !important;
      margin: 0 !important;
      position: relative !important;
    }
    .phone-country-selector,
    [class*="_selectContainer_"] { display: none !important; }
    /* With the picker hidden the remaining wrapper still sizes to content,
       which left the phone field short of the other two -- force the whole
       chain to the full column width. */
    [class*="_formPhoneInputContainer_"],
    [class*="_formPhoneInputContainer_"] > *,
    [class*="_formPhoneInputContainer_"] [class*="_formFieldContainer_"] {
      width: 100% !important;
      max-width: none !important;
      flex: 1 1 100% !important;
    }
    [class*="_formPhoneInputField_"] {
      width: 100% !important;
      max-width: none !important;
    }
    /* Border-box everywhere, or the phone field's padding and border add on
       top of its 100% and it outgrows Name and Email. */
    [class*="_gridItemContent_"],
    [class*="_gridItemContent_"] * {
      box-sizing: border-box !important;
    }
    [class*="_formFieldContainer_"] {
      width: 100% !important;
      max-width: none !important;
      margin: 0 !important;
    }

    /* Standing in for the placeholder: the field is never empty (+91), so
       the app's own label is always in its filled state and hidden. */
    .bh-phone-hint {
      position: absolute;
      left: 36px;
      top: 50%;
      transform: translateY(-50%);
      font-family: "IBM Plex Sans", sans-serif;
      font-size: 11px;
      line-height: 140%;
      color: rgba(0, 0, 0, 0.8);
      pointer-events: none;
    }

    [class*="_formInputField_"],
    [class*="_formPhoneInputField_"],
    [class*="_selectToggle_"] {
      height: 29px !important;
      min-height: 29px !important;
      padding: 7px 11px 6px !important;
      border: 0.5px solid #8B8B8B !important;
      border-radius: 0 !important;
      background: #fff !important;
      font-family: "IBM Plex Sans", sans-serif !important;
      font-weight: 400 !important;
      font-size: 11px !important;
      line-height: 140% !important;
      letter-spacing: 0 !important;
      color: rgba(0, 0, 0, 0.8) !important;
      box-shadow: none !important;
    }
    [class*="_formInputField_"]:focus,
    [class*="_formPhoneInputField_"]:focus {
      border-color: #7F1416 !important;
      outline: none !important;
    }
    [class*="_formInputFieldLabel_"] {
      font-family: "IBM Plex Sans", sans-serif !important;
      font-weight: 400 !important;
      font-size: 11px !important;
      line-height: 140% !important;
      letter-spacing: 0 !important;
      color: rgba(0, 0, 0, 0.8) !important;
      left: 11px !important;
    }
    /* A 29px field has no room for the app's floated label once the field
       fills, so hide it then -- clipped rather than display:none, which
       would drop it out of the accessibility tree along with the input's
       only name. */
    [class*="_formInputFieldLabel_"][class*="_inputFilled_"] {
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      overflow: hidden !important;
      clip: rect(0 0 0 0) !important;
      clip-path: inset(50%) !important;
      white-space: nowrap !important;
    }

    [class*="_formSubmitButton_"] {
      width: 100% !important;
      height: 29px !important;
      min-height: 29px !important;
      padding: 0 !important;
      line-height: 29px !important;
      margin: 0 !important;
      border: 0 !important;
      border-radius: 0 !important;
      background: #7F1416 !important;
      color: #fff !important;
      font-family: "IBM Plex Sans", sans-serif !important;
      font-size: 11px !important;
      font-weight: 500 !important;
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
      margin: 0 !important;
    }

    [class*="_formContainerCloseButtonPosition_"] {
      top: 16px !important;
      right: 18px !important;
    }
    [class*="_formCloseButton_"] { color: #2a2a2a !important; }

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
        background-size: 150px auto, cover;
      }
      /* 29px is fine with a mouse; a thumb needs 44. */
      [class*="_formInputField_"],
      [class*="_formPhoneInputField_"],
      [class*="_selectToggle_"],
      [class*="_formSubmitButton_"] {
        height: 44px !important;
        min-height: 44px !important;
        line-height: 42px !important;
      }
      [class*="_gridItem_"]:not([class*="_gridItemContent_"]) {
        height: 190px !important;
        min-height: 190px !important;
      }
      .bh-phone-hint { left: 38px; }
      [class*="_gridItemContent_"] { padding: 30px 24px 32px !important; }
      [class*="_formHeader_"] { margin: 0 0 32px !important; }
      [class*="_textHeading_"] { font-size: 44px !important; }
      form[class*="_formFieldset_"],
      shop-lead-capture { gap: 20px !important; }
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

  /* The phone field always carries the +91 dialing code, so its label never
     leaves the filled state and the field would otherwise read as a bare
     number box. Park a hint beside the prefix until real digits arrive. */
  const phoneHint = (root) => {
    const input = root.querySelector('[class*="_formPhoneInputField_"]');
    if (!input || input.dataset.bhHint) return;
    input.dataset.bhHint = '1';

    const wrap = input.closest('[class*="_formPhoneInputContainer_"]');
    if (!wrap) return;

    const hint = document.createElement('span');
    hint.className = 'bh-phone-hint';
    hint.textContent = 'Phone no.';
    wrap.appendChild(hint);

    const sync = () => {
      const digits = input.value.replace(/^\+?\d{1,3}/, '').replace(/\D/g, '');
      hint.style.display = digits.length ? 'none' : 'block';
    };
    input.addEventListener('input', sync);
    input.addEventListener('blur', sync);
    sync();
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
    phoneHint(root);
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
