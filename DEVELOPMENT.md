# Bhoomija — theme development

Local editing, live preview, deliberate publishing, and a way back.

The store is live. Everything below is arranged so that no ordinary step can
change what a customer sees; publishing is the only step that does, and it is
always a separate, manual act.

---

## The one thing that makes Shopify different

**The theme editor is a second author.** When anyone changes a section, a
setting or a block in Shopify admin, that writes to files you also have
locally:

    config/settings_data.json
    templates/*.json
    sections/*.json          (section groups: header, footer, overlay)

Git does not know those edits happened. A push from your machine will
overwrite them without a conflict and without a warning. This is the single
most common way theme work is lost, and no amount of branching protects
against it.

The rule that prevents it: **pull before you push.** It takes three seconds
and is written into the loop below.

Everything else — `.liquid`, `.css`, `.js` — is yours alone. The theme editor
never touches those.

---

## One-time setup

### 1. A restore point that does not depend on any of this

Shopify admin → Online Store → Themes → the live theme → ⋯ → **Duplicate**.
Rename it `BACKUP <date> — do not touch`.

That is a complete, publishable copy of the store as it is today. If
everything else goes wrong, publishing it puts the site back. Make a fresh
one before any large change; delete old ones when they stop being useful
(Shopify allows 20 themes).

### 2. Tools

    # Node 18+ first, then:
    npm install -g @shopify/cli@latest
    shopify version

### 3. Pull the live theme as the starting point

Not this repository — it holds only the files we added, not the whole theme.
Start clean, from what is actually running:

    mkdir bhoomija-theme && cd bhoomija-theme
    shopify theme list --store bhoomija-2.myshopify.com     # note the live theme's id
    shopify theme pull --store bhoomija-2.myshopify.com --theme <LIVE_ID>

A browser window opens once to authenticate.

### 4. Put it under git

    git init
    printf '.shopify/\nnode_modules/\n.DS_Store\n' > .gitignore
    git add -A
    git commit -m "Live theme as pulled on <date>"

Then create an empty repo on GitHub and:

    git remote add origin git@github.com:<you>/bhoomija-theme.git
    git branch -M main
    git push -u origin main

That first commit is the reference point for every later "what changed?".

### 5. A permanent staging theme

    shopify theme push --store bhoomija-2.myshopify.com --unpublished --theme "STAGING"

Note the id it prints. Everything gets previewed here before it goes live, on
the real store with real data — which is where problems actually show up.

---

## The daily loop

    git checkout main && git pull
    git checkout -b feature/footer-tweak

    shopify theme dev --store bhoomija-2.myshopify.com

`theme dev` serves the theme from your machine at <http://127.0.0.1:9292>
with hot reload, against live products and settings. **It does not write to
any theme.** Edit in your IDE, watch it update.

When it looks right:

    # 1. take on anything the theme editor changed while you were working
    shopify theme pull --store bhoomija-2.myshopify.com --theme <LIVE_ID> \
      --only config --only templates --only sections
    git add -A && git commit -m "Sync theme editor changes from live"

    # 2. put your work on staging and look at it properly
    shopify theme push --store bhoomija-2.myshopify.com --theme <STAGING_ID>

    # 3. commit, push, merge
    git add -A && git commit -m "Footer: ..."
    git push -u origin feature/footer-tweak

Step 1 is the one that saves you. If it brings down changes you did not make,
that is someone's work in admin — keep it.

### Going live

    git checkout main && git merge feature/footer-tweak && git push
    shopify theme push --store bhoomija-2.myshopify.com --theme <LIVE_ID>

Then tag it, so the state of the live store is recoverable by name:

    git tag -a live-2026-08-10 -m "Footer waitlist copy" && git push --tags

Prefer `shopify theme push` to the live theme over `shopify theme publish`:
publishing swaps which theme is live and loses the settings the live theme
carries. Pushing updates the theme that is already live.

If a change is large or you want a second pair of eyes, publish from admin
instead: preview STAGING, then Themes → STAGING → **Publish**.

---

## Getting back

**A bad change, minutes ago**

    git revert <commit>
    shopify theme push --store bhoomija-2.myshopify.com --theme <LIVE_ID>

**A bad change, and you want the whole site back now**

Admin → Themes → `BACKUP <date>` → **Publish**. Seconds, no CLI, works even
if your machine is not to hand. Then fix properly in git afterwards.

**Something broke and you do not know which change did it**

    git log --oneline
    git diff live-2026-08-10 HEAD -- assets/ sections/

---

## Before every publish

The theme owns the cart; it does not own checkout. Checkout is Shopify's and
nothing here can break it. The cart, though, is yours — test it on STAGING:

- [ ] Add to cart from a product page, and from a card if quick-buy is on
- [ ] Cart drawer opens, quantity changes, remove works
- [ ] Cart page loads, discount field accepts a code
- [ ] Checkout button reaches checkout
- [ ] Header, mobile drawer and search open
- [ ] A page loads that is not the home page (this store intercepts home page
      links — see below)
- [ ] Waitlist popup opens and submits; footer form submits
- [ ] A phone screen, not just a narrow desktop window

---

## Specific to this store

**`assets/custom-coming-soon.js` intercepts clicks.** While the shop is
pre-launch it blocks every header and footer menu link, and on the home page
every link that leaves the page, showing a "Coming soon" panel instead.

**When you start selling, this file must be dealt with first.** Left as it
is, it will block product links and anything else on the home page — the
store will look broken in a way that is easy to blame on something else.
Either delete the script tag from `layout/theme.liquid`, or empty `NOT_READY`
and set `IS_HOME` to `false`.

**`assets/custom-forms.js` styles the Shopify Forms app from outside.** The
app renders in a shadow root and its class names are hashed
(`_formSubmitButton_jnbzb_106`), so every selector matches on the middle
segment. If Shopify rebuilds the app those names change and the forms quietly
revert to their default look. Nothing breaks — they just stop being branded.
That is the cost of styling an app that offers no styling API, and it is
worth a look after any Forms app update.

**Two app embeds must stay on** in Customize → App embeds: Shopify Forms and
the currency converter. They are per-theme, so a newly duplicated theme
starts with them off — check after every duplicate.

**`assets/custom.css` on the live theme has drifted** from what is in the old
`aniketwebsitestudio/claude` repository. The live theme is the truth; that is
why setup starts with a pull.

---

## What about connecting GitHub to Shopify directly?

Shopify can watch a branch and deploy it to a theme automatically. It is a
good fit for a team with review, and a poor one for a single developer on a
live store: every merge is live immediately, and the two-way sync commits
theme editor changes back as its own commits, which is confusing when you are
also committing.

The CLI loop above keeps publishing as something you decide. Worth revisiting
when more than one person is working on the theme.
