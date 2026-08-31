#!/usr/bin/env python3
"""
Apply site-chrome (unified header/footer) to all HTML pages.

Strategy per page group:
- Standard pages (index, join, faq, careers, venues, about-companies, quiz,
  partnership, live-center/*, article/*): replace existing <nav>+<footer>
- streamers/*.html: only INSERT footer before </body>. Keep the in-page
  streamer-nav (a small "back" button, not a global nav). Also inject nav
  as full sticky header before <main>.
- streamer-test/result/: INSERT nav at <body> start and REPLACE footer
- rookie-test/quiz/, streamer-test/quiz/, streamer-test-console.html:
  focus-mode pages — only inject CSS link, no nav/footer
"""
import re
import sys
import os
from pathlib import Path

REPO = Path("/home/user/webapp")
TPL_DIR = REPO / "_templates"

with open(TPL_DIR / "site-nav.html", "r", encoding="utf-8") as f:
    NAV_TPL = f.read().rstrip() + "\n"
with open(TPL_DIR / "site-footer.html", "r", encoding="utf-8") as f:
    FOOTER_TPL = f.read().rstrip() + "\n"

CSS_LINK = '<link rel="stylesheet" href="/css/site-chrome.css?v=20260831a" />'
CSS_MARKER = 'site-chrome.css'

PRIMARY_NAV_CLASSES = {
    'navbar', 'p-nav', 'f-nav', 'v-nav', 'q-nav',
    'careers-nav', 'venues-nav', 'test-nav', 'result-nav',
    # NOTE: streamer-nav is INTENTIONALLY excluded — it's an in-page mini-nav
}

NAV_BLOCK_RE = re.compile(
    r'<nav\b[^>]*>.*?</nav>',
    re.DOTALL,
)
FOOTER_BLOCK_RE = re.compile(
    r'<footer\b[^>]*>.*?</footer>',
    re.DOTALL,
)


def render_nav(active: str) -> str:
    return NAV_TPL.replace("{{ACTIVE}}", active)


def inject_css_link(html: str) -> tuple[str, bool]:
    if CSS_MARKER in html:
        return html, False
    if '</head>' not in html:
        return html, False
    return html.replace('</head>', f'  {CSS_LINK}\n</head>', 1), True


def find_primary_nav(html: str) -> re.Match | None:
    for m in NAV_BLOCK_RE.finditer(html):
        block = m.group(0)
        cm = re.search(r'<nav\b[^>]*class=(["\'])([^"\']+)\1', block)
        if not cm:
            continue
        classes = set(cm.group(2).split())
        if classes & PRIMARY_NAV_CLASSES:
            return m
    return None


def replace_primary_nav(html: str, active: str) -> tuple[str, str]:
    m = find_primary_nav(html)
    if not m:
        return html, "no-primary-nav"
    new_nav = render_nav(active)
    return html[:m.start()] + new_nav + html[m.end():], "ok"


def insert_nav_after_body(html: str, active: str) -> tuple[str, str]:
    """Insert nav right after <body ...> opening tag."""
    m = re.search(r'<body\b[^>]*>', html)
    if not m:
        return html, "no-body"
    new_nav = render_nav(active)
    return html[:m.end()] + "\n" + new_nav + html[m.end():], "ok"


def replace_footer(html: str) -> tuple[str, str]:
    m = FOOTER_BLOCK_RE.search(html)
    if not m:
        return html, "no-footer"
    return html[:m.start()] + FOOTER_TPL + html[m.end():], "ok"


def insert_footer_before_body_end(html: str) -> tuple[str, str]:
    if '</body>' not in html:
        return html, "no-body-end"
    return html.replace('</body>', FOOTER_TPL + "\n</body>", 1), "ok"


def process(path: Path, active: str, mode: str) -> dict:
    """
    mode:
      'standard'    : replace nav + replace footer
      'insert_both' : insert nav at body start + insert footer before </body>
      'insert_footer_only' : leave nav alone (streamers keep streamer-nav) + insert footer
      'streamers'   : insert nav BEFORE <main>, insert footer before </body>
      'result_page' : insert nav at body start, replace footer
      'focus_mode'  : only inject CSS, no nav/footer
    """
    orig = path.read_text(encoding="utf-8")
    new = orig
    result = {
        "file": str(path.relative_to(REPO)),
        "active": active,
        "mode": mode,
        "changes": [],
    }

    # Always inject CSS
    new, injected = inject_css_link(new)
    if injected:
        result["changes"].append("+css-link")
    else:
        result["changes"].append("=css-link")

    if mode == "standard":
        new, s1 = replace_primary_nav(new, active)
        result["changes"].append(f"nav:{s1}")
        new, s2 = replace_footer(new)
        result["changes"].append(f"footer:{s2}")

    elif mode == "insert_both":
        # For pages that have no existing nav/footer at all
        new, s1 = insert_nav_after_body(new, active)
        result["changes"].append(f"nav-ins:{s1}")
        new, s2 = insert_footer_before_body_end(new)
        result["changes"].append(f"footer-ins:{s2}")

    elif mode == "streamers":
        # Insert site-nav after <body>, insert footer before </body>
        # Preserve the in-page streamer-nav (mini back button)
        new, s1 = insert_nav_after_body(new, active)
        result["changes"].append(f"nav-ins:{s1}")
        new, s2 = insert_footer_before_body_end(new)
        result["changes"].append(f"footer-ins:{s2}")

    elif mode == "result_page":
        new, s1 = insert_nav_after_body(new, active)
        result["changes"].append(f"nav-ins:{s1}")
        new, s2 = replace_footer(new)
        if s2 != "ok":
            # Fallback to insert
            new, s2 = insert_footer_before_body_end(new)
            result["changes"].append(f"footer-ins:{s2}")
        else:
            result["changes"].append(f"footer:{s2}")

    elif mode == "focus_mode":
        # No nav/footer for quiz-in-progress and console pages
        result["changes"].append("focus-mode-no-chrome")

    if new != orig:
        path.write_text(new, encoding="utf-8")
        result["written"] = True
    else:
        result["written"] = False
    return result


# ============ Page mapping ============
# (relative_path, active_key, mode)
PAGES = [
    # Standard pages (replace nav + footer)
    ("index.html", "home", "standard"),
    ("join.html", "join", "standard"),
    ("faq.html", "faq", "standard"),
    ("careers.html", "join", "standard"),
    ("venues.html", "join", "standard"),
    ("about-companies.html", "home", "standard"),
    ("quiz.html", "test", "standard"),
    # partnership.html already done in previous commit

    # Live center hub + subhubs
    ("live-center/index.html", "live-center", "standard"),
    ("live-center/tutorial/index.html", "live-center", "standard"),
    ("live-center/creator/index.html", "live-center", "standard"),
    ("live-center/policy/index.html", "live-center", "standard"),
    ("live-center/revenue/index.html", "live-center", "standard"),

    # Articles
    ("live-center/article/2026-q2-tiktok-live-payout-update/index.html", "live-center", "standard"),
    ("live-center/article/3000-budget-live-streaming-setup/index.html", "live-center", "standard"),
    ("live-center/article/gift-psychology-4-techniques/index.html", "live-center", "standard"),
    ("live-center/article/how-to-leave-tiktok-guild/index.html", "live-center", "standard"),
    ("live-center/article/live-pk-benefits-guide/index.html", "live-center", "standard"),
    ("live-center/article/livestream-is-a-micro-startup/index.html", "live-center", "standard"),
    ("live-center/article/rookie-to-golden-hour-in-6-months/index.html", "live-center", "standard"),
    ("live-center/article/yycam-tikfinity-menu-streamer-combo/index.html", "live-center", "standard"),

    # Streamers (7) — insert both, preserving streamer-nav mini back button
    ("streamers/coco.html", "home", "streamers"),
    ("streamers/duoduolyu.html", "home", "streamers"),
    ("streamers/jack.html", "home", "streamers"),
    ("streamers/mamei.html", "home", "streamers"),
    ("streamers/mimosi.html", "home", "streamers"),
    ("streamers/rena.html", "home", "streamers"),
    ("streamers/yuanchenglie.html", "home", "streamers"),

    # Test suite
    ("rookie-test/index.html", "test", "standard"),
    ("streamer-test/index.html", "test", "standard"),
    ("streamer-test/thanks/index.html", "test", "standard"),
    ("streamer-test/result/index.html", "test", "result_page"),

    # Focus-mode pages (no nav/footer)
    ("rookie-test/quiz/index.html", "test", "focus_mode"),
    ("streamer-test/quiz/index.html", "test", "focus_mode"),
    ("streamer-test-console.html", "test", "focus_mode"),
]


def main():
    results = []
    for rel, active, mode in PAGES:
        path = REPO / rel
        if not path.exists():
            results.append({"file": rel, "error": "not-found"})
            continue
        results.append(process(path, active, mode))

    print("=" * 90)
    print(f"Processed {len(results)} files")
    print("=" * 90)
    for r in results:
        if r.get("error"):
            print(f"❌ {r['file']}: {r['error']}")
            continue
        status = "✅" if r["written"] else "⚪"
        print(f"{status} {r['file']:60s} [{r['active']:12s}] [{r['mode']:20s}] {','.join(r['changes'])}")

    ok = sum(1 for r in results if r.get("written"))
    print(f"\nWritten: {ok}/{len(results)}")


if __name__ == "__main__":
    main()
