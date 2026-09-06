#!/usr/bin/env python3
"""Render one Markdown article with SEO metadata and explicit draft handling."""

import argparse
import json
import re
import subprocess
import struct
from datetime import date
from html import escape
from pathlib import Path


def plain(node):
    if isinstance(node, list):
        return "".join(plain(item) for item in node)
    if not isinstance(node, dict):
        return str(node)
    if node["t"] in {"Space", "SoftBreak", "LineBreak"}:
        return " "
    if node["t"] in {"Str", "MetaString"}:
        return node["c"]
    if node["t"] in {"MetaInlines", "Strong", "Emph"}:
        return plain(node["c"])
    raise ValueError("Use plain text for article metadata: " + node["t"])


def render(source):
    root = Path(__file__).resolve().parent.parent
    source = source.resolve()
    relative = source.relative_to(root)
    if relative.parts[0] != "blog" or source.suffix != ".md":
        raise ValueError("Expected a Markdown source under blog/")
    fmt = "markdown-implicit_figures-smart"
    document = json.loads(subprocess.check_output(
        ["pandoc", str(source), "--from=" + fmt, "--to=json"], text=True
    ))
    meta = document["meta"]
    text = lambda key, default="": plain(meta[key]) if key in meta else default
    title, description = text("title"), text("description")
    if not title or not description:
        raise ValueError("title and description are required")
    seo_title = text("seo_title", title + " · NautGate Blog")
    draft = text("status") == "draft"
    canonical = "https://nautgate.dev/" + relative.with_suffix(".html").as_posix()
    published_date = text("date")
    publication_time = text("published_at", published_date)
    day = date.fromisoformat(published_date)
    display_date = f"{day.day} {day.strftime('%B %Y')}"
    html = subprocess.check_output([
        "pandoc", str(source), "--from=" + fmt, "--wrap=none",
        "--template=" + str(root / "scripts/blog-template.html"),
        "--lua-filter=" + str(root / "scripts/pandoc-drop-title.lua"),
        "-V", "canonical=" + canonical, "-V", "displaydate=" + display_date,
    ], text=True)
    html = re.sub(r"<title>.*?</title>", lambda _: "<title>" + escape(seo_title) + "</title>", html, count=1)
    for attribute, name in (("property", "og:title"), ("name", "twitter:title")):
        html = re.sub(
            rf'<meta {attribute}="{name}" content="[^"]*">',
            lambda _, a=attribute, n=name: f'<meta {a}="{n}" content="{escape(seo_title, quote=True)}">',
            html,
        )
    keywords = [plain(item) for item in meta.get("keywords", {}).get("c", [])]
    extra = '<meta name="keywords" content="' + escape(", ".join(keywords), quote=True) + '">\n'
    extra += '<meta property="og:locale" content="en_US">\n'
    for keyword in keywords:
        extra += '<meta property="article:tag" content="' + escape(keyword, quote=True) + '">\n'
    article = {
        "@type": "BlogPosting", "@id": canonical + "#article",
        "headline": title, "description": description,
        "mainEntityOfPage": {"@type": "WebPage", "@id": canonical},
        "inLanguage": "en", "dateModified": text("modified_at", publication_time),
        "author": {"@type": text("author_type", "Organization"), "name": text("author")},
        "publisher": {"@type": "Organization", "name": "48Nauts", "@id": "https://nautgate.dev/#organization"},
        "image": {"@type": "ImageObject", "url": "https://nautgate.dev/assets/og-v2.png", "width": 1200, "height": 630},
        "keywords": keywords,
        "articleSection": text("category").removeprefix("Draft preview · "),
    }
    if draft:
        extra += '<meta name="robots" content="noindex,nofollow">\n'
        html = re.sub(r'\s*<script defer src="https://wave[^\n]+', "", html)
        html = re.sub(r'<meta property="article:(?:published|modified)_time"[^>]*>', "", html)
    else:
        article["datePublished"] = publication_time
        html = html.replace(f'property="article:published_time" content="{published_date}"', f'property="article:published_time" content="{publication_time}"')
        html = html.replace(f'property="article:modified_time" content="{published_date}"', f'property="article:modified_time" content="{text("modified_at", publication_time)}"')
    breadcrumbs = {"@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i, "name": name, "item": url}
        for i, (name, url) in enumerate([
            ("Home", "https://nautgate.dev/"),
            ("Blog", "https://nautgate.dev/blog/"), (title, canonical),
        ], 1)
    ]}
    schema = json.dumps({"@context": "https://schema.org", "@graph": [article, breadcrumbs]}, ensure_ascii=False).replace("<", "\\u003c")
    html = re.sub(r'\s*<script type="application/ld\+json">.*?</script>', "", html)
    html = html.replace("</head>", extra + '<script type="application/ld+json">' + schema + "</script>\n</head>")
    def image_attributes(match):
        asset = (root / match[1].lstrip("/")).resolve()
        asset.relative_to(root)
        data = asset.read_bytes()
        if data[:8] != b"\x89PNG\r\n\x1a\n":
            raise ValueError("Expected a PNG report image")
        width, height = struct.unpack(">II", data[16:24])
        return f'<img width="{width}" height="{height}" loading="lazy" decoding="async" src="{match[1]}"'

    html = re.sub(r'<img src="(/assets/reports/[^"]+\.png)"', image_attributes, html)
    target = source.with_suffix(".html")
    target.write_text(html)
    print(f"Rendered {target.relative_to(root)} ({'draft / noindex' if draft else 'publication metadata'}).")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    render(parser.parse_args().source)
