#!/usr/bin/env python3
"""Generate an importable Elementor template for the "Six ways to be here" section."""

import json
import random
import string

random.seed(20260729)


def eid():
    return "".join(random.choice("0123456789abcdef") for _ in range(7))


ASSETS = {
    "suite": "https://pikaso.cdnpk.net/private/production/5017165555/render.jpg?token=exp=1785628800~hmac=46236a65556037bd4a4a2aeadca82a33d70b696edcfec63b66d142887ec08a99",
    "tent": "https://pikaso.cdnpk.net/private/production/5017168452/render.jpg?token=exp=1785628800~hmac=8a1171ee0cdee2471fb1a28caf351338342a90b3fcd7b340a5227b551187b033",
    "pool": "https://pikaso.cdnpk.net/private/production/5017166004/render.jpg?token=exp=1785628800~hmac=4ba5bb06fc03bf74f9a6f0fb83d798eb86bbdc239da116726b904964f5b8b68d",
    "dining": "https://pikaso.cdnpk.net/private/production/5017169705/render.jpg?token=exp=1785628800~hmac=66012fbb56569972f3ed8a50fe02a597d346178f67b218bb7481e37143c1919f",
    "wedding": "https://pikaso.cdnpk.net/private/production/5017169629/render.jpg?token=exp=1785628800~hmac=ab34a1029a8dcc2e0ac6dd47504f2beed731900b67c0910914c83761b961348f",
    "corporate": "https://pikaso.cdnpk.net/private/production/5017170347/render.jpg?token=exp=1785628800~hmac=c14924c6fd8a3a45a9dcd60bab606152dcf49da3801fab769a70d6f681cd4d59",
}

LAYERS = [
    ("suite", "Dam-view suite"),
    ("tent", "Lakeside tent"),
    ("pool", "Infinity pool"),
    ("dining", "Dining pavilion"),
    ("wedding", "Main lawn"),
    ("corporate", "Offsite lawn"),
]

ROWS = [
    ("01", "Dam-view rooms",
     "Forty-two rooms and tents facing the water. Check in at 1 PM, wake to the dam. Room-only, or with all meals from separate veg and non-veg kitchens.",
     "From ₹2,500 per person", "#pkg"),
    ("02", "Luxury tents",
     "Canvas suites on timber decks at the water’s edge. Same amenities as the rooms, none of the walls between you and the lake.",
     "See stay packages", "#pkg"),
    ("03", "One-day picnic",
     "9:30 to 6. Breakfast, pure-veg buffet lunch, evening tea. Pool, rain dance, twenty-nine rides and the kids’ play area — all of it included.",
     "₹1,650 per adult", "#pkg"),
    ("04", "Dining",
     "Multi-cuisine buffets in an open pavilion over the water. Pure-veg for day guests; separate veg and non-veg kitchens for stays.",
     "Ask about menus", "#enq"),
    ("05", "Destination weddings",
     "A 20,000 sqft main lawn for up to 1,500, a 4,500 sqft AC banquet hall, and a poolside lawn for the small, good ones.",
     "Get a venue quote", "#occ"),
    ("06", "Corporate offsites",
     "AC conference hall for 5 to 60 with AV and high-speed internet, then the whole estate for the part people actually remember.",
     "Plan an offsite", "#occ"),
]


# ---------------------------------------------------------------- helpers
def dim(top, right, bottom, left, unit="px"):
    return {"unit": unit, "top": str(top), "right": str(right),
            "bottom": str(bottom), "left": str(left), "isLinked": ""}


def container(settings, children, inner=False):
    return {"id": eid(), "elType": "container", "settings": settings,
            "elements": children, "isInner": inner}


def widget(wtype, settings):
    return {"id": eid(), "elType": "widget", "settings": settings,
            "elements": [], "widgetType": wtype}


def heading(text, tag, classes, color, family, weight, sizes,
            ls=None, lh=None, extra=None):
    s = {
        "title": text,
        "header_size": tag,
        "_css_classes": classes,
        "title_color": color,
        "typography_typography": "custom",
        "typography_font_family": family,
        "typography_font_weight": weight,
        "typography_font_size": {"unit": "px", "size": sizes[0], "sizes": []},
        "typography_font_size_tablet": {"unit": "px", "size": sizes[1], "sizes": []},
        "typography_font_size_mobile": {"unit": "px", "size": sizes[2], "sizes": []},
    }
    if ls is not None:
        s["typography_letter_spacing"] = {"unit": "em", "size": ls, "sizes": []}
    if lh is not None:
        s["typography_line_height"] = {"unit": "em", "size": lh, "sizes": []}
    if extra:
        s.update(extra)
    return widget("heading", s)


# ---------------------------------------------------------------- CSS / JS
CSS = """
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;1,9..144,300;1,9..144,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,700&display=swap');

.sneh-exp{
  --sn-ink:#0B211F; --sn-ink2:#153733; --sn-ink3:#1D4A45;
  --sn-teal:#397f79; --sn-teal-lt:#489a8f; --sn-olive:#83931f;
  --sn-coral:#f49b7b; --sn-coral-dp:#D9764F;
  --sn-d1:#F2F4F1; --sn-d2:rgba(242,244,241,.66); --sn-d3:rgba(242,244,241,.40);
  --sn-line-d:rgba(242,244,241,.13);
  --sn-serif:"Fraunces",Georgia,serif;
  --sn-sans:"DM Sans",-apple-system,"Segoe UI",sans-serif;
  --sn-ease:cubic-bezier(.16,1,.3,1);
  background:var(--sn-ink); color:var(--sn-d1);
  font-family:var(--sn-sans); font-weight:300; overflow-x:clip;
}
.sneh-exp *,.sneh-exp *::before,.sneh-exp *::after{box-sizing:border-box}
.sneh-exp ::selection{background:var(--sn-coral);color:#3A1B0C}

/* ---------- reveal ---------- */
.sneh-exp .sneh-fade{opacity:0;transform:translateY(22px);
  transition:opacity .9s var(--sn-ease),transform .9s var(--sn-ease)}
.sneh-exp .sneh-fade.is-in{opacity:1;transform:none}

/* ---------- head ---------- */
.sneh-exp .sneh-eyebrow .elementor-heading-title{font-family:var(--sn-sans);font-size:10px;
  letter-spacing:.26em;text-transform:uppercase;font-weight:500;
  color:var(--sn-d3);margin:0;line-height:1.6}
.sneh-exp .sneh-title{margin-top:16px}
.sneh-exp .sneh-title .elementor-heading-title{font-family:var(--sn-serif);font-weight:300;
  letter-spacing:-.028em;line-height:1;color:var(--sn-d1);
  font-variation-settings:"opsz" 96;margin:0}
.sneh-exp .sneh-title em{font-style:italic;color:var(--sn-coral)}

/* ---------- columns ---------- */
.sneh-exp .sneh-cols{align-items:flex-start}
.sneh-exp .sneh-media-col,
.sneh-exp .sneh-list{flex:1 1 0;min-width:0}

/* ---------- sticky media ---------- */
.sneh-exp .sneh-media-col{position:sticky;top:12vh;align-self:flex-start}
.sneh-exp .sneh-media-col > .elementor-widget{width:100%}
.sneh-exp .sneh-media{position:relative;height:76vh;border-radius:3px;overflow:hidden;
  background:var(--sn-ink2)}
.sneh-exp .sneh-lay{position:absolute;inset:0;opacity:0;
  transition:opacity .75s var(--sn-ease)}
.sneh-exp .sneh-lay.is-on{opacity:1}
.sneh-exp .sneh-lay img{width:100%;height:100%;object-fit:cover;display:block}
.sneh-exp .sneh-lay::after{content:"";position:absolute;inset:0;pointer-events:none;
  background:linear-gradient(180deg,rgba(11,33,31,.05),rgba(11,33,31,.55))}
.sneh-exp .sneh-cnt{position:absolute;left:22px;bottom:20px;z-index:2;font-size:10px;
  letter-spacing:.2em;text-transform:uppercase;color:var(--sn-d2)}

/* ---------- rows ---------- */
.sneh-exp .sneh-row{padding:clamp(30px,4.6vh,48px) 0;
  border-bottom:1px solid var(--sn-line-d);cursor:pointer}
.sneh-exp .sneh-row:first-of-type{border-top:1px solid var(--sn-line-d)}
.sneh-exp .sneh-row-top{display:flex;flex-direction:row;align-items:baseline;gap:16px}
.sneh-exp .sneh-row-top > .elementor-widget{width:auto;flex:0 0 auto}
.sneh-exp .sneh-row-top > .sneh-h3{flex:1 1 auto;min-width:0}
.sneh-exp .sneh-ix .elementor-heading-title{font-family:var(--sn-sans);font-size:10px;
  letter-spacing:.18em;color:var(--sn-d3);
  font-variant-numeric:tabular-nums;font-weight:500;margin:0;line-height:1.6}
.sneh-exp .sneh-h3 .elementor-heading-title{font-family:var(--sn-serif);font-weight:300;
  letter-spacing:-.025em;line-height:1.05;color:var(--sn-d3);
  transition:color .55s var(--sn-ease);margin:0}
.sneh-exp .sneh-row.is-on .sneh-h3 .elementor-heading-title{color:var(--sn-d1)}
.sneh-exp .sneh-d{max-width:44ch;font-family:var(--sn-sans);font-size:13.5px;line-height:1.7;
  color:var(--sn-d3);margin:12px 0 0 26px;transition:color .55s var(--sn-ease);font-weight:300}
.sneh-exp .sneh-d p{margin:0;color:inherit;font-size:inherit;line-height:inherit;font-family:inherit}
.sneh-exp .sneh-row.is-on .sneh-d{color:var(--sn-d2)}
.sneh-exp .sneh-go{margin:16px 0 0 26px;opacity:0;transform:translateY(-6px);
  transition:opacity .5s var(--sn-ease),transform .5s var(--sn-ease)}
.sneh-exp .sneh-row.is-on .sneh-go{opacity:1;transform:none}
.sneh-exp .sneh-go .elementor-button{display:inline-flex;align-items:center;gap:9px;
  background:transparent;border:0;border-bottom:1px solid currentColor;border-radius:0;
  padding:0 0 5px;color:var(--sn-teal-lt);fill:currentColor;
  font-family:var(--sn-sans);font-size:11px;letter-spacing:.14em;text-transform:uppercase;
  font-weight:500;line-height:1.4;box-shadow:none;transition:gap .4s var(--sn-ease),color .4s var(--sn-ease)}
.sneh-exp .sneh-go .elementor-button:hover,
.sneh-exp .sneh-go .elementor-button:focus{gap:15px;background:transparent;color:var(--sn-coral)}
.sneh-exp .sneh-go .elementor-button-icon{transition:transform .5s var(--sn-ease)}
.sneh-exp .sneh-go .elementor-button:hover .elementor-button-icon{transform:translateX(3px)}

/* ---------- responsive ---------- */
@media(max-width:1024px){
  .sneh-exp .sneh-cols{flex-direction:column}
  .sneh-exp .sneh-media-col,
  .sneh-exp .sneh-list{flex:0 0 auto;width:100%}
  .sneh-exp .sneh-media-col{position:relative;top:0}
  .sneh-exp .sneh-media{height:56vh;min-height:340px}
  .sneh-exp .sneh-d{margin-left:0;max-width:100%}
  .sneh-exp .sneh-go{margin-left:0}
}
@media(max-width:767px){
  .sneh-exp .sneh-media{height:46vh;min-height:280px}
  .sneh-exp .sneh-row{padding:26px 0}
  .sneh-exp .sneh-go{opacity:1;transform:none}
  .sneh-exp .sneh-row .sneh-h3 .elementor-heading-title{color:var(--sn-d1)}
  .sneh-exp .sneh-d{color:var(--sn-d2)}
  .sneh-exp .sneh-cnt{left:16px;bottom:14px}
  .sneh-exp .sneh-row-top{gap:12px}
}
@media(prefers-reduced-motion:reduce){
  .sneh-exp .sneh-fade{opacity:1!important;transform:none!important}
  .sneh-exp *{transition-duration:.01ms!important}
}
"""

JS = """
(function(){
  function boot(root){
    if(!root || root.dataset.snehReady === '1') return;
    root.dataset.snehReady = '1';

    var rows = [].slice.call(root.querySelectorAll('.sneh-row'));
    var lays = [].slice.call(root.querySelectorAll('.sneh-lay'));
    if(!rows.length) return;

    var current = -1;
    function activate(i){
      if(i === current) return;
      current = i;
      rows.forEach(function(r,k){ r.classList.toggle('is-on', k === i); });
      lays.forEach(function(l,k){ l.classList.toggle('is-on', k === i); });
    }
    activate(0);

    rows.forEach(function(r,i){
      r.addEventListener('mouseenter', function(){ activate(i); });
      r.addEventListener('focusin', function(){ activate(i); });
    });

    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* scroll-linked activation: the last row whose top has crossed
       the 62% viewport line wins — monotonic, no dead zones. */
    var ticking = false;
    function sync(){
      ticking = false;
      var line = window.innerHeight * 0.62, idx = 0;
      for(var i = 0; i < rows.length; i++){
        if(rows[i].getBoundingClientRect().top <= line) idx = i;
      }
      activate(idx);
    }
    function onScroll(){
      if(ticking) return;
      ticking = true;
      window.requestAnimationFrame(sync);
    }
    window.addEventListener('scroll', onScroll, {passive:true});
    window.addEventListener('resize', onScroll, {passive:true});
    sync();

    /* fade-in reveals */
    var fades = [].slice.call(root.querySelectorAll('.sneh-fade'));
    if(!reduce && 'IntersectionObserver' in window){
      var fio = new IntersectionObserver(function(entries){
        entries.forEach(function(e){
          if(e.isIntersecting){ e.target.classList.add('is-in'); fio.unobserve(e.target); }
        });
      }, {rootMargin:'0px 0px -12% 0px', threshold:0.05});
      fades.forEach(function(el){ fio.observe(el); });
    } else {
      fades.forEach(function(el){ el.classList.add('is-in'); });
    }
  }

  function init(){
    document.querySelectorAll('.sneh-exp').forEach(boot);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }

  /* re-run inside the Elementor editor / after AJAX renders */
  if(window.jQuery){
    jQuery(window).on('elementor/frontend/init', function(){
      if(window.elementorFrontend && elementorFrontend.hooks){
        elementorFrontend.hooks.addAction('frontend/element_ready/global', init);
      }
    });
  }
})();
"""

media_html = ['<div class="sneh-media">']
for key, caption in LAYERS:
    media_html.append(
        '<div class="sneh-lay"><img src="{src}" alt="{alt}" loading="lazy" decoding="async">'
        '<span class="sneh-cnt">{alt}</span></div>'.format(src=ASSETS[key], alt=caption)
    )
media_html.append("</div>")
MEDIA_HTML = "\n".join(media_html)

ASSET_HTML = "<style>\n" + CSS.strip() + "\n</style>\n<script>\n" + JS.strip() + "\n</script>"


# ---------------------------------------------------------------- build tree
head = container(
    {
        "content_width": "boxed",
        "boxed_width": {"unit": "px", "size": 1180, "sizes": []},
        "padding": dim(0, 0, 0, 0),
        "margin": dim(0, 0, 54, 0),
        "margin_tablet": dim(0, 0, 36, 0),
        "flex_gap": {"unit": "px", "size": 0, "column": "0", "row": "0", "isLinked": True},
        "_css_classes": "sneh-head",
    },
    [
        heading("Six ways to be here", "div", "sneh-eyebrow sneh-fade",
                "rgba(242,244,241,.40)", "DM Sans", "500", [10, 10, 10], ls=0.26),
        heading("One resort,<br>six <em>experiences.</em>", "h2",
                "sneh-title sneh-fade", "#F2F4F1", "Fraunces", "300",
                [72, 52, 34], ls=-0.028, lh=1),
    ],
)

media_col = container(
    {
        "content_width": "full",
        "width": {"unit": "%", "size": 50, "sizes": []},
        "width_tablet": {"unit": "%", "size": 100, "sizes": []},
        "width_mobile": {"unit": "%", "size": 100, "sizes": []},
        "padding": dim(0, 0, 0, 0),
        "flex_gap": {"unit": "px", "size": 0, "column": "0", "row": "0", "isLinked": True},
        "_css_classes": "sneh-media-col",
    },
    [widget("html", {"html": MEDIA_HTML, "_css_classes": "sneh-media-w"})],
)

row_containers = []
for idx, (ix, title, desc, cta, href) in enumerate(ROWS):
    top = container(
        {
            "content_width": "full",
            "flex_direction": "row",
            "flex_align_items": "baseline",
            "flex_gap": {"unit": "px", "size": 16, "column": "16", "row": "16", "isLinked": True},
            "padding": dim(0, 0, 0, 0),
            "_css_classes": "sneh-row-top",
        },
        [
            heading(ix, "div", "sneh-ix", "rgba(242,244,241,.40)", "DM Sans", "500",
                    [10, 10, 10], ls=0.18),
            heading(title, "h3", "sneh-h3", "rgba(242,244,241,.40)", "Fraunces", "300",
                    [42, 32, 26], ls=-0.025, lh=1.05),
        ],
        inner=True,
    )

    text = widget("text-editor", {
        "editor": "<p>{}</p>".format(desc),
        "_css_classes": "sneh-d",
    })

    button = widget("button", {
        "text": cta,
        "link": {"url": href, "is_external": "", "nofollow": "", "custom_attributes": ""},
        "selected_icon": {"value": "fas fa-arrow-right", "library": "fa-solid"},
        "icon_align": "right",
        "icon_indent": {"unit": "px", "size": 9, "sizes": []},
        "button_type": "",
        "size": "xs",
        "_css_classes": "sneh-go",
        "align": "left",
    })

    row_containers.append(container(
        {
            "content_width": "full",
            "padding": dim(0, 0, 0, 0),
            "flex_gap": {"unit": "px", "size": 0, "column": "0", "row": "0", "isLinked": True},
            "_css_classes": "sneh-row",
        },
        [top, text, button],
    ))

list_col = container(
    {
        "content_width": "full",
        "width": {"unit": "%", "size": 50, "sizes": []},
        "width_tablet": {"unit": "%", "size": 100, "sizes": []},
        "width_mobile": {"unit": "%", "size": 100, "sizes": []},
        "padding": dim(0, 0, 0, 0),
        "flex_gap": {"unit": "px", "size": 0, "column": "0", "row": "0", "isLinked": True},
        "_css_classes": "sneh-list",
    },
    row_containers,
)

cols = container(
    {
        "content_width": "boxed",
        "boxed_width": {"unit": "px", "size": 1400, "sizes": []},
        "flex_direction": "row",
        "flex_align_items": "flex-start",
        "flex_gap": {"unit": "px", "size": 80, "column": "80", "row": "80", "isLinked": True},
        "flex_gap_tablet": {"unit": "px", "size": 40, "column": "40", "row": "40", "isLinked": True},
        "flex_gap_mobile": {"unit": "px", "size": 26, "column": "26", "row": "26", "isLinked": True},
        "flex_direction_tablet": "column",
        "flex_direction_mobile": "column",
        "padding": dim(0, 0, 0, 0),
        "_css_classes": "sneh-cols",
    },
    [media_col, list_col],
)

assets = container(
    {
        "content_width": "full",
        "padding": dim(0, 0, 0, 0),
        "_css_classes": "sneh-assets",
    },
    [widget("html", {"html": ASSET_HTML})],
)

section = container(
    {
        "content_width": "full",
        "html_tag": "section",
        "background_background": "classic",
        "background_color": "#0B211F",
        "padding": dim(150, 72, 150, 72),
        "padding_tablet": dim(100, 40, 100, 40),
        "padding_mobile": dim(72, 20, 72, 20),
        "flex_gap": {"unit": "px", "size": 0, "column": "0", "row": "0", "isLinked": True},
        "_css_classes": "sneh-exp",
    },
    [assets, head, cols],
)

template = {
    "content": [section],
    "page_settings": [],
    "version": "0.4",
    "title": "Six ways to be here — Experiences",
    "type": "section",
}

out = "/home/user/claude/elementor/six-ways-to-be-here.json"
with open(out, "w", encoding="utf-8") as f:
    json.dump(template, f, ensure_ascii=False, indent=2)

print("wrote", out)
