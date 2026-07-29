# "Six ways to be here" — Elementor section

Exact port of the `#exp` section from the source HTML: same colors, fonts, easings and
GSAP animation, in one self-contained block.

## Why the first version looked wrong

On your site everything from Elementor's own widget settings applied (dark background,
Fraunces headings, dimmed heading colors) but nothing from the CSS did — default blue
buttons, no dividers, no animation. That's Elementor's template importer sanitizing
`<style>` and `<script>` out of the HTML widget on import.

So this version doesn't depend on the import carrying the code. Everything — markup,
CSS and JS — is one HTML widget you can paste in by hand.

## Recommended: paste it (most reliable)

1. Edit the page with Elementor
2. Drag in an **HTML** widget where the section should go
3. Open `six-ways.html`, copy **all** of it, paste into the widget's HTML box
4. Update → view the page (animations don't run inside the editor canvas)

Set the widget's parent container to **full width** with **zero padding** — the section
brings its own `clamp(20px,5vw,72px)` padding, same as the source.

## Or import the JSON

`six-ways-to-be-here.json` → Templates → Saved Templates → Import Templates. It's the
same block wrapped in a full-width container. If the code survives your site's
sanitizing it works as-is; if the section comes in looking unstyled again, the import
stripped it — fall back to the paste method above.

## What it does

**Animation** — ported verbatim from the source, same GSAP + ScrollTrigger:

| Effect | Timing |
|---|---|
| "One resort, / six experiences." masked line reveal | `yPercent 118 → 0`, 1.2s, `expo.out`, 0.085s stagger, fires at `top 86%` |
| Eyebrow fade + rise | opacity → 1 and `y 22 → 0`, 0.9s, `expo.out`, at `top 90%` |
| Sticky image cross-fade | 0.75s `expo.out`, driven by the active row |
| Row activation | own scroll math on the same 62% viewport line, plus hover and keyboard focus |
| Row states | heading `d3 → d1`, body `d3 → d2`, CTA fades/slides in, 0.55s `cubic-bezier(.16,1,.3,1)` |

GSAP 3.12.5 loads from jsDelivr at runtime (skipped if your site already has it). If
the CDN is blocked, the reveals fall back to CSS transitions with the same timings.

**Row activation deliberately does not use ScrollTrigger.** Some themes and
smooth-scroll plugins scroll a wrapper element rather than the window, and
ScrollTrigger's triggers then never fire — the section sticks on row 01 and only
responds to hover. Reading element rects each frame works no matter which element is
doing the scrolling. The loop only runs while the section is near the viewport, and
only acts when the scroll-derived row actually changes, so hovering a row still keeps
it active until you scroll — same feel as the source.

Verified stepping 01 → 06 one row at a time in three setups: GSAP present, GSAP CDN
blocked, and a wrapper-scrolls-instead-of-window page (which the ScrollTrigger version
failed).

**Colors** — the source's exact tokens: `#0B211F` ink, `#F2F4F1` / `.66` / `.40` text
tiers, `#f49b7b` coral italic, `#489a8f` teal links, `rgba(242,244,241,.13)` dividers.

**Fonts** — Fraunces + DM Sans via the block's own `@import`, with the source's
weights, `letter-spacing`, `line-height` and `font-variation-settings:"opsz" 96`.

**Responsive** — the source's own breakpoint at 980px (grid collapses to one column,
media unpins to `56vh`), plus a 767px pass: media `46vh`, indents dropped, and headings
and CTAs shown at full contrast since there's no hover on touch.

Everything is scoped under `#sneh-exp` so theme styles can't leak in — tested against a
theme that sets its own link colors, article borders, heading fonts and paragraph
styles, all correctly overridden.

## ⚠️ Replace the images

The six image URLs are the signed Pikaso CDN links from your source file and they
**expire 2026-08-02**. Swap each `src` in the `.media` block for your own media library
URL. Order maps 1:1 to the rows:

| # | Caption | Row |
|---|---|---|
| 1 | Dam-view suite | Dam-view rooms |
| 2 | Lakeside tent | Luxury tents |
| 3 | Infinity pool | One-day picnic |
| 4 | Dining pavilion | Dining |
| 5 | Main lawn | Destination weddings |
| 6 | Offsite lawn | Corporate offsites |

CTA links point at `#pkg`, `#enq`, `#occ` — repoint them to your real pages.

## Files

- `six-ways.html` — the block (paste this)
- `six-ways-to-be-here.json` — same block as an Elementor template
- `build_six_ways.py` — regenerates the JSON from the HTML
