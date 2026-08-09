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
  /* Four countries in view rather than one. */
  const LIST_MAX = 180;

  const CSS_POPUP = `
    /* Geometry straight off the Figma frame:
         media column 354  |  content 34 + 271 + 30  =  689 wide
         top 34 + content 376 + bottom 34            =  444 tall
       Heading to fields gap 62, gaps inside the field stack 30,
       every field and the button 271 x 29, placeholders IBM Plex 11/140%
       at 80% black, 11px in from the left edge. */
    [class*="_overlayBackground_"] { background: rgba(30, 20, 20, 0.55) !important; }

    /* The "Don't miss out!" tab. The app calls it _teaserContainer_, which
       [class*="_teaser_"] never matched -- the underscore after "teaser"
       is not there -- so it was on screen the whole time. Hidden, not
       removed: it is still the app's own opener, and the timer above
       presses it. */
    [class*="_teaser_"],
    [class*="_teaserContainer_"],
    [data-testid="form-teaser"] { display: none !important; }

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

    /* Phone row: country picker on the left, number filling the rest. They
       are two closed boxes with a small gap, not one merged control -- the
       app leaves space between them, and a picker missing its right edge
       across that gap just read as an unfinished box. */
    [class*="_formPhoneInputContainer_"] {
      display: flex !important;
      flex-direction: row !important;
      align-items: stretch !important;
      margin: 0 !important;
      position: relative !important;
    }
    /* The whole chain fills the column; the picker is the one part sized to
       its own content, so it is pulled back out of that rule below. */
    [class*="_formPhoneInputContainer_"],
    [class*="_formPhoneInputContainer_"] > *,
    [class*="_formPhoneInputContainer_"] [class*="_formFieldContainer_"] {
      width: 100% !important;
      max-width: none !important;
      flex: 1 1 100% !important;
    }
    /* ...and so is the wrapper around the number. At a full 100% it was as
       wide as the whole row on its own, so with the picker beside it the row
       overran its column and the number's right border ended up outside the
       panel, which clips. It takes what the picker leaves instead. */
    [class*="_formPhoneInputContainer_"] [class*="_formFieldContainer_"] {
      flex: 1 1 0% !important;
      width: auto !important;
      min-width: 0 !important;
    }
    /* Only the frame is ours. The picker is the app's own control and it
       opens its own list -- restyling its insides is what stopped it
       opening, so nothing here touches how it is laid out internally or
       where the list goes. It is sized to its content and given the box's
       left, top and bottom edges, with its right one dropped so the number
       field's left border is the single line between them. */
    .phone-country-selector,
    [class*="_selectContainer_"] {
      flex: 0 0 auto !important;
      width: auto !important;
      max-width: none !important;
      min-width: 0 !important;
    }
    [class*="_selectToggle_"],
    .phone-country-selector > button {
      height: 29px !important;
      min-height: 29px !important;
      padding: 0 7px !important;
      gap: 5px !important;
      border: 0.5px solid #8B8B8B !important;
      border-radius: 0 !important;
      background: #ffffff !important;
      box-shadow: none !important;
      font-family: "IBM Plex Sans", sans-serif !important;
      font-size: 11px !important;
      line-height: 1 !important;
      color: rgba(0, 0, 0, 0.8) !important;
    }
    /* The flag is what made this unusable at 29px: at its natural size it
       overflowed the strip and was cut off top and bottom. The caret beside
       it comes in far too heavy for an 11px row. */
    /* Flag and caret, on the closed control only. Nothing here reaches the
       list: sizing that is what collapsed the form when it opened. */
    [class*="_selectToggle_"] img,
    .phone-country-selector > button img {
      width: 20px !important;
      height: 14px !important;
      min-width: 20px !important;
      min-height: 14px !important;
      max-height: none !important;
      object-fit: contain !important;
      align-self: center !important;
      display: block !important;
    }
    /* The app wraps the flag in a span shorter than the flag, which cropped
       it. Direct children of the toggle only. */
    [class*="_selectToggle_"] > *,
    .phone-country-selector > button > * {
      display: flex !important;
      align-items: center !important;
      height: auto !important;
      min-height: 0 !important;
      max-height: none !important;
      overflow: visible !important;
      line-height: 1 !important;
    }
    [class*="_selectToggle_"] svg,
    .phone-country-selector > button svg {
      width: 8px !important;
      height: 8px !important;
      opacity: 0.55 !important;
    }
    [class*="_formPhoneInputField_"] {
      /* 0% basis, not auto: an input sizes itself off its size attribute,
         which is wider than what is left beside the picker -- on that basis
         it wrapped onto a line of its own. */
      flex: 1 1 0% !important;
      width: auto !important;
      min-width: 0 !important;
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
       the app's own label is always in its filled state and hidden. Measured
       from the number field's own left edge rather than the row's, so the
       picker's width -- which is its content's, not ours to fix -- cannot
       push the dialing code into it. */
    .bh-phone-hint {
      position: absolute;
      left: 42px;
      top: 50%;
      transform: translateY(-50%);
      font-family: "IBM Plex Sans", sans-serif;
      font-size: 11px;
      line-height: 140%;
      color: rgba(0, 0, 0, 0.8);
      pointer-events: none;
    }

    /* The country picker is deliberately not in this list: it is a 58px
       strip with its own centring and no right border, and the shared
       padding here would push its flag off centre. */
    [class*="_formInputField_"],
    [class*="_formPhoneInputField_"] {
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
      /* Stacked, the close control sits over the photograph rather than on
         the white panel, where its dark mark all but disappears. White on
         phones only -- on desktop it is over the panel and correct as it is.

         It is a <span role="button">, not a <button>, and its class is
         _formCloseButton_ with a capital C: attribute matching is
         case-sensitive, so [class*="_close"] never matched it either. The
         mark is a <path> with no fill of its own, so the fill is set there
         rather than inherited. */
      [class*="_formCloseButton_"],
      [class*="_formContainerCloseButtonPosition_"],
      [role="button"][aria-label*="Close"] {
        color: #ffffff !important;
        opacity: 1 !important;
        filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.45)) !important;
      }
      [class*="_formCloseButton_"] svg,
      [class*="_formCloseButton_"] path,
      [role="button"][aria-label*="Close"] svg,
      [role="button"][aria-label*="Close"] path {
        color: #ffffff !important;
        fill: #ffffff !important;
      }

      /* line-height belongs to the text fields; on the picker it would
         push the flag down out of the middle of the taller strip. */
      [class*="_selectToggle_"],
      .phone-country-selector button,
      .phone-country-selector select { line-height: 1 !important; }
      .bh-phone-hint { left: 46px; }
      [class*="_gridItemContent_"] { padding: 30px 24px 32px !important; }
      [class*="_formHeader_"] { margin: 0 0 32px !important; }
      [class*="_textHeading_"] { font-size: 44px !important; }
      form[class*="_formFieldset_"],
      shop-lead-capture { gap: 20px !important; }

      /* Stacked, the popup is taller than a phone screen, and the panel
         clips whatever does not fit -- which took the bottom off the
         consent line. Cap it to the screen and let it scroll instead.
         svh rather than vh: vh is the height with the browser's address
         bar retracted, so it still overshoots while the bar is showing. */
      [class*="_formContainer_"],
      [class*="_formContainer_"]:not([class*="_noImage_"]),
      [class*="_formContainer_"]:has(.bh-media) {
        max-height: 88vh !important;
        max-height: 88svh !important;
        overflow-x: hidden !important;
        overflow-y: auto !important;
        -webkit-overflow-scrolling: touch;
      }
      /* The image is the first thing to give up room when the screen is
         short -- the form itself has to stay reachable. */
      @media (max-height: 720px) {
        .bh-media { min-height: 130px !important; background-size: 120px auto, cover; }
        [class*="_gridItem_"]:not([class*="_gridItemContent_"]) {
          height: 130px !important;
          min-height: 130px !important;
        }
        [class*="_textHeading_"] { font-size: 36px !important; }
        [class*="_formHeader_"] { margin: 0 0 24px !important; }
        [class*="_gridItemContent_"] { padding: 24px 24px 26px !important; }
      }
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
      /* All three on one line. The phone field carries a picker as well as
         a number, so its column is given more room than the other two
         rather than an equal third -- 1fr 1fr 1.35fr. */
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.35fr) !important;
      column-gap: 10px !important;
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
      /* The app's own gap here would show up twice over: between the picker
         and the number, and -- because the row wraps for the label and the
         error message -- above the box as well, sitting the phone label
         further from its field than the other two. The picker's own border
         does the separating instead. */
      column-gap: 6px !important;
      row-gap: 0 !important;
      position: relative !important;
      width: 100% !important;
      max-width: none !important;
      min-width: 0 !important;
      margin: 0 !important;
    }
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
    /* Country picker: same frame as the popup, and the same restraint --
       the app's own control, given a closed box of its own, and otherwise
       left to lay itself out and open its own list. */
    .phone-country-selector,
    [class*="_selectContainer_"] {
      flex: 0 0 auto !important;
      width: auto !important;
      max-width: none !important;
      min-width: 0 !important;
    }
    [class*="_selectToggle_"],
    .phone-country-selector > button {
      height: 29px !important;
      min-height: 29px !important;
      padding: 0 7px !important;
      gap: 5px !important;
      border: 0.5px solid #8B8B8B !important;
      border-radius: 0 !important;
      background: #ffffff !important;
      box-shadow: none !important;
      font-family: "IBM Plex Sans", sans-serif !important;
      font-size: 11px !important;
      line-height: 1 !important;
      color: rgba(0, 0, 0, 0.8) !important;
    }
    /* Flag and caret, on the closed control only. Nothing here reaches the
       list: sizing that is what collapsed the form when it opened. */
    [class*="_selectToggle_"] img,
    .phone-country-selector > button img {
      width: 20px !important;
      height: 14px !important;
      min-width: 20px !important;
      min-height: 14px !important;
      max-height: none !important;
      object-fit: contain !important;
      align-self: center !important;
      display: block !important;
    }
    /* The app wraps the flag in a span shorter than the flag, which cropped
       it. Direct children of the toggle only. */
    [class*="_selectToggle_"] > *,
    .phone-country-selector > button > * {
      display: flex !important;
      align-items: center !important;
      height: auto !important;
      min-height: 0 !important;
      max-height: none !important;
      overflow: visible !important;
      line-height: 1 !important;
    }
    [class*="_selectToggle_"] svg,
    .phone-country-selector > button svg {
      width: 8px !important;
      height: 8px !important;
      opacity: 0.55 !important;
    }
    /* The list's depth -- see listDepth() below, which is what actually
       carries this. The rule is kept as a floor for the case where the app
       has not written its own value yet, and is given three attribute
       selectors so it outranks the app's own class rule: its stylesheet is
       adopted by the shadow root, and adopted sheets are applied after the
       <style> we inject, so a tie on specificity goes to the app. */
    [class*="_formPhoneInputContainer_"] [class*="_selectContainer_"] [class*="_dropdownContainer_"] {
      max-height: ${LIST_MAX}px !important;
    }

    /* Nothing else here sizes or positions the list. Forcing a height on it --
       and on the app's wrappers around it, to find whichever one scrolls --
       is what made the form disappear the moment the picker was opened. Its
       depth is the app's, and a working form is worth more than a taller
       list. Colour is the one exception: it has to be overridden, because
       this sheet's white default would otherwise leave the list white on
       white, and colour cannot affect layout. */
    /* The white default this sheet sets for the dark band was reaching the
       country list too, which opens on its own white panel -- "India +91"
       was white on white. The picker and its list are the one part of the
       form that is not on the band, so the text goes back to dark. */
    .phone-country-selector,
    .phone-country-selector *,
    [class*="_selectContainer_"],
    [class*="_selectContainer_"] *,
    [role="listbox"],
    [role="listbox"] *,
    [role="option"],
    [role="option"] * {
      color: rgba(0, 0, 0, 0.8) !important;
    }
    /* The number takes what the picker leaves. A 0% basis rather than auto:
       an input sizes itself off its size attribute, which is wider than the
       space beside the picker, and on a wrapping row that put it underneath. */
    [class*="_formPhoneInputContainer_"] > [class*="_formPhoneInputField_"],
    [class*="_formPhoneInputContainer_"] [class*="_formPhoneInputField_"] {
      flex: 1 1 0% !important;
      width: auto !important;
      min-width: 0 !important;
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
      /* The picker grows with them, but keeps its own centring: the
         line-height above would push its flag off the middle. */
      [class*="_selectToggle_"],
      .phone-country-selector > button {
        height: 44px !important;
        min-height: 44px !important;
        line-height: 1 !important;
      }
    }
  `;

  /* Two shapes of the same form: the popup owns its own layout, the footer
     band leaves layout to the section wrapped around it.

     Which is which is decided by where the embed sits in the page, not by
     anything inside the app. Looking for an overlay element in the shadow
     root was wrong: while the popup is showing its teaser tab there is no
     overlay yet, so the popup was being read as the inline form and handed
     the footer's stylesheet -- which is what spread its fields across the
     whole window. Only the footer form is inside our own section, so that
     test holds in every state the app can be in. */
  const isPopup = (host) => !host.closest('.bh-waitlist');

  /* The app can be set to open the popup from a "Don't miss out!" tab
     instead of on a timer. The tab is hidden in CSS, and this presses it --
     a hidden button still takes a click, and going through the app's own
     opener keeps its rules about how often a visitor is shown the form.

     The wait is the app's own: the tab does not appear until the delay set
     in Shopify Forms has passed, and this fires as soon as it does. Adding
     a delay of our own here would stack on top of that setting, so all
     this leaves is a beat for the app to finish mounting the tab before it
     is clicked. */
  const TEASER = '[data-testid="form-teaser"], [class*="_teaserContainer_"]';

  /* The country list opens one row deep because the app measures the room it
     thinks it has and writes the answer straight onto the element:
     style="max-height: 60px". A stylesheet cannot be relied on to beat that
     here -- the app's own styles are adopted by the shadow root, and adopted
     sheets are applied after the <style> we inject, so anything it declares
     with equal weight wins. Setting the property on the element itself, with
     priority, sits above all of it.

     Re-run on every pass, because the app rewrites its value each time the
     list opens; the guard makes reapplying a no-op once ours is in place, so
     watching for the change cannot feed itself. */
  const listDepth = (root) => {
    root.querySelectorAll('[class*="_dropdownContainer_"]').forEach((list) => {
      if (list.style.getPropertyPriority('max-height') === 'important' &&
        list.style.maxHeight === LIST_MAX + 'px') return;
      list.style.setProperty('max-height', LIST_MAX + 'px', 'important');
    });
  };

  /* The app closes the popup when the dark area around it is clicked. With a
     form to fill in that is easy to do by accident -- one stray click and
     whatever was typed is gone -- so only the close button dismisses it now.

     The click is caught on the way down and stopped before the app's own
     handler sees it, but only when it landed on the backdrop itself: a click
     inside the panel, or on any button or link (the close control included),
     is left alone. mousedown is covered as well, since a backdrop handler
     often fires on press rather than on click. */
  const lockClose = (root, host) => {
    if (host.dataset.bhLock) return;
    host.dataset.bhLock = '1';

    const guard = (event) => {
      const target = event.composedPath()[0];
      if (!target || target.nodeType !== 1 || !target.closest) return;
      if (target.closest('[class*="_formContainer_"]')) return;
      if (target.closest('button, a, [role="button"], input, select, textarea')) return;
      event.stopPropagation();
      event.stopImmediatePropagation();
    };

    root.addEventListener('mousedown', guard, true);
    root.addEventListener('click', guard, true);
  };

  const autoOpen = (root, host) => {
    if (host.dataset.bhAuto) return;
    const teaser = root.querySelector(TEASER);
    if (!teaser) return;
    host.dataset.bhAuto = '1';
    setTimeout(() => { if (teaser.isConnected) teaser.click(); }, 150);
  };

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

    /* Anchored to the wrapper around the number field where there is one, so
       the hint is placed off the input rather than off the whole row -- with
       the country picker back, the row's left edge is the picker's. */
    const wrap = input.closest('[class*="_formFieldContainer_"]') ||
      input.closest('[class*="_formPhoneInputContainer_"]');
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

  const paint = (root, host) => {
    if (!root) return;
    const popup = isPopup(host);
    const variant = popup ? 'popup' : 'inline';

    let style = root.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      root.appendChild(style);
    }
    /* Written on every pass where it does not already match, rather than
       once: a form that was styled before it finished mounting must be able
       to pick up the right sheet afterwards. */
    if (style.dataset.variant !== variant) {
      style.textContent = popup ? CSS_POPUP : CSS_INLINE;
      style.dataset.variant = variant;
    }

    if (popup) {
      ensureMedia(root);
      splitHeading(root);
      splitBody(root);
      autoOpen(root, host);
      lockClose(root, host);
    }
    phoneHint(root);
    /* Footer form only. The popup keeps the in-box placeholders its Figma
       frame specifies, and nothing of ours is added to it. */
    if (!popup) {
      fieldTags(root);
      listDepth(root);
    }
  };

  const seen = new WeakSet();

  const scan = () => {
    document.querySelectorAll(HOST).forEach((host) => {
      const root = host.shadowRoot;
      if (!root) return;
      paint(root, host);
      /* The app mounts each form well after page load and re-renders it on
         open/close, which would drop our style node -- watch each shadow
         root and re-apply. Attributes are watched too, narrowed to style:
         the country list's height is written there, and it is rewritten
         each time the list opens. Every pass is a no-op once our values are
         in place, so our own writes cannot keep the observer running. */
      if (!seen.has(root)) {
        seen.add(root);
        new MutationObserver(() => paint(root, host)).observe(root, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['style']
        });
      }
    });
  };

  scan();
  new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
})();
