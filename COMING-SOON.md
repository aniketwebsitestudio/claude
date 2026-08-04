# Coming Soon page

## Files

- `sections/custom-coming-soon.liquid` — the section (logo/wordmark, eyebrow, heading, text, countdown, email signup, links, background image + overlay). Everything is editable in the theme customizer.
- `templates/page.coming-soon.json` — use it for a normal page (e.g. `/pages/coming-soon`).
- `templates/index.json` — the homepage, currently set to the coming soon section only.
- `templates/index.full-site.json` — a backup of the real homepage (hero, bestsellers, philosophy, regions, values).

## Going live

Copy the contents of `templates/index.full-site.json` into `templates/index.json` and push. The coming soon section stays available as a page template.

## Email signup

Submissions use Shopify's `customer` form, so subscribers land in **Customers** in the admin, tagged `newsletter` and `coming-soon`.

## Closing the whole store instead

This template only replaces the homepage — product and collection URLs stay reachable. To close the store entirely, use **Online Store → Preferences → Restrict store access** in the Shopify admin (password page). The two can be combined.
