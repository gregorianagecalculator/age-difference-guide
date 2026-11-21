from __future__ import annotations

import html
import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"

EXPECTED_TITLE = "حساب فرق العمر بين شخصين: كيف تحسبه بدقة بالسنوات والأشهر والأيام؟"
EXPECTED_OUTBOUND = [
    ("https://agecalculatorsa.com/age-difference/", "حساب العمر بين شخصين"),
    ("https://school-age-guide.web.app/", "دليل سن دخول المدرسة"),
]


def strip_tags(value: str) -> str:
    value = re.sub(r"<script\b.*?</script>", " ", value, flags=re.S | re.I)
    value = re.sub(r"<style\b.*?</style>", " ", value, flags=re.S | re.I)
    value = re.sub(r"<[^>]+>", " ", value)
    return html.unescape(re.sub(r"\s+", " ", value)).strip()


def main() -> None:
    index_path = PUBLIC / "index.html"
    source = index_path.read_text(encoding="utf-8")
    errors: list[str] = []

    title_match = re.search(r"<title>(.*?)</title>", source, flags=re.S | re.I)
    title = html.unescape(title_match.group(1).strip()) if title_match else ""
    if title != EXPECTED_TITLE:
        errors.append(f"Title mismatch: {title!r}")

    h1s = re.findall(r"<h1\b[^>]*>(.*?)</h1>", source, flags=re.S | re.I)
    if len(h1s) != 1:
        errors.append(f"Expected one H1, found {len(h1s)}")
    if h1s and strip_tags(h1s[0]) != EXPECTED_TITLE:
        errors.append(f"H1 mismatch: {strip_tags(h1s[0])!r}")

    anchors = []
    for match in re.finditer(r"<a\b([^>]*)>(.*?)</a>", source, flags=re.S | re.I):
        attrs = match.group(1)
        text = strip_tags(match.group(2))
        href_match = re.search(r'href\s*=\s*"([^"]*)"', attrs, flags=re.I)
        href = html.unescape(href_match.group(1)) if href_match else ""
        anchors.append((href, text))

    outbound = [(href, text) for href, text in anchors if re.match(r"^https?://", href, flags=re.I)]
    if outbound != EXPECTED_OUTBOUND:
        errors.append(f"Outbound links mismatch: {outbound!r}")

    ids = set(re.findall(r'\bid\s*=\s*"([^"]+)"', source, flags=re.I))
    duplicate_ids = sorted({value for value in re.findall(r'\bid\s*=\s*"([^"]+)"', source, flags=re.I) if re.findall(r'\bid\s*=\s*"([^"]+)"', source, flags=re.I).count(value) > 1})
    if duplicate_ids:
        errors.append(f"Duplicate IDs: {duplicate_ids}")
    for href, _text in anchors:
        if href.startswith("#") and href[1:] and href[1:] not in ids:
            errors.append(f"Missing anchor target: {href}")

    visible_text = strip_tags(source)
    for dash_name, dash in (("em dash", "\u2014"), ("en dash", "\u2013")):
        if dash in visible_text:
            errors.append(f"Found {dash_name} in visible text")

    word_count = len(re.findall(r"[\u0600-\u06FF]+", visible_text))
    if word_count < 1200:
        errors.append(f"Arabic word count below 1200: {word_count}")

    ld_blocks = re.findall(r'<script type="application/ld\+json">(.*?)</script>', source, flags=re.S | re.I)
    for block in ld_blocks:
        try:
            json.loads(block)
        except json.JSONDecodeError as exc:
            errors.append(f"Invalid JSON-LD: {exc}")

    try:
        sitemap = ET.parse(PUBLIC / "sitemap.xml")
        sitemap_urls = [node.text for node in sitemap.getroot().iter("{http://www.sitemaps.org/schemas/sitemap/0.9}loc")]
    except ET.ParseError as exc:
        errors.append(f"Invalid sitemap XML: {exc}")
        sitemap_urls = []

    robots = (PUBLIC / "robots.txt").read_text(encoding="utf-8")
    if "Sitemap:" not in robots:
        errors.append("robots.txt has no Sitemap line")

    print(f"Title: {title}")
    print(f"H1 count: {len(h1s)}")
    print(f"Outbound links: {outbound}")
    print(f"Anchors: {len(anchors)} total, {len(ids)} IDs")
    print(f"Arabic word count: {word_count}")
    print(f"JSON-LD blocks: {len(ld_blocks)}")
    print(f"Sitemap URLs: {sitemap_urls}")
    print(f"Robots sitemap line: {[line for line in robots.splitlines() if line.lower().startswith('sitemap:')]}")

    if errors:
        print("\nFAILED:")
        for error in errors:
            print(f"- {error}")
        raise SystemExit(1)

    print("\nAll checks passed.")


if __name__ == "__main__":
    main()
