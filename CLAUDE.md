# CLAUDE.md

Portfolio and services site for **Vaishali Sharma, Graphic Designer & Social Media Marketer in Biratnagar, Nepal** (https://vaishalisharma.com.np). Static HTML/CSS/JS, no build step, deployed by Cloudflare Pages from the GitHub repo `rranjanr/k-potfolio` (the whole repo root is published).

**Read `docs/PROJECT-LOG.md` first.** It records what was changed, why, the Search Console history, keyword research, verification results and the open to-do list. Add a dated entry there after any significant work. `README.md` covers structure and the design system.

## Rules that must not be broken

- **Extensionless URLs only.** Cloudflare Pages 308-redirects `/x.html` to `/x`. Every canonical, `og:url`, JSON-LD `url`, sitemap `<loc>` and internal `href` must use `/about`, `/portfolio/glam`, `/blog/<slug>` (directories keep the trailing slash). A `.html` canonical recreates the "Redirect error" loop that was fixed on 2026-09-27.
- **Profiles:** LinkedIn `vaishali-sharma01` and TikTok `@khuuushiiiiii` are in the footer and in JSON-LD `sameAs`; add new profiles in both places.
- **Content rules from the client:** no prices anywhere (use "Hire Me Now" / "Book a quick call" / "Get a quote"); phone only as the WhatsApp button (`https://wa.me/9779827303983`), never printed; real numbers only (1+ year graphic design, digital marketing since mid-2026, 2 brand accounts: Rouniyar International and Bath Nepal); no invented results, testimonials or follower counts.
- **Writing style:** no em dashes anywhere; no "crafting", "seamless", "elevate", "digital experiences". Plain, specific copy. Use "Facebook boost/boosting" alongside "Meta ads" (that is how Nepali buyers search).
- **Positioning:** graphic design, social media management and Meta ads for Nepal (Biratnagar in person, Kathmandu remote) come first. UI/UX and web work is secondary.
- **Spacing:** use `--nav-h` (fixed navbar height) for anything that must start below the header and `--section-y` for section padding (both in `base.css`). Do not hard-code large paddings like `8rem`.
- **Theme:** the theme is set by the inline script at the top of every `<head>` (keep it first, it prevents a dark-mode flash); the toggle animation lives in `main.js` (`THEME_MS`, `THEME_EASE`, `FEATHER`).
- **Performance:** never put `reveal-on-scroll` inside a page hero; keep fonts self-hosted (`assets/fonts/`); keep GA4 idle-loaded; give every in-page JPG a `.webp` twin inside `<picture>`; set real `width`/`height` on images.

## When adding or changing a page

1. Copy the closest existing page (head, nav, footer, WhatsApp button, scripts) and edit it. Mark the nav item `active`.
2. Unique `<title>` (about 60 chars) and meta description (under 160), one H1 with the target keyword and place.
3. Keep the JSON-LD `@graph` shape: shared `#website`, `#person`, `#business` nodes plus the page's own `WebPage`/`BreadcrumbList` and any `Service`, `FAQPage`, `BlogPosting` or `CreativeWork` node.
4. Add a share image: `python docs/tools/og_images.py <name>` (add it to `IMAGES` first).
5. Add the URL to `sitemap.xml` and `llms.txt`, then run `python docs/tools/build_llms_full.py` (add the page to its `ORDER` list).
6. Check locally with `npx wrangler pages dev .` (emulates the `.html` redirects, `404.html` and `_headers`).

## Do not commit

Search Console or analytics exports (`*.xlsx`, `*.csv`) and `.wrangler/` are gitignored because everything in the repo is published.
