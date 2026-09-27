# Vaishali Sharma: Portfolio Website

Portfolio and services site for Vaishali Sharma, Graphic Designer & Social Media Marketer in Biratnagar, Nepal (graphic design, social media management, Meta ads; UI/UX as a secondary offering). Static HTML/CSS/JS, no build step, deployed via Cloudflare Pages (from GitHub) at [vaishalisharma.com.np](https://vaishalisharma.com.np).

## Structure

```
/
├── index.html                  Home
├── about.html                  About
├── contact.html                 Contact (Formspree-powered form)
├── biratnagar.html              Location page: Biratnagar & eastern Nepal
├── kathmandu.html               Location page: Kathmandu Valley (remote), with the live canvas scene (kathmandu-live.js)
├── services/
│   ├── index.html                Services hub
│   ├── graphic-design.html        Graphic design service
│   ├── social-media-management.html  Social media management service
│   └── meta-ads.html              Meta ads & Facebook boosting service
├── portfolio/
│   ├── index.html                Case-study grid with category filters
│   ├── rouniyar-international-bath-nepal.html  Case study: social media & Meta ads (current client)
│   ├── homeloom.html              Case study: furniture e-commerce
│   ├── streets-to-runways.html    Case study: footwear landing page + sign-in
│   ├── glam.html                   Case study: fashion e-commerce
│   └── wanderlust-diaries.html     Case study: travel blog
├── resume/index.html            Resume (embedded PDF + on-page summary)
├── blog/
│   ├── index.html                 Post listing
│   └── *.html                     Individual posts
├── assets/
│   ├── css/
│   │   ├── base.css                Design tokens (colors, type, spacing), reset, theme
│   │   ├── components.css          Nav, buttons, cards, footer, forms, toasts, glass utility
│   │   ├── layout.css               Shared section/grid patterns (hero, portfolio grid, blog, resume, etc.)
│   │   └── pages/                    Page-specific overrides (home.css, about.css, resume.css, 404.css, kathmandu.css)
│   ├── js/
│   │   ├── main.js                   Shared behaviour: nav, theme toggle, scroll fx, toasts
│   │   ├── contact-form.js            Contact form validation + Formspree submission
│   │   └── portfolio-filter.js         Portfolio category filter
│   │   └── 404.js                      404 artboard: shows the missing path, rulers, size badge, draggable 404
│   │   └── kathmandu-live.js           "Kathmandu Valley, live": procedural canvas scene driven by the real sun over Kathmandu
│   ├── fonts/                      Self-hosted Bricolage Grotesque + Archivo (woff2, latin + latin-ext, OFL)
│   ├── images/
│   │   ├── profile/                    Headshot
│   │   ├── portfolio/                   Optimized case-study screenshots, by project
│   │   └── og/                           Open Graph share images (1200x630, one per page; blog-post images also have .webp copies used in-page)
│   └── documents/
│       └── vaishali-sharma-cv.pdf        Canonical CV (single source of truth)
├── googlec81928e7574fe83d.html   Google Search Console verification, do not move or rename
├── 404.html                      Custom "artboard" 404 page (without a 404.html Cloudflare serves the homepage with a 200 for any URL)
├── _headers                      Cloudflare Pages response headers (security + caching)
├── robots.txt / sitemap.xml      SEO (robots.txt explicitly allows AI search crawlers)
├── llms.txt                      Plain-text site summary for AI assistants (llmstxt.org format); update it when pages are added
├── llms-full.txt                 Full readable text of every page for AI assistants (served with X-Robots-Tag: noindex)
├── docs/
│   ├── PROJECT-LOG.md            What was changed and why, GSC history, research, open to-dos (read first)
│   └── tools/                    og_images.py (share images), build_llms_full.py (regenerate llms-full.txt)
├── CLAUDE.md                     Rules and conventions for AI coding sessions
```

## Design system

Flat, editorial poster look: a warm paper background, near-black ink text, and one confident cobalt-blue accent (with a small poster-red secondary accent used sparingly on tags). Cards and buttons use a solid ink border plus a hard offset shadow instead of a soft blurred one, closer to a printed sticker than a frosted glass panel. Glassmorphism (blur + translucency) is reserved for a couple of deliberate spots only: the sticky navbar and a few hero badges, where a blurred surface earns its cost by staying legible over content moving underneath it.

Typography pairs `Bricolage Grotesque` (display headings, bold and a little unusual) with `Archivo` (body and UI text, a plain workhorse grotesk). Both are self-hosted from `assets/fonts/` (declared at the top of `base.css`, the two latin files preloaded in every `<head>`), so there is no request to Google Fonts. All tokens live in `assets/css/base.css` as CSS custom properties. Light theme by default, dark theme via `[data-theme="dark"]` (toggled client-side, persisted in `localStorage`).

## Writing style

No em dashes, anywhere, in any content on this site (page copy, blog posts, comments). Use a period, comma, colon, or parentheses instead. Keep copy plain and specific: avoid generic marketing filler like "crafting," "seamless," "elevate," or "digital experiences."

## Adding a new page

1. Copy the `<head>` boilerplate, navbar, footer, WhatsApp button and scripts from a similar existing page (idle-loaded GA4 snippet, self-hosted font preloads, `base.css`/`components.css`/`layout.css`, JSON-LD `@graph`, OG image).
2. Mark the correct nav item `class="nav-link active"`.
3. Use root-relative asset paths (`/assets/...`); they resolve correctly at any folder depth.
4. **Link to pages without `.html`** (`/about`, `/portfolio/glam`, `/blog/<slug>`). Cloudflare Pages 308-redirects every `.html` URL to its extensionless form, so `canonical`, `og:url`, JSON-LD `url`, sitemap `<loc>` and every internal `href` must use the extensionless URL. A `.html` canonical creates a redirect loop that Google reports as "Redirect error".
5. Add the new URL (extensionless) to `sitemap.xml`.
6. If the page matters for AI answers (a service, location or guide), add it to `llms.txt` too.
7. Every page carries one JSON-LD `@graph` that references `#person`, `#business` and `#website` by `@id`; copy that block from a similar page and change the page-specific nodes.

## Local preview

Run a server **from inside this folder** (it must be the web root, because every page loads `/assets/...` from the root):

```
npx serve .            # clean URLs (/about -> about.html) + custom 404, like production
npx wrangler pages dev .   # exact Cloudflare Pages emulation (also applies _headers)
```

VS Code **Live Server ("Go Live") is not a good fit**: opened from the parent folder it serves the site at `/k-potfolio/`, so no CSS loads and the page renders unstyled (the huge purple shape is the unsized WhatsApp icon). Even with its root set to this folder, it does not support clean URLs, so nav links like `/about` 404. The parent workspace has a ready-made VS Code task: Terminal, Run Task, "Preview site", then open http://localhost:3000.

## Performance notes

- Every in-page JPG has a `.webp` twin and is wrapped in `<picture>` (WebP first, JPG fallback). Add both files when adding images.
- GA4 is configured inline but the gtag library is loaded after `window.load` on idle, so analytics never blocks rendering. `main.js` sends `contact_click` (WhatsApp / email) and `contact-form.js` sends `generate_lead`.
- Never put `reveal-on-scroll` on anything in the first screen (hero, page-hero): it hides content until JavaScript runs and delays LCP.
- Lighthouse (mobile, Sept 2026): Performance 92 to 99, Accessibility, Best Practices and SEO 100 on all audited pages.
