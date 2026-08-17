# nautgate-web

Landing site for [nautgate.dev](https://nautgate.dev) — the marketing front for
[NautGate](https://github.com/48Nauts-Operator/NautGate).

Plain static HTML/CSS plus ~25 lines of JS. No framework, no build step: the
repo *is* the site, and GitHub Pages uploads it as-is.

## Layout

```
index.html      landing
glossary.html   the terms, with a client-side category filter
releases.html   release notes and live GitHub adoption numbers
blog/           Markdown sources plus generated article pages
privacy.html    cookieless-analytics disclosure  (noindex)
terms.html      AGPL summary + commercial licence (noindex)
css/style.css   the whole stylesheet
js/main.js      release stats, menus, lightbox, copy + glossary filter
fonts/          self-hosted latin subsets (Space Grotesk, Inter, JetBrains Mono)
assets/         brand marks, OG image, dashboard screenshots
feed.xml        RSS feed for engineering notes
sitemap.xml     canonical indexable URLs and honest modification dates
```

Blog articles are authored in Markdown and rendered with the checked-in Pandoc
template. For example:

```bash
pandoc blog/tailscale-first-network-wide-nautgate.md \
  --wrap=none \
  --template=scripts/blog-template.html \
  --lua-filter=scripts/pandoc-drop-title.lua \
  -V canonical=https://nautgate.dev/blog/tailscale-first-network-wide-nautgate.html \
  -V displaydate='17 August 2026' \
  -o blog/tailscale-first-network-wide-nautgate.html
```

## Develop

```bash
just serve      # python -m http.server 4321
just check-seo  # metadata, canonicals, JSON-LD, sitemap, feed and share card
```

Bump the `?v=N` on the CSS/JS `<link>`/`<script>` tags whenever you change them —
Pages serves assets with `max-age=600` behind Cloudflare, so an unversioned edit
can take ten minutes to appear.

## Design source

Colours, type and the mark come from `docs/brand.md` in the NautGate repo — that
file is the source of truth, not this stylesheet. The layout was designed in
Paper (`nautgate.dev — landing` / `— glossary` artboards).

Screenshots are regenerated from a live gateway with
`node scripts/shoot-dashboard.mjs` in the NautGate repo, then copied into
`assets/screenshots/`.

## Deploy

`main` → GitHub Pages via `.github/workflows/pages.yml`. Forgejo
(`48Nauts/nautgate-web`) is the source of truth; GitHub is the deploy mirror.

```bash
just push       # both remotes
```
