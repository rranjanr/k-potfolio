# Project Log: vaishalisharma.com.np

A record of what was changed on this site, why, and what is still open. Read this before making SEO, content or structural changes. Newest entry first. Add a new dated section for every significant piece of work.

---

## 2026-09-27 (later): Spacing system, smooth theme switch, TikTok

**Vertical spacing.** The owner reported too much space between the header and the hero. Measured on every page: 99px (home) and 77px (inner pages) from the fixed navbar to the first content, and 198 to 292px between sections on desktop, because heroes used a hard-coded `8rem + 2rem` top padding and every `.section` had 96px top and bottom padding.
- New tokens in `base.css`: `--nav-h: 68px` (fixed navbar height) and `--section-y: clamp(3rem, 1.8rem + 3.2vw, 5rem)` (48px on phones up to 80px on desktop).
- Home hero: `calc(var(--nav-h) + var(--sp-8))` top. Page heroes and the 404: `calc(var(--nav-h) + var(--sp-6))`. Sticky offsets (About photo, service sidebars, 404 layers panel) also key off `--nav-h`.
- Phone hero: column gap reduced to `--sp-6` and the "Open to work" sticker pulled in so it no longer touches the header.
- Result: inner pages start 33px below the header; section gaps are about 146 to 190px desktop and 100 to 145px on phones. **Use these tokens for new sections; do not hard-code large paddings.**

**Theme switch.** Previously the theme was applied after load (dark-mode visitors saw a light flash) and the toggle snapped instantly.
- A tiny inline script in every `<head>` sets `data-theme` before first paint (no flash). `main.js` keeps the toggle's `aria-pressed`, `aria-label` and `<meta name="theme-color">` in sync.
- Toggle animation: View Transitions API reveal of the new theme as a circle with a 140px feathered edge growing from the toggle (animated registered property `--vt-r` on a radial `mask-image`), 1300ms, `cubic-bezier(0.6, 0, 0.3, 1)`. It falls back to a hard-edged `clip-path` circle where registered properties are not supported, a 700ms colour cross-fade (`.theme-fade`) where View Transitions are not supported, and an instant switch under `prefers-reduced-motion`. The sun and moon icons rotate and cross-fade on the same curve. The owner asked for this to be slower and more polished after a first 650ms version. Constants live at the top of the theme section in `main.js` (`THEME_MS`, `THEME_EASE`, `FEATHER`).
- Verified in Chromium: sampled in-page, progress goes 0.03 at 300ms, 0.50 at 674ms, 0.95 at 1058ms and 1.0 at 1300ms. Dark mode is present at first paint after navigation. The fallback, reduced-motion and rapid double-click paths work with no JS errors.

**TikTok.** Added `https://www.tiktok.com/@khuuushiiiiii` (her account, given by the owner; TikTok blocks automated reading, so only the URL was confirmed to load) to the footer on every page, the Contact page social row, `sameAs` for `#person` and `#business`, `llms.txt` and `llms-full.txt`.

**Local preview.** VS Code Live Server opened from the parent folder serves the site at `/k-potfolio/`, so root-relative `/assets/...` fail and pages render unstyled; Live Server also cannot do clean URLs. Use `npx serve .` inside the repo, or the "Preview site" task in the parent workspace's `.vscode/tasks.json` (port 3000). The parent `.vscode/settings.json` also sets `liveServer.settings.root` to `/k-potfolio`.

---

## 2026-09-27 (later): Custom "artboard" 404 page

Replaced the plain 404 with a designed page that fits a graphic designer's portfolio. Files: `404.html`, `assets/css/pages/404.css`, `assets/js/404.js`.

- **Concept: "This page isn't on the artboard."** The page is a design canvas with rulers (numbers drawn by JS), a dotted grid and two dashed guides (one on the content's left edge, one on the numerals' baseline). A giant "404" in Bricolage Grotesque sits inside a live selection box with 8 handles and a `W x H` badge. The 0 is an SVG vector ring with cobalt anchor points and bezier handles, as if mid-edit with the pen tool. A "Vaishali" teammate cursor glides in once on load (disabled under `prefers-reduced-motion`).
- **Interaction:** visitors can drag the 404 layer (pointer events), or focus it and use the arrow keys (Shift for 40px steps). The badge switches to `X / Y` offsets; Esc or double-click resets. The layer is kept inside the canvas and stacks above the text.
- **Navigation as a layers panel:** the requested URL appears as a red, struck-through "Missing" layer (inserted with `textContent`, never as HTML). The real pages are the other layers (Home, Services with its 3 service pages, Portfolio, Blog, About, Contact), plus a WhatsApp fallback.
- **Analytics:** the 404 now loads the same idle GA4 snippet and sends a `page_not_found` event with `page_path` and `referrer`. Check it in GA4 to find and fix broken inbound links.
- Still returns HTTP 404 with `noindex`. Uses only existing theme tokens, so dark mode works automatically. Text on accent colours uses `--accent-ink`.
- **Verified:** html-validate clean. No overflow at 390px or 1280px, and no JS errors. Lighthouse (served as 200 for testing, since Lighthouse refuses 404 responses): Performance 91 to 92, Accessibility 100 (light and dark), Best Practices 100, CLS 0. Keyboard drag, focus ring and reduced motion were tested with Playwright.

---

## 2026-09-27: Repositioning for Nepal social media work, indexing fixes, SEO, AI visibility

Work done with Claude Code for Rahul (IVA Marketing) on Vaishali Sharma's site. Goal set by the user: **more site visits and impressions**, with the profile repositioned from "UI/UX Designer & Front-End Developer" to **Graphic Designer, Social Media Management and Meta Ads**, targeting **Nepal, especially Biratnagar and Kathmandu**.

### 1. Starting point

**Search Console export (last 3 months, to 2026-09-27):**

| Metric | Value |
|---|---|
| Clicks / impressions | 5 / 88 |
| Queries with data | 1 ("vaishali sharma linkedin", position 20) |
| Top pages | `/resume/` 43 impr, `/` 27, `/portfolio/` 24, `/blog/` 9 |
| Countries | India 45 impr, US 15, **Nepal 3** |
| Devices | Mobile 36 impr (pos 6.0), Desktop 51 (pos 16.9) |

The site ranked for nothing commercial and sent Google almost no Nepal signals. GSC also tracked `/portfolio/wanderlust-diaries` and `/portfolio/wanderlust-diaries.html` as two URLs.

**GSC page indexing errors reported by the user:**

| Report | Pages | Examples |
|---|---|---|
| Redirect error | 5 | `/portfolio/glam.html`, `/portfolio/homeloom.html`, `/about.html`, both blog posts |
| Page with redirect | 1 | `/portfolio/wanderlust-diaries.html` |
| Discovered, currently not indexed | 2 | `/contact.html`, `/portfolio/streets-to-runways.html` |

**Root causes (verified with curl against the live site):**

1. **Canonical/redirect loop.** Cloudflare Pages 308-redirects every `/x.html` to `/x`, but each page's `<link rel="canonical">` pointed back to `/x.html`. Google followed canonical, redirect, canonical: "Redirect error".
2. The sitemap listed `.html` URLs, so every non-directory URL in it redirected.
3. About 150 internal links used `.html`, so every internal click was a redirect hop. That starved `/contact` and `/portfolio/streets-to-runways` of crawl priority ("Discovered, not indexed").
4. "Page with redirect" for `wanderlust-diaries.html` is Google correctly noting the redirect. It is expected and harmless now.
5. **Soft 404s.** No `404.html` existed, so Cloudflare Pages served the homepage with status 200 for any unknown URL.
6. `www.vaishalisharma.com.np` returned Cloudflare error 522 (proxied DNS, not attached to the Pages project).
7. Cloudflare was blocking the **GPTBot and ClaudeBot** crawlers (HTTP 403), keeping the site out of ChatGPT's and Claude's knowledge. OAI-SearchBot, Claude-SearchBot and PerplexityBot were allowed.

Other audit findings: the homepage claimed "3+ years, 12+ projects, 100% satisfaction" while the CV said "6+ months, 8+ projects"; Instagram and GitHub footer links were `href="#"`; a full-screen loading overlay and a typing animation delayed LCP; portfolio screenshots were 440 to 560 KB JPGs; the app icon was a 471 KB photo; share images still said "UI/UX Designer & Front-End Developer".

### 2. Research

**Keyword data (Semrush, Nepal database, Sept 2026):**

| Keyword | Volume/mo | KD |
|---|---|---|
| social media marketing agency in nepal | 1,900 | 11 |
| digital marketing in nepal | 720 | 18 |
| digital marketing agency in nepal | 590 | 9 |
| digital marketing in kathmandu | 320 | 18 |
| logo design in nepal | 170 | 17 |
| digital marketing company in nepal | 170 | 20 |
| social media marketing in nepal | 90 | ~0 |
| graphic design in nepal | 50 | ~0 |
| graphic designer in kathmandu / in nepal | 20 each | ~0 |
| facebook boost nepal, facebook boosting in nepal, facebook boost price in nepal | 20 each | ~0 |
| Biratnagar terms (graphic designer / social media / digital marketing in biratnagar) | below Semrush threshold | low competition |

Takeaways:
- Nepali buyers say **"Facebook boost/boosting"** more than "Meta ads". Copy uses both.
- Individual freelancers already rank on page 1 for "digital marketing in nepal" (for example `bimalrp.com/digital-marketing-expert-nepal/`, `arjankc.com.np`). Their pattern: long service page, process, proof, locations, FAQ, repeated CTAs.
- Biratnagar SERPs are agency listicles (Ads Bee Media, Shiv IT, iide, aamax). No individual freelancer owns them.
- Searching "Vaishali Sharma" returns several other designers in India, so the site and `llms.txt` explicitly say "Vaishali Sharma, Biratnagar, Nepal".

**Client work (from the public Instagram accounts she manages, checked 2026-09-27):**
- `@rouniyarinternational`: authorized importer/distributor of Dual Copper and Discover water pump motors. 45 posts, 32 followers. Taglines seen: "Powering your business", "Better products, bigger business".
- `@bathnepal`: the same company's bathroom products brand. 38 posts, 11 followers. Tagline: "Modern bathroom solutions for tomorrow", "Build better baths together".
- Content: Teej and Vishwakarma Puja greetings in Nepali, product reels, wholesale promo videos, trend reels, near-daily posting in September 2026.
- LinkedIn (`/in/vaishali-sharma01`) is behind a login wall and could not be read; background details come from the CV PDF.

### 3. Decisions made by the user (binding content rules)

- **No prices anywhere.** Use "Hire Me Now", "Book a quick call", "Get a quote" CTAs.
- **Phone only as a WhatsApp button** (`https://wa.me/9779827303983`, number from the CV). Never print the number as text.
- **UI/UX and web work stays as a secondary offering** (the four web case studies are kept).
- **Truthful numbers only:** 1+ year of graphic design; digital marketing since mid-2026 (3 months as of Sept 2026: content creation, video editing, AI video generation, script writing, Meta ads, lead replies, social media engagement); 2 brand accounts (Rouniyar International and Bath Nepal, same company); 6 web interfaces designed during the Clove I.T. internship. Do not publish follower counts or invented results.
- Existing house rules from the README still apply: **no em dashes**, no filler words ("crafting", "seamless", "elevate", "digital experiences").

### 4. What changed

**Indexing and technical**
- URL policy is now **extensionless everywhere** (`/about`, `/portfolio/glam`, `/blog/<slug>`; directories keep a trailing slash). Canonicals, `og:url`, JSON-LD and all internal links were rewritten.
- `sitemap.xml` rebuilt: 23 extensionless URLs, real `lastmod`, no `changefreq`/`priority`.
- `404.html` added (real 404 status, noindex).
- `_headers` added: security headers, cache rules for `/assets/images|css|js`, `X-Robots-Tag: noindex` for `llms*.txt` and `/docs/*`.
- `robots.txt` explicitly allows AI search and assistant crawlers.
- Removed the invalid `<meta http-equiv="X-Content-Type-Options">` from all pages.
- Removed files: `CNAME` (Cloudflare ignores it), duplicate `assets/images/favicon/favicon.ico`, unused 231 KB `favicon.svg`, local `.wrangler/` cache, empty `.claude/`. The GSC `.xlsx` export was moved out of the repo to the parent folder (`khushi Portfolio/`), and `.gitignore` now blocks `*.xlsx`, `*.csv` and `.wrangler/`.

**New pages (12)**

| URL | Target |
|---|---|
| `/services/` | social media marketing / digital marketing in Nepal (hub) |
| `/services/graphic-design` | graphic designer in Biratnagar / Nepal, logo design in Nepal |
| `/services/social-media-management` | social media management / handling in Nepal |
| `/services/meta-ads` | Meta ads, Facebook boosting in Nepal |
| `/biratnagar` | graphic design, social media, digital marketing in Biratnagar (in person; Itahari, Dharan, Inaruwa, Damak, Birtamod) |
| `/kathmandu` | social media marketing in Kathmandu (remote; Lalitpur, Bhaktapur, Kirtipur) |
| `/portfolio/rouniyar-international-bath-nepal` | case study of the current client work |
| `/blog/facebook-boost-vs-meta-ads-manager-nepal` | boost vs Ads Manager |
| `/blog/how-to-pay-for-facebook-ads-from-nepal` | paying for ads from Nepal |
| `/blog/festival-social-media-posts-nepal` | festival content plan (Dashain, Tihar, Chhath...) |
| `/blog/get-more-messages-facebook-page-nepal` | getting more Facebook messages |

The Biratnagar and Kathmandu pages have genuinely different content (not templated) to avoid doorway-page problems.

**Rewritten pages:** home (new hero, services, current work, process, web work as secondary, areas, FAQ, blog, CTA), about (new story and experience timeline), contact (new H1, WhatsApp, "service needed" dropdown, service areas), portfolio index (Social Media and Ads filter plus the new case study), resume (truthful stats, new experience and skills), blog index (new posts first). The four web case studies and two older UI posts kept their body copy but got new head tags, schema, nav, footer and share images.

**Site-wide**
- Nav: Home, Services, Portfolio, About, Blog, Contact (Resume moved to the footer and About page).
- Footer: 4 columns (brand, Services, Site, Get in touch) with LinkedIn and WhatsApp links. The dead Instagram and GitHub `#` links were removed.
- Floating WhatsApp button on every page.
- One JSON-LD `@graph` per page: `WebSite` (`/#website`), `Person` (`/#person`), `ProfessionalService` (`/#business`, `areaServed` Biratnagar to Bhaktapur plus Nepal), `WebPage` (or `ProfilePage`/`ContactPage`/`CollectionPage`), `BreadcrumbList`, plus `Service`, `FAQPage`, `BlogPosting` or `CreativeWork` where relevant. FAQs are rendered on the page and in `FAQPage` from the same source.
- Visible breadcrumbs on all inner pages.
- GA4 events: `contact_click` (method whatsapp/email, from `main.js`) and `generate_lead` (contact form success, from `contact-form.js`).

**AI visibility**
- `llms.txt`: key facts plus a link index (llmstxt.org format).
- `llms-full.txt`: full readable text of 22 pages as Markdown (about 15,500 words). Both are `noindex` via `_headers` so they never compete with real pages in Google.

**Graphics**
- 23 new Open Graph images (1200x630) in the current brand style (paper background, ink, cobalt `#1d3ed8`, poster red `#d6372b`, Bricolage Grotesque, hard-shadow sticker cards), one per page, each with a matching illustration. Blog-post images double as blog card thumbnails and post covers (with `.webp` copies).
- New icon set from the "VS" mark (favicon.ico, 96px, apple-touch 180px, maskable 192/512px). Icons went from 618 KB to about 20 KB. `site.webmanifest` updated.

**Performance and accessibility**
- Fonts self-hosted in `assets/fonts/` (declared at the top of `base.css`, the two latin files preloaded). No Google Fonts request.
- GA4 library loads after `window.load` on idle (events still queue from the start).
- Loading overlay and hero typing animation removed. `reveal-on-scroll` is never applied inside the page hero.
- Every in-page JPG has a `.webp` twin in `<picture>`. The hero portrait has a responsive `srcset` (480/760/1200 w). Image weight went from 4.9 MB to 2.4 MB.
- `img { height: auto }` added (fixed squashed full-page screenshots).
- Heading order fixed (footer labels, process cards, resume, contact), honeypot field labelled, dark-mode contrast tokens raised (`--text-tertiary #9d957f`, `--accent #8295ff`, `--stamp #ff806a`).
- Shared components moved into `components.css` (process grid, CTA band, hero actions, service cards, FAQ, check list, split layout, WhatsApp button) so every page can use them.

### 5. Verification (2026-09-27, local Cloudflare emulation with `npx wrangler pages dev .`)

- All 23 sitemap URLs return 200 with no redirect, and each canonical equals its own URL.
- Old `.html` URLs return 308 to the extensionless URL. Unknown URLs return 404.
- Every internal `href`/`src` returns 200. No `.html` internal links, no `href="#"`, no em dashes, one H1 per page, all JSON-LD parses.
- `html-validate` (recommended ruleset, style rules relaxed) passes on all 24 HTML files.
- Playwright check at 375px and 1280px: no horizontal overflow, no JS errors.

Lighthouse 12, mobile emulation:

| Page | Perf | A11y | Best practices | SEO | LCP |
|---|---|---|---|---|---|
| `/` (before) | 62 | 94 | 100 | 100 | 5.4 s |
| `/` (after) | 98 | 100 | 100 | 100 | 2.2 s |
| `/services/` | 97 | 100 | 100 | 100 | 1.9 s |
| `/services/meta-ads` | 95 | 100 | 100 | 100 | 1.9 s |
| `/services/graphic-design` | 92 | 100 | 100 | 100 | 1.9 s |
| `/biratnagar` | 93 | 100 | 100 | 100 | 2.0 s |
| `/kathmandu` | 98 | 100 | 100 | 100 | 1.9 s |
| `/about` | 99 | 100 | 100 | 100 | 2.0 s |
| `/contact` | 98 | 100 | 100 | 100 | 1.9 s |
| `/portfolio/` | 98 | 100 | 100 | 100 | 2.2 s |
| `/blog/` | 98 | 100 | 100 | 100 | 2.4 s |
| `/resume/` | 96 | 100 | 100 | 100 | 2.2 s |

(Resume keeps one non-scored `bf-cache` note caused by the embedded PDF.)

### 6. Still to do (owner actions, outside the code)

1. **Commit and push** to GitHub so Cloudflare deploys.
2. **Cloudflare, AI crawlers:** Security, Bots (or AI Crawl Control): allow GPTBot and ClaudeBot. Until then the site cannot enter those models' knowledge.
3. **Cloudflare, www:** Pages project, Custom domains, add `www.vaishalisharma.com.np`, then a Redirect Rule `www.*` to `https://vaishalisharma.com.np/${1}` (301).
4. **Search Console:** resubmit `sitemap.xml`; "Validate fix" on Redirect error; request indexing for `/`, `/services/`, the three service pages, `/biratnagar`, `/kathmandu`, `/contact`. Ignore "Page with redirect" for old `.html` URLs.
5. **Google Business Profile** as a service-area business in Biratnagar (categories: Graphic designer, Marketing consultant; areas: Biratnagar, Itahari, Dharan, Kathmandu), linked to the site. This is the biggest lever for local "near me" and map results.
6. **Update the CV PDF** (`assets/documents/vaishali-sharma-cv.pdf`): it still says "6+ months, 8+ projects".
7. Update the LinkedIn headline, and her Instagram/Facebook bios, to the new positioning with a link to the site. Add her own Instagram/Facebook/Behance URLs to the footer and to `sameAs` in the JSON-LD once they exist.
8. Profiles on Behance, Upwork, Twine and Truelancer (they rank for Biratnagar searches) linking back to the site.

### 7. Open items to confirm with the client

- WhatsApp number `+977 9827303983` (taken from the CV) is correct and on WhatsApp.
- Inferred details in the case study: audiences (builders, farmers, dealers) and product types (taps, bathroom fittings) come from what the Instagram posts show. The About page and resume say graphic design since 2025, derived from "1+ year".
- Where Rouniyar International is based is not stated anywhere on the site (unknown).
- The dollar-card post deliberately gives no USD limit: sources conflict (Global IME Bank, March 2025: USD 500/year under NRB rules; 2026 reports say the cap was relaxed). Revisit when NRB rules are clear.
- Old UI blog posts still end with "Start a Conversation" rather than "Hire Me Now" (left as is).

### 8. How to work on this site now

- **Pages are hand-maintained static HTML.** A one-off Python generator was used during this session to produce them consistently; it is not part of the repo. The HTML files are the source of truth now. To add a page, copy the closest existing page and change its content, head tags and JSON-LD page nodes (see README "Adding a new page").
- **Share images:** `python docs/tools/og_images.py [name ...]` (Playwright). Add an entry to `IMAGES` for a new page.
- **AI files:** add new pages to `llms.txt` by hand, then run `python docs/tools/build_llms_full.py` (add the page to its `ORDER` list first).
- **Local preview that matches production:** `npx wrangler pages dev .` (then stop it; it leaves a `.wrangler/` cache, which is gitignored).
- **Measure:** check GSC 4 to 6 weeks after deploy for impressions on Nepal queries; GA4 `contact_click` and `generate_lead` show which pages produce leads.

### 9. Ideas for the next round

- Add real design samples (posts, festival greetings, ad creatives) as an image gallery on `/services/graphic-design` and a "Social media designs" portfolio page, once the client sends files.
- Add 2 or 3 client testimonials with name, business and city (Review schema only for real reviews).
- More Nepal-specific posts: Dashain and Tihar ad timing, TikTok vs Instagram Reels for Nepali shops, restaurant and clinic social media guides, a Biratnagar business case study.
- Consider a Nepali-language version of the key service pages later (with hreflang).
- Replace the portfolio-card SVG illustration with real screenshots of the two Instagram accounts if the client allows.
