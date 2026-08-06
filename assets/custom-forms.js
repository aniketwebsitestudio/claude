/* ==========================================================================
   Bhoomija styling for the Shopify Forms waitlist forms.

   The app renders inside <shopify-forms-embed>'s shadow root, so a normal
   stylesheet cannot reach it -- that is why the accent colour set in the
   app never reached the button. The shadow root is open, so we inject a
   <style> into it instead.

   Two variants: the popup (its own 689x444 layout) and the inline block in
   the footer band (layout comes from sections/custom-waitlist.liquid).

   Class names inside the app are hashed CSS modules
   (_formSubmitButton_jnbzb_106). The hash changes whenever Shopify rebuilds
   the app, so every selector matches on the stable middle segment via
   [class*="_name_"]. This is unsupported territory: if Shopify renames
   these internals the forms quietly revert to their default look. Nothing
   breaks -- they just stop being branded.
   ========================================================================== */
(() => {
  const HOST = 'shopify-forms-embed';
  const PHOTO = 'https://cdn.shopify.com/s/files/1/0774/6987/6271/files/image_76_1.png?v=1785950178';
  const LOGO = 'https://cdn.shopify.com/s/files/1/0774/6987/6271/files/White_Bhoomija_Unit.png?v=1785257087';
  const STYLE_ID = 'bhoomija-forms-style';

  const CSS_POPUP = `
    /* Geometry straight off the Figma frame:
         media column 354  |  content 34 + 271 + 30  =  689 wide
         top 34 + content 376 + bottom 34            =  444 tall
       Heading to fields gap 62, gaps inside the field stack 30,
       every field and the button 271 x 29, placeholders IBM Plex 11/140%
       at 80% black, 11px in from the left edge. */
    [class*="_overlayBackground_"] { background: rgba(30, 20, 20, 0.55) !important; }

    /* The "Don't miss out!" teaser tab -- turn it off in the app as well;
       this only stops it painting. */
    [class*="_teaser_"] { display: none !important; }

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
      font-weight: 100 !important;
      font-size: 54px !important;
      line-height: 1 !important;
      letter-spacing: 0.02em !important;
      text-align: left !important;
      text-transform: none !important;
      color: #000 !important;
      margin: 0 !important;
    }
    [class*="_textHeading_"] em {
      font-style: italic !important;
      font-weight: 100 !important;
    }

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
    [class*="_formInputFieldLabel_"][class*="_inputFilled_"],
    [class*="_formFieldContainer_"]:focus-within [class*="_formInputFieldLabel_"] {
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
      text-indent: 0 !important;
      width: 100% !important;
      max-width: none !important;
      margin: 0 !important;
      padding: 0 !important;
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

  /* Inline variant -- the Shopify Forms block placed in the footer band.
     The section around it supplies the heading and the background, so the
     app's own heading is hidden and the fields become one row that wraps to
     a stack on narrow screens. */
  const CSS_INLINE = `
    /* The app's own title and body are hidden -- the section around the
       block supplies the heading. */
    [class*="_formHeader_"] { display: none !important; }
    [class*="_teaser_"] { display: none !important; }

    /* Everything the app renders sits on a dark photographic band, so the
       default is white. Naming the classes one by one does not hold -- the
       success state ("You're on the list") uses different ones again -- so
       this is set on the whole shadow tree and overridden further down for
       the few things that are not on the band: the inputs and the phone
       hint, which sit on white boxes of their own. Those rules come later
       in this sheet and match at equal specificity, so they win. */
    :host, :host * { color: #ffffff !important; }

    [class*="_formContainer_"],
    [class*="_gridItem_"],
    [class*="_gridItemContent_"],
    [class*="_appEmbed_"],
    [class*="_container_"] {
      display: block !important;
      width: 100% !important;
      max-width: none !important;
      min-height: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      background: transparent !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      grid-template-columns: none !important;
    }

    [class*="_gridItemContent_"],
    [class*="_gridItemContent_"] * {
      box-sizing: border-box !important;
    }

    /* One grid for the whole form: three equal field columns with the
       button and the disclaimer spanning all three. The fields sit inside
       wrapper elements, so those wrappers are made display:contents --
       otherwise a grid on the form would only ever see the wrappers. */
    form[class*="_formFieldset_"] {
      display: grid !important;
      grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
      column-gap: 12px !important;
      row-gap: 14px !important;
      align-items: start !important;
      width: 100% !important;
      margin: 0 !important;
    }
    /* Only the plain wrappers dissolve. The field containers are also divs,
       and dissolving those strips the positioning parent their floated
       labels rely on -- which stacked every label in the grid's corner. */
    form[class*="_formFieldset_"] > div:not([class*="_formFieldContainer_"]):not([class*="_formPhoneInputContainer_"]),
    form[class*="_formFieldset_"] shop-lead-capture {
      display: contents !important;
    }

    [class*="_formFieldContainer_"]:has(#first_name) { grid-column: 1 !important; }
    [class*="_formFieldContainer_"]:has(#email) { grid-column: 2 !important; }
    [class*="_formPhoneInputContainer_"] { grid-column: 3 !important; }
    [class*="_formSubmitButton_"] { grid-column: 1 / -1 !important; }
    [class*="_formDisclaimer_"] { grid-column: 1 / -1 !important; }

    /* Each field is a column: our label, then the box, then any validation
       message. Column rather than block so the label can be ordered above
       the input it belongs to -- it is appended after the input, since that
       is the only place we can reliably add it. */
    [class*="_formFieldContainer_"] {
      display: flex !important;
      flex-direction: column !important;
      position: relative !important;
      width: 100% !important;
      max-width: none !important;
      min-width: 0 !important;
      margin: 0 !important;
    }
    [class*="_formPhoneInputContainer_"] {
      display: flex !important;
      flex-direction: row !important;
      flex-wrap: wrap !important;
      /* The app spaces the picker from the number with a gap. Now that the
         row wraps, that same gap opens up between the label line and the box
         -- so the phone field's label sat further from its box than the
         other two. Nothing shares the row any more, so it goes to zero. */
      gap: 0 !important;
      position: relative !important;
      width: 100% !important;
      max-width: none !important;
      min-width: 0 !important;
      margin: 0 !important;
    }
    .phone-country-selector,
    [class*="_selectContainer_"] { display: none !important; }
    /* Flatten the wrapper the app puts around the number field. It carries a
       few pixels of its own above the box, which sat the phone field lower
       than Name and Email; with the in-box label hidden nothing depends on
       that wrapper any more, so it stops being a box and the input becomes a
       row of this container directly, like the other two fields. */
    [class*="_formPhoneInputContainer_"] [class*="_formFieldContainer_"] {
      display: contents !important;
    }
    [class*="_formPhoneInputContainer_"] > *,
    [class*="_formPhoneInputContainer_"] [class*="_formPhoneInputField_"] {
      flex: 1 1 100% !important;
      width: 100% !important;
    }

    /* Same 29px strip as the popup. */
    [class*="_formInputField_"],
    [class*="_formPhoneInputField_"] {
      height: 29px !important;
      min-height: 29px !important;
      width: 100% !important;
      padding: 7px 11px 6px !important;
      border: 0.5px solid #8B8B8B !important;
      border-radius: 0 !important;
      background: #ffffff !important;
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
    /* The app's label doubles as the placeholder and sits inside the box,
       where a 29px strip leaves no room for it to float once the field
       fills -- so it disappears exactly when it is needed. It is hidden
       here for good and replaced by our own standing label above the box.
       Clipped rather than display:none, so the input keeps it as its
       accessible name. */
    [class*="_formInputFieldLabel_"] {
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      overflow: hidden !important;
      clip: rect(0 0 0 0) !important;
      clip-path: inset(50%) !important;
      white-space: nowrap !important;
    }
    /* Standing label, top-left above each box, in the flow rather than
       floated over it -- it reserves its own space, so nothing can end up
       sitting behind the field above or under the heading. */
    .bh-tag {
      display: block !important;
      order: -1 !important;
      width: 100% !important;
      flex: 0 0 auto !important;
      margin: 0 0 5px !important;
      font-family: "IBM Plex Sans", sans-serif !important;
      font-weight: 400 !important;
      font-size: 10px !important;
      line-height: 1.2 !important;
      letter-spacing: 0.08em !important;
      text-transform: uppercase !important;
      color: #ffffff !important;
      white-space: nowrap !important;
      pointer-events: none !important;
    }
    /* The in-box "Phone no." hint stood in for a placeholder; the standing
       label says the same thing, so the box is left clean. */
    .bh-phone-hint { display: none !important; }

    /* Validation messages belong under the field they are about. The phone
       row is a flex row, so without a wrap its message was pushed out to
       the right of the box -- over the band and past the button's edge. */
    [class*="_formFieldContainer_"] [class*="rror"]:not([class*="_formInputField_"]):not([class*="_formPhoneInputField_"]):not([class*="_formFieldContainer_"]),
    [class*="_formPhoneInputContainer_"] > [class*="rror"]:not([class*="_formPhoneInputField_"]):not([class*="_formFieldContainer_"]),
    [class*="_formFieldContainer_"] [role="alert"],
    [class*="_formPhoneInputContainer_"] > [role="alert"] {
      display: block !important;
      width: 100% !important;
      flex: 0 0 100% !important;
      order: 99 !important;
      margin: 4px 0 0 !important;
      padding: 0 !important;
      position: static !important;
      font-family: "IBM Plex Sans", sans-serif !important;
      font-size: 10px !important;
      line-height: 1.3 !important;
      letter-spacing: 0.02em !important;
      color: #ffb4b4 !important;
    }

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

    /* Button spans the full three columns, so its left edge lines up with
       Name and its right edge with the phone field. */
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
      color: #ffffff !important;
      font-family: "IBM Plex Sans", sans-serif !important;
      font-size: 11px !important;
      font-weight: 500 !important;
      letter-spacing: 1.5px !important;
      text-transform: uppercase !important;
      cursor: pointer !important;
    }
    [class*="_formSubmitButton_"]:hover { background: #6a1012 !important; }

    [class*="_formDisclaimer_"],
    [class*="_formDisclaimer_"] p {
      width: 100% !important;
      font-family: "IBM Plex Sans", sans-serif !important;
      font-size: 10px !important;
      line-height: 1.45 !important;
      color: rgba(255, 255, 255, 0.75) !important;
      text-align: left !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    @media (max-width: 900px) {
      form[class*="_formFieldset_"] {
        grid-template-columns: 1fr !important;
        row-gap: 12px !important;
      }
      [class*="_formFieldContainer_"]:has(#first_name),
      [class*="_formFieldContainer_"]:has(#email),
      [class*="_formPhoneInputContainer_"],
      [class*="_formSubmitButton_"],
      [class*="_formDisclaimer_"] {
        grid-column: 1 !important;
      }
      /* 29px is fine with a mouse; a thumb needs 44. */
      [class*="_formInputField_"],
      [class*="_formPhoneInputField_"],
      [class*="_formSubmitButton_"] {
        height: 44px !important;
        min-height: 44px !important;
        line-height: 42px !important;
      }
      [class*="_formInputField_"],
      [class*="_formPhoneInputField_"] { padding: 14px 12px 6px !important; }
    }
  `;

  /* Two shapes of the same form: the popup owns its own layout, the footer
     band leaves layout to the section wrapped around it. */
  const isPopup = (root) => Boolean(root.querySelector('[class*="_overlay_"]'));

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

  /* The app's label doubles as the placeholder, and a 29px strip has no room
     for it to float into once the field fills -- so it is clipped, and the
     visitor is left typing into an unnamed box.

     Each field therefore gets a small tag of our own, sitting at the
     top-left corner just above the box. The CSS shows it (and clips the
     app's label) for as long as the field has focus, so the name moves out
     of the box the moment you click into it and moves back when you leave.
     The tag is aria-hidden and absolutely positioned, so it costs no layout
     and adds nothing to the accessibility tree -- the input keeps the app's
     own label as its name. */
  const LABELS = {
    first_name: 'Name', firstName: 'Name', name: 'Name',
    last_name: 'Last name', lastName: 'Last name',
    email: 'Email',
    phone: 'Phone no.', phone_number: 'Phone no.', phoneNumber: 'Phone no.'
  };

  const tagText = (input, host) => {
    const label = host.querySelector('[class*="_formInputFieldLabel_"]');
    return LABELS[input.id] ||
      LABELS[input.name] ||
      (label ? label.textContent.trim() : '') ||
      input.getAttribute('aria-label') ||
      input.getAttribute('placeholder') ||
      '';
  };

  const fieldTags = (root) => {
    root.querySelectorAll('[class*="_formInputField_"], [class*="_formPhoneInputField_"]').forEach((input) => {
      const phone = /_formPhoneInputField_/.test(String(input.className));
      const host = input.closest(phone
        ? '[class*="_formPhoneInputContainer_"]'
        : '[class*="_formFieldContainer_"]');
      if (!host || host.querySelector(':scope > .bh-tag')) return;

      /* The label can mount a beat after the input does, so this is left to
         run again on the next observer pass rather than marked as done with
         nothing to show. */
      const text = tagText(input, host);
      if (!text) return;

      const tag = document.createElement('span');
      tag.className = 'bh-tag';
      tag.setAttribute('aria-hidden', 'true');
      tag.textContent = text;
      host.appendChild(tag);
    });
  };

  /* The subheading reads as one run and wraps mid-sentence. Break it after
     the first full stop so "One note, no noise." starts its own line. The
     replacement leaves no whitespace after the period, so the regex cannot
     match again and the observer will not loop. */
  const splitBody = (root) => {
    const body = root.querySelector('[class*="_textBody_"] p');
    if (!body || body.querySelector('br')) return;
    const text = body.textContent || '';
    if (!/\.\s+\S/.test(text)) return;
    body.innerHTML = text.replace(/\.\s+/, '.<br>');
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
    const popup = isPopup(root);

    if (!root.getElementById(STYLE_ID)) {
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = popup ? CSS_POPUP : CSS_INLINE;
      root.appendChild(style);
    }

    if (popup) {
      ensureMedia(root);
      splitHeading(root);
      splitBody(root);
    }
    phoneHint(root);
    /* Footer form only. The popup keeps the in-box placeholders its Figma
       frame specifies, and nothing of ours is added to it. */
    if (!popup) fieldTags(root);
  };

  const seen = new WeakSet();

  const scan = () => {
    document.querySelectorAll(HOST).forEach((host) => {
      const root = host.shadowRoot;
      if (!root) return;
      paint(root);
      /* The app mounts each form well after page load and re-renders it on
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
