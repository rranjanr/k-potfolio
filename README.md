# Vaishali Sharma: Portfolio Website

Personal portfolio site for Vaishali Sharma, UI/UX Designer & Front-End Developer. Static HTML/CSS/JS, no build step, deployed via GitHub Pages at [vaishalisharma.com.np](https://vaishalisharma.com.np).

## Structure

```
/
├── index.html                  Home
├── about.html                  About
├── contact.html                 Contact (Formspree-powered form)
├── portfolio/
│   ├── index.html                Case-study grid with category filters
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
│   │   └── pages/                    Page-specific overrides (home.css, about.css, resume.css)
│   ├── js/
│   │   ├── main.js                   Shared behaviour: nav, theme toggle, scroll fx, toasts
│   │   ├── contact-form.js            Contact form validation + Formspree submission
│   │   └── portfolio-filter.js         Portfolio category filter
│   ├── images/
│   │   ├── profile/                    Headshot
│   │   ├── portfolio/                   Optimized case-study screenshots, by project
│   │   └── og/                           Open Graph share images
│   └── documents/
│       └── vaishali-sharma-cv.pdf        Canonical CV (single source of truth)
├── googlec81928e7574fe83d.html   Google Search Console verification, do not move or rename
├── CNAME                         Custom domain for GitHub Pages
├── robots.txt / sitemap.xml      SEO
```

## Design system

Flat, editorial poster look: a warm paper background, near-black ink text, and one confident cobalt-blue accent (with a small poster-red secondary accent used sparingly on tags). Cards and buttons use a solid ink border plus a hard offset shadow instead of a soft blurred one, closer to a printed sticker than a frosted glass panel. Glassmorphism (blur + translucency) is reserved for a couple of deliberate spots only: the sticky navbar and a few hero badges, where a blurred surface earns its cost by staying legible over content moving underneath it.

Typography pairs `Bricolage Grotesque` (display headings, bold and a little unusual) with `Archivo` (body and UI text, a plain workhorse grotesk). All tokens live in `assets/css/base.css` as CSS custom properties. Light theme by default, dark theme via `[data-theme="dark"]` (toggled client-side, persisted in `localStorage`).

## Writing style

No em dashes, anywhere, in any content on this site (page copy, blog posts, comments). Use a period, comma, colon, or parentheses instead. Keep copy plain and specific: avoid generic marketing filler like "crafting," "seamless," "elevate," or "digital experiences."

## Adding a new page

1. Copy the `<head>` boilerplate, navbar, and footer from `index.html` (GA4 snippet, font links, `base.css`/`components.css`/`layout.css`, JSON-LD).
2. Mark the correct nav item `class="nav-link active"`.
3. Use root-relative asset paths (`/assets/...`); they resolve correctly at any folder depth.
4. Add the new URL to `sitemap.xml`.

## Local preview

```
npx serve .
```

or any static file server. No build step required.
