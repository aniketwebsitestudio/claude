# "Six ways to be here" — Elementor template

`six-ways-to-be-here.json` is a ready-to-import Elementor template rebuilt from the
`#exp` section of the source HTML.

## Import

1. WordPress admin → **Templates → Saved Templates → Import Templates**
2. Upload `six-ways-to-be-here.json`
3. Edit any page with Elementor → folder icon in the widget panel → **My Templates** →
   insert **"Six ways to be here — Experiences"**

Needs Elementor **3.16+** (uses flexbox Containers). Nothing else — no add-ons, no GSAP.

## What's included

**Colors** (exact values from the source `:root`)

| Token | Value | Used for |
|---|---|---|
| `--sn-ink` | `#0B211F` | section background |
| `--sn-ink2` | `#153733` | media placeholder |
| `--sn-d1` | `#F2F4F1` | active headings |
| `--sn-d2` | `rgba(242,244,241,.66)` | active body copy |
| `--sn-d3` | `rgba(242,244,241,.40)` | inactive headings, eyebrow, index |
| `--sn-coral` | `#f49b7b` | the italic "experiences." |
| `--sn-teal-lt` | `#489a8f` | CTA links |
| `--sn-line-d` | `rgba(242,244,241,.13)` | row dividers |

**Fonts** — Fraunces (headings) + DM Sans (body), pulled from Google Fonts by the
template's own `@import`, with the same weights, letter-spacing and line-heights as
the source.

**Animation** — vanilla JS, no library:

- Sticky media column that cross-fades between the six images as you scroll
  (0.75s, `cubic-bezier(.16,1,.3,1)` — same easing as the original)
- Active row lights up: heading `d3 → d1`, body `d3 → d2`, CTA link fades/slides in
- Row activates when its top crosses the 62% viewport line (matching the original
  ScrollTrigger `top 62%`), plus hover and keyboard-focus activation
- Eyebrow + title fade/rise in on entry via `IntersectionObserver`
- Full `prefers-reduced-motion` support

**Responsive**

- **>1024px** — 50/50 split, media sticky at `top:12vh`, `76vh` tall
- **≤1024px** — stacks to one column, media unpins, `56vh`
- **≤767px** — media `46vh`, tighter row padding, all headings and CTAs shown at full
  contrast (no hover state to rely on)
- Heading sizes step down per breakpoint via Elementor's own responsive typography
  controls (72/52/34px title, 42/32/26px row headings), so they're editable in the UI

## Editing after import

Text, headings, links and typography are real Elementor widgets — edit them normally
in the panel. The only raw-code parts are two HTML widgets:

- the **first** widget in the section holds all CSS + JS
- the **media stack** widget in the left column holds the six `<img>` tags

## ⚠️ Replace the images

The image URLs are carried over from the source file and are signed Pikaso CDN links
that **expire 2026-08-02**. Before or right after importing, open the media stack HTML
widget in the left column and swap each `src` for your own WordPress media library URL.
Keep the surrounding markup — the `.sneh-lay` order maps 1:1 to the six rows:

| # | Layer caption | Row |
|---|---|---|
| 1 | Dam-view suite | Dam-view rooms |
| 2 | Lakeside tent | Luxury tents |
| 3 | Infinity pool | One-day picnic |
| 4 | Dining pavilion | Dining |
| 5 | Main lawn | Destination weddings |
| 6 | Offsite lawn | Corporate offsites |

The CTA links point at `#pkg`, `#enq` and `#occ` — repoint them to your real pages.

## Regenerating

`build_six_ways.py` generates the JSON; `preview.py` renders it into Elementor-like
markup (`preview.html`) for browser QA without a WordPress install.

```
python3 build_six_ways.py && python3 preview.py
```
