"""Render the site's 1200x630 Open Graph images in the brand style.

Usage (from the repo root):
    pip install playwright && python -m playwright install chromium
    python docs/tools/og_images.py              # render every image in IMAGES
    python docs/tools/og_images.py meta-ads     # render only the named image(s)

Add a new page's image by adding an entry to IMAGES below:
    "name": page(eyebrow, title, subtitle, illustration, title_px)
It is written to assets/images/og/<name>.jpg. Reference it in the page's og:image
and twitter:image. Needs internet access (fonts load from Google while rendering).
If the image is also shown inside a page (like blog post covers), create a .webp
copy next to it and wrap the <img> in <picture> like the existing blog cards.
"""
import asyncio
import os
import pathlib
import sys

from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parents[2]  # repo root
OUT = ROOT / "assets" / "images" / "og"
IMG = ROOT / "assets" / "images"
TMP = pathlib.Path(os.path.dirname(os.path.abspath(__file__))) / "_og_tmp.html"

ACCENT, STAMP, INK, PAPER, RAISED = "#1d3ed8", "#d6372b", "#15130f", "#f5f1e6", "#fffdf7"


def uri(rel):
    return (IMG / rel).as_uri()


# ------------------------------------------------------------------ illustrations (right-hand side)
def ill_photo(sticker="Open to work"):
    return f"""
    <div class="frame" style="width:330px;height:420px;transform:rotate(2deg)">
      <img src="{uri('profile/pp.jpg')}" style="width:100%;height:100%;object-fit:cover;border-radius:18px">
    </div>
    <div class="chip" style="position:absolute;left:-10px;bottom:40px;transform:rotate(-4deg)"><span class="dot"></span>{sticker}</div>"""


def ill_phone(a="rouniyar", b="bathnepal"):
    def phone(name, x, rot, c1, c2):
        tiles = "".join(
            f'<div style="background:{c1 if (i % 3 + i // 3) % 2 == 0 else c2};opacity:{0.55 + (i % 4) * 0.12};border-radius:6px"></div>'
            for i in range(9))
        return f"""<div class="frame" style="position:absolute;left:{x}px;top:{30 if rot < 0 else 60}px;width:210px;height:380px;transform:rotate({rot}deg);padding:18px;background:{RAISED}">
          <div style="display:flex;align-items:center;gap:10px"><div style="width:34px;height:34px;border-radius:50%;background:{c1}"></div><b style="font:700 16px Archivo">{name}</b></div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:18px;height:190px">{tiles}</div>
          <div style="display:flex;gap:8px;margin-top:16px"><div class="mini" style="background:{c1}">&#9829; Likes</div><div class="mini" style="background:{INK}">&#9993; DMs</div></div>
        </div>"""
    return phone(a, 0, -5, ACCENT, STAMP) + phone(b, 190, 4, STAMP, ACCENT)


def ill_ads():
    bars = "".join(f'<div style="height:{h}%;background:{ACCENT if i < 4 else STAMP};border-radius:6px 6px 0 0;flex:1"></div>'
                   for i, h in enumerate([28, 40, 36, 58, 78]))
    return f"""
    <div class="frame" style="width:400px;height:330px;padding:28px;transform:rotate(-2deg)">
      <div style="font:700 15px Archivo;color:#837a67;letter-spacing:.08em;text-transform:uppercase">Messages from ads</div>
      <div style="font:800 54px 'Bricolage Grotesque';margin-top:4px">&#8593; More leads</div>
      <div style="display:flex;align-items:flex-end;gap:12px;height:150px;margin-top:18px;border-bottom:2px solid {INK}">{bars}</div>
    </div>
    <div class="chip" style="position:absolute;right:0;top:10px;transform:rotate(5deg);background:{STAMP};color:#fff;border-color:{INK}">Facebook &amp; Instagram</div>"""


def ill_design():
    sw = "".join(f'<div style="width:46px;height:46px;border-radius:10px;background:{c};border:2px solid {INK}"></div>'
                 for c in [ACCENT, STAMP, "#f2c14e", INK])
    return f"""
    <div class="frame" style="width:400px;height:340px;padding:26px;transform:rotate(2deg);background:{RAISED}">
      <div style="position:relative;height:200px;border:2px dashed #837a67;border-radius:14px">
        <div style="position:absolute;left:30px;top:30px;width:120px;height:120px;border-radius:50%;background:{ACCENT}"></div>
        <div style="position:absolute;left:120px;top:70px;width:130px;height:100px;border-radius:16px;background:{STAMP};border:3px solid {INK}"></div>
        <div style="position:absolute;right:26px;top:22px;font:800 64px 'Bricolage Grotesque'">Aa</div>
      </div>
      <div style="display:flex;gap:12px;margin-top:22px">{sw}</div>
    </div>"""


def ill_pin(city, towns):
    chips = "".join(f'<div class="chip" style="font-size:18px;padding:8px 14px">{t}</div>' for t in towns)
    return f"""
    <div style="display:flex;flex-direction:column;align-items:center;gap:24px">
      <svg width="190" height="240" viewBox="0 0 24 30"><path d="M12 29s9-9.2 9-16a9 9 0 0 0-18 0c0 6.8 9 16 9 16z" fill="{ACCENT}" stroke="{INK}" stroke-width="1.2"/><circle cx="12" cy="12.5" r="3.6" fill="{RAISED}" stroke="{INK}" stroke-width="1.2"/></svg>
      <div class="chip" style="font-size:26px;padding:12px 22px;background:{INK};color:{PAPER}">{city}</div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;max-width:420px">{chips}</div>
    </div>"""


def ill_services():
    def card(label, color, x, y, rot):
        return f"""<div class="frame" style="position:absolute;left:{x}px;top:{y}px;width:250px;padding:22px;transform:rotate({rot}deg)">
          <div style="width:44px;height:44px;border-radius:12px;background:{color};border:2px solid {INK}"></div>
          <div style="font:800 28px 'Bricolage Grotesque';margin-top:14px">{label}</div></div>"""
    return card("Graphic Design", ACCENT, 20, 0, -4) + card("Social Media", STAMP, 150, 130, 3) + card("Meta Ads", "#f2c14e", 40, 260, -2)


def ill_screenshot(rel):
    return f"""
    <div class="frame" style="width:440px;padding:0;overflow:hidden;transform:rotate(2deg)">
      <div style="display:flex;gap:7px;padding:12px 14px;border-bottom:2px solid {INK};background:{RAISED}">
        <span class="bdot" style="background:{STAMP}"></span><span class="bdot" style="background:#f2c14e"></span><span class="bdot" style="background:{ACCENT}"></span></div>
      <img src="{uri(rel)}" style="display:block;width:100%;height:300px;object-fit:cover;object-position:top">
    </div>"""


def ill_card():
    return f"""
    <div class="frame" style="width:400px;height:250px;padding:28px;background:{ACCENT};color:#fff;transform:rotate(-4deg)">
      <div style="display:flex;justify-content:space-between;font:700 18px Archivo"><span>USD CARD</span><span>&#36;</span></div>
      <div style="width:60px;height:44px;border-radius:8px;background:#f2c14e;border:2px solid {INK};margin-top:26px"></div>
      <div style="font:700 26px Archivo;letter-spacing:.12em;margin-top:26px">&#8226;&#8226;&#8226;&#8226; 2026</div>
    </div>
    <div class="chip" style="position:absolute;right:10px;bottom:30px;transform:rotate(4deg)">Pay in NPR or USD</div>"""


def ill_calendar():
    days = "".join(
        f'<div style="border-radius:8px;background:{STAMP if i in (4, 11, 16) else (ACCENT if i in (8, 19) else "#ece6d4")};border:1.5px solid {INK}"></div>'
        for i in range(21))
    return f"""
    <div class="frame" style="width:400px;padding:24px;transform:rotate(2deg)">
      <div style="font:800 30px 'Bricolage Grotesque'">Festival calendar</div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:8px;height:200px;margin-top:18px">{days}</div>
    </div>
    <div class="chip" style="position:absolute;left:-6px;bottom:24px;transform:rotate(-5deg);background:{STAMP};color:#fff">Dashain &middot; Tihar &middot; Chhath</div>"""


def ill_chat():
    def bubble(t, right, color, fg):
        side = "margin-left:auto" if right else ""
        return f'<div style="{side};max-width:78%;padding:14px 18px;border-radius:18px;background:{color};color:{fg};border:2px solid {INK};font:600 21px Archivo;margin-top:14px">{t}</div>'
    return f"""
    <div class="frame" style="width:410px;padding:26px;transform:rotate(-2deg)">
      {bubble("Price kati ho?", False, "#ece6d4", INK)}
      {bubble("Rs. details sent. Delivery available!", True, ACCENT, "#fff")}
      {bubble("Stock cha? Order garchu", False, "#ece6d4", INK)}
    </div>"""


def ill_contact():
    return f"""
    <div class="frame" style="width:380px;padding:30px;transform:rotate(-2deg)">
      <div style="font:800 40px 'Bricolage Grotesque';line-height:1.05">Let's grow your page.</div>
      <div style="margin-top:24px;padding:16px 20px;border-radius:12px;background:#25d366;border:2px solid {INK};font:700 22px Archivo;color:#08351a">WhatsApp me</div>
      <div style="margin-top:12px;padding:16px 20px;border-radius:12px;background:{ACCENT};border:2px solid {INK};font:700 22px Archivo;color:#fff">Hire Me Now</div>
    </div>"""


# ------------------------------------------------------------------ page template
def page(eyebrow, title, sub, ill, size=64):
    return f"""<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700..800&family=Archivo:wght@500;600;700;800&display=swap" rel="stylesheet">
<style>
*{{box-sizing:border-box;margin:0;padding:0}}
body{{width:1200px;height:630px;background:{PAPER};font-family:Archivo,sans-serif;color:{INK};overflow:hidden;position:relative;
  background-image:linear-gradient(rgba(21,19,15,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(21,19,15,.05) 1px,transparent 1px);background-size:64px 64px}}
.left{{position:absolute;left:72px;top:64px;bottom:64px;width:600px;display:flex;flex-direction:column}}
.mark{{width:64px;height:64px;border-radius:16px;background:{INK};color:{PAPER};display:grid;place-items:center;font:800 26px 'Bricolage Grotesque'}}
.brand{{display:flex;align-items:center;gap:16px;font:700 24px Archivo}}
.eyebrow{{margin-top:auto;display:flex;align-items:center;gap:12px;color:{ACCENT};font:800 19px Archivo;letter-spacing:.14em;text-transform:uppercase}}
.eyebrow:before{{content:'';width:34px;height:3px;background:{ACCENT};border-radius:3px}}
h1{{font:800 {size}px/1.02 'Bricolage Grotesque';letter-spacing:-.02em;margin-top:16px}}
.sub{{margin-top:18px;font:500 25px/1.35 Archivo;color:#504a3e;max-width:560px}}
.foot{{margin-top:26px;font:700 18px Archivo;color:#837a67}}
.right{{position:absolute;right:64px;top:0;bottom:0;width:440px;display:flex;align-items:center;justify-content:center}}
.right>div{{position:relative}}
.frame{{background:{RAISED};border:2.5px solid {INK};border-radius:24px;box-shadow:10px 10px 0 {INK};padding:10px;position:relative}}
.chip{{display:inline-flex;align-items:center;gap:10px;padding:10px 18px;border-radius:999px;background:{RAISED};border:2.5px solid {INK};box-shadow:5px 5px 0 {INK};font:700 20px Archivo;white-space:nowrap}}
.dot{{width:12px;height:12px;border-radius:50%;background:#22a55a}}
.mini{{flex:1;padding:8px;border-radius:8px;color:#fff;font:700 13px Archivo;text-align:center}}
.bdot{{width:13px;height:13px;border-radius:50%;border:1.5px solid {INK}}}
</style></head><body>
<div class="left">
  <div class="brand"><div class="mark">VS</div>Vaishali Sharma</div>
  <div class="eyebrow">{eyebrow}</div>
  <h1>{title}</h1>
  <div class="sub">{sub}</div>
  <div class="foot">vaishalisharma.com.np &middot; Biratnagar, Nepal</div>
</div>
<div class="right"><div style="width:100%;height:430px;display:flex;align-items:center;justify-content:center">{ill}</div></div>
</body></html>"""


IMAGES = {
    "home": page("Biratnagar, Nepal", "Graphic Designer &amp; Social Media Marketer", "Posts, reels, page handling and Meta ads for Nepali businesses.", ill_photo(), 60),
    "about": page("About", "Vaishali Sharma", "Graphic designer and social media marketer from Biratnagar, Nepal.", ill_photo("Design &middot; Social &middot; Ads")),
    "resume": page("Resume", "Vaishali Sharma", "Graphic Designer &amp; Social Media Marketer. Experience, skills and CV.", ill_photo("Download CV")),
    "contact": page("Hire Me", "Hire a Graphic Designer &amp; Social Media Manager", "Send your brief on WhatsApp or the contact form.", ill_contact(), 56),
    "services": page("Services", "Social Media Marketing &amp; Design in Nepal", "Graphic design, page handling and Meta ads from one person.", ill_services(), 58),
    "graphic-design": page("Graphic Design", "Graphic Designer in Biratnagar, Nepal", "Posts, festival greetings, logos, posters and ad creatives.", ill_design(), 60),
    "social-media-management": page("Social Media Management", "Facebook &amp; Instagram Page Handling in Nepal", "Content calendar, reels, captions, posting and replies.", ill_phone(), 54),
    "meta-ads": page("Meta Ads", "Meta Ads &amp; Facebook Boosting in Nepal", "Campaigns for messages and leads, with every lead answered.", ill_ads(), 58),
    "biratnagar": page("Biratnagar &amp; Eastern Nepal", "Graphic Design &amp; Social Media in Biratnagar", "In-person design, page handling and ads across Koshi Province.", ill_pin("Biratnagar", ["Itahari", "Dharan", "Inaruwa", "Damak", "Birtamod"]), 56),
    "kathmandu": page("Kathmandu Valley", "Social Media Marketing for Kathmandu Businesses", "Remote page handling, design and Meta ads, run like a local.", ill_pin("Kathmandu", ["Lalitpur", "Bhaktapur", "Kirtipur"]), 54),
    "case-rouniyar": page("Case Study", "Rouniyar International &amp; Bath Nepal", "Daily content, reels, AI video, Meta ads and lead replies.", ill_phone("rouniyar", "bathnepal"), 56),
    "portfolio": page("Portfolio", "Social Media, Design &amp; Web Work", "Real brand accounts plus website and UI case studies.", ill_services(), 60),
    "blog": page("Blog", "Social Media, Meta Ads &amp; Design Notes", "Practical guides for businesses in Nepal.", ill_chat(), 58),
    "post-boost-vs-ads-manager": page("Blog &middot; Meta Ads", "Facebook Boost vs Meta Ads Manager", "Which one Nepali businesses should use, and when.", ill_ads(), 58),
    "post-pay-facebook-ads": page("Blog &middot; Meta Ads", "How to Pay for Facebook Ads from Nepal", "Dollar cards, local agencies and keeping your account.", ill_card(), 58),
    "post-festival-content": page("Blog &middot; Social Media", "Festival Posts for Nepali Businesses", "Dashain, Tihar, Chhath and a full-year content plan.", ill_calendar(), 58),
    "post-more-messages": page("Blog &middot; Social Media", "Get More Messages from Your Facebook Page", "Eight practical steps for businesses in Nepal.", ill_chat(), 56),
    "blog-process": page("Blog &middot; Process", "The UI/UX Design Process", "Explained through four real case studies.", ill_screenshot("portfolio/homeloom/thumb.jpg"), 60),
    "blog-styles": page("Blog &middot; UI Trends", "Glassmorphism vs Neumorphism vs Flat Design", "Choosing the right UI style in 2026.", ill_design(), 54),
    "case-homeloom": page("Case Study &middot; Web", "HomeLoom", "Furniture e-commerce, from Figma to a working shop-to-cart flow.", ill_screenshot("portfolio/homeloom/thumb.jpg"), 76),
    "case-streets-to-runways": page("Case Study &middot; Web", "Streets to Runways", "Footwear landing page and a sign-in cut from 5 steps to 3.", ill_screenshot("portfolio/streets-to-runways/thumb.jpg"), 70),
    "case-glam": page("Case Study &middot; Web", "Glam", "Fashion storefront designed like a lookbook.", ill_screenshot("portfolio/glam/thumb.jpg"), 76),
    "case-wanderlust": page("Case Study &middot; Web", "WanderLust Diaries", "Travel blog where photography tells the story.", ill_screenshot("portfolio/wanderlust/thumb.jpg"), 70),
}


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={"width": 1200, "height": 630}, device_scale_factor=1)
        only = set(sys.argv[1:])
        for name, html in IMAGES.items():
            if only and name not in only:
                continue
            TMP.write_text(html, encoding="utf-8")
            await pg.goto(TMP.as_uri(), wait_until="networkidle")
            await pg.evaluate("document.fonts.ready")
            out = OUT / f"{name}.jpg"
            await pg.screenshot(path=str(out), type="jpeg", quality=86)
            print(name, out.stat().st_size)
        await b.close()
    TMP.unlink()


if __name__ == "__main__":
    asyncio.run(main())
