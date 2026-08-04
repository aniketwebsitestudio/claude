# Coming Soon page

## Files

- `sections/custom-coming-soon.liquid` — the section (logo/wordmark, eyebrow, heading, text, countdown, email signup, links, background image + overlay). Everything is editable in the theme customizer.
- `templates/page.coming-soon.json` — use it for a normal page (e.g. `/pages/coming-soon`).
- `templates/index.json` — the homepage, currently set to the coming soon section only.
- `templates/index.full-site.json` — a backup of the real homepage (hero, bestsellers, philosophy, regions, values).

- `snippets/inc-coming-soon-guard.liquid` — the "this page will be live soon" popup. The section renders it when **Navigation popup** is on.

## Navigation popup

While it is on, clicks on header and footer menu links, login/account, search and cart open a small closable popup instead of navigating. Search form submits are caught too. Escape, the backdrop, the ✕ and the button all close it.

Links inside the coming soon section (Instagram, contact) still work normally. To keep anything else clickable, add `data-coming-soon-allow` to it in the theme code.

Turn the setting off at launch.

## Going live

Copy the contents of `templates/index.full-site.json` into `templates/index.json` and push. The coming soon section stays available as a page template.

## Email signup

Submissions use Shopify's `customer` form, so subscribers land in **Customers** in the admin, tagged `newsletter` and `coming-soon`.

## Closing the whole store instead

This template only replaces the homepage — product and collection URLs stay reachable. To close the store entirely, use **Online Store → Preferences → Restrict store access** in the Shopify admin (password page). The two can be combined.
