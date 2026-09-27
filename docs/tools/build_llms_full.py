"""Rebuild llms-full.txt: the readable text of every indexable page, as Markdown.

Usage (from the repo root, standard library only):
    python docs/tools/build_llms_full.py

Run it after changing page content. When you add a page, add it to ORDER below
(and add a one-line entry to llms.txt by hand). The header of llms-full.txt is
copied from the key-facts block at the top of llms.txt.
"""
import html
import pathlib
import re
from html.parser import HTMLParser

ROOT = pathlib.Path(__file__).resolve().parents[2]  # repo root
SITE = "https://vaishalisharma.com.np"

ORDER = [
    ("index.html", "/"), ("services/index.html", "/services/"),
    ("services/graphic-design.html", "/services/graphic-design"),
    ("services/social-media-management.html", "/services/social-media-management"),
    ("services/meta-ads.html", "/services/meta-ads"),
    ("biratnagar.html", "/biratnagar"), ("kathmandu.html", "/kathmandu"),
    ("portfolio/rouniyar-international-bath-nepal.html", "/portfolio/rouniyar-international-bath-nepal"),
    ("about.html", "/about"), ("resume/index.html", "/resume/"), ("contact.html", "/contact"),
    ("blog/facebook-boost-vs-meta-ads-manager-nepal.html", "/blog/facebook-boost-vs-meta-ads-manager-nepal"),
    ("blog/how-to-pay-for-facebook-ads-from-nepal.html", "/blog/how-to-pay-for-facebook-ads-from-nepal"),
    ("blog/festival-social-media-posts-nepal.html", "/blog/festival-social-media-posts-nepal"),
    ("blog/get-more-messages-facebook-page-nepal.html", "/blog/get-more-messages-facebook-page-nepal"),
    ("portfolio/homeloom.html", "/portfolio/homeloom"),
    ("portfolio/streets-to-runways.html", "/portfolio/streets-to-runways"),
    ("portfolio/glam.html", "/portfolio/glam"),
    ("portfolio/wanderlust-diaries.html", "/portfolio/wanderlust-diaries"),
    ("blog/ui-ux-design-process-case-study-walkthrough.html", "/blog/ui-ux-design-process-case-study-walkthrough"),
    ("blog/glassmorphism-vs-neumorphism-vs-flat-design-2026.html", "/blog/glassmorphism-vs-neumorphism-vs-flat-design-2026"),
]

SKIP_TAGS = {"svg", "script", "style", "form", "button", "nav", "select", "noscript", "picture", "embed", "figure"}
SKIP_CLASSES = {"cta-band", "hero-actions", "page-hero-actions", "case-nav", "portfolio-filters", "blog-card",
                "portfolio-card", "stats-row", "hero-stats", "skill-bar-track", "form-success", "breadcrumb",
                "post-cover", "btn", "eyebrow", "step-num", "tag", "card-link", "card-meta", "pill-row",
                "service-icon", "hero-visual", "about-teaser-image", "bio-image", "resume-embed", "resume-fallback"}
BLOCK = {"p", "li", "h1", "h2", "h3", "h4", "summary", "dt", "dd", "figcaption", "blockquote", "div", "section", "article"}
VOID = {"br", "img", "source", "input", "meta", "link", "hr", "wbr"}


class MD(HTMLParser):
    """Minimal HTML to Markdown: headings, paragraphs, lists, tables, FAQs, links."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out, self.buf, self.skip = [], "", 0
        self.lists, self.cells, self.rows, self.href = [], None, 0, None

    def block(self, text, kind="p"):
        self.out.append((kind, text))

    def flush(self, prefix="", kind="p"):
        t = re.sub(r"\s+", " ", self.buf).strip()
        t = re.sub(r"\*\*\s*\*\*", "", t).strip()
        if t:
            self.block(prefix + t, kind)
        self.buf = ""

    def handle_starttag(self, tag, attrs):
        if tag in VOID:
            if tag == "br":
                self.buf += " "
            return
        if self.skip:
            self.skip += 1
            return
        a = dict(attrs)
        if tag in SKIP_TAGS or set((a.get("class") or "").split()) & SKIP_CLASSES:
            self.skip = 1
            return
        if tag in BLOCK or tag in ("ul", "ol", "table"):
            self.flush()
        if tag in ("ul", "ol"):
            self.lists.append([tag == "ol", 0])
        elif tag == "li" and self.lists:
            self.lists[-1][1] += 1
        elif tag == "table":
            self.rows = 0
        elif tag == "tr":
            self.cells = []
        elif tag in ("td", "th"):
            self.buf = ""
        elif tag in ("strong", "b"):
            self.buf += "**"
        elif tag == "a":
            href = a.get("href", "")
            self.href = (SITE + href) if href.startswith("/") else href

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        if self.skip:
            self.skip -= 1
            return
        if tag in ("strong", "b"):
            self.buf += "**"
        elif tag == "a":
            h = self.href or ""
            if h.startswith("http") and "wa.me" not in h:
                self.buf += " (%s)" % h
            self.href = None
        elif tag in ("td", "th"):
            self.cells.append(re.sub(r"\s+", " ", self.buf).strip())
            self.buf = ""
        elif tag == "tr":
            self.block("| " + " | ".join(self.cells) + " |", "table")
            self.rows += 1
            if self.rows == 1:
                self.block("|" + " --- |" * len(self.cells), "table")
            self.cells = None
        elif tag in ("h1", "h2", "h3", "h4"):
            self.flush("#" * (int(tag[1]) + 1) + " ", "h")
        elif tag == "li":
            ol, n = self.lists[-1] if self.lists else (False, 0)
            self.flush(("%d. " % n) if ol else "- ", "li")
        elif tag == "summary":
            self.flush("**Q:** ", "q")
        elif tag in ("ul", "ol"):
            self.flush()
            if self.lists:
                self.lists.pop()
        elif tag == "dt":
            self.buf += ":"
            self.flush("- ", "li")
        elif tag == "dd":
            self.flush("  ", "dd")
        elif tag in BLOCK:
            self.flush()

    def handle_data(self, data):
        if not self.skip:
            self.buf += data


def level(block):
    return len(block[1]) - len(block[1].lstrip("#")) if block[0] == "h" else 99


def drop_empty_headings(blocks):
    keep = []
    for i, blk in enumerate(blocks):
        if blk[0] == "h":
            nxt = blocks[i + 1] if i + 1 < len(blocks) else None
            if nxt is None or (nxt[0] == "h" and level(nxt) <= level(blk)):
                continue
        keep.append(blk)
    return keep


def render(blocks):
    blocks = drop_empty_headings(drop_empty_headings(blocks))
    lines, prev_kind, prev_text = [], None, None
    for kind, text in blocks:
        if text == prev_text:
            continue
        if kind == "dd" and lines:
            lines[-1] = lines[-1] + " " + text.strip()
            continue
        tight = (kind == prev_kind and kind in ("li", "table")) or (prev_kind == "q" and kind == "p")
        if lines and not tight:
            lines.append("")
        lines.append(text)
        prev_kind, prev_text = kind, text
    return "\n".join(lines).strip()


def page_md(rel, path):
    raw = (ROOT / rel).read_text(encoding="utf-8")
    title = html.unescape(re.search(r"<title>(.*?)</title>", raw).group(1))
    desc = html.unescape(re.search(r'name="description" content="(.*?)"', raw).group(1))
    main = re.search(r'<main id="main">(.*?)</main>', raw, re.S).group(1)
    p = MD()
    p.feed(main)
    p.flush()
    return f"# {title}\n\nURL: {SITE}{path}\n\n> {desc}\n\n{render(p.out)}\n"


def main():
    head = (ROOT / "llms.txt").read_text(encoding="utf-8").split("\n## Services")[0].strip()
    head = head.replace("# Vaishali Sharma:", "# Vaishali Sharma (full site content):", 1)
    intro = ("This file contains the full readable text of every page on vaishalisharma.com.np, "
             "for AI assistants and language models. The short index is at https://vaishalisharma.com.np/llms.txt.")
    parts = [head, intro] + ["---\n\n" + page_md(rel, path) for rel, path in ORDER]
    out = "\n\n".join(parts).rstrip() + "\n"
    out = out.replace("\u2014", ", ")
    (ROOT / "llms-full.txt").write_text(out, encoding="utf-8", newline="\n")
    print("llms-full.txt", len(out), "chars,", len(out.split()), "words")


if __name__ == "__main__":
    main()
