// Static SEO contract: fail locally when a canonical page loses metadata,
// structured data, sitemap coverage, or the 1200x630 share card.
import { readFile } from "node:fs/promises";

const pages = [
  ["index.html", "https://nautgate.dev/"],
  ["glossary.html", "https://nautgate.dev/glossary.html"],
  ["releases.html", "https://nautgate.dev/releases.html"],
  ["blog/index.html", "https://nautgate.dev/blog/"],
  ["blog/tailscale-first-network-wide-nautgate.html", "https://nautgate.dev/blog/tailscale-first-network-wide-nautgate.html"],
  ["blog/prove-which-model-answered.html", "https://nautgate.dev/blog/prove-which-model-answered.html"],
  ["blog/offline-means-no-egress.html", "https://nautgate.dev/blog/offline-means-no-egress.html"],
  ["blog/why-i-built-nautgate.html", "https://nautgate.dev/blog/why-i-built-nautgate.html"],
];

let failed = 0;
const pass = (message) => console.log(`✓ ${message}`);
const fail = (message) => { failed++; console.error(`✗ ${message}`); };
const requireMatch = (html, regex, label) => regex.test(html) ? pass(label) : fail(label);

const canonicals = new Set();
for (const [file, canonical] of pages) {
  const html = await readFile(file, "utf8");
  const prefix = file.padEnd(50);
  requireMatch(html, /<title>[^<]{10,}<[\/]title>/, `${prefix} title`);
  requireMatch(html, /<meta name="description" content="[^"]{50,}">/, `${prefix} description`);
  requireMatch(html, new RegExp(`<link rel="canonical" href="${canonical.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}">`), `${prefix} canonical`);
  requireMatch(html, /<meta name="theme-color" content="#[0-9a-fA-F]{6}">/, `${prefix} theme color`);
  requireMatch(html, /<meta property="og:image" content="https:\/\/nautgate\.dev\/assets\/og-v2\.png">/, `${prefix} Open Graph image`);
  requireMatch(html, /<meta property="og:image:width" content="1200">/, `${prefix} Open Graph width`);
  requireMatch(html, /<meta property="og:image:height" content="630">/, `${prefix} Open Graph height`);
  requireMatch(html, /<meta name="twitter:card" content="summary_large_image">/, `${prefix} X card`);
  requireMatch(html, /<h1[ >]/, `${prefix} H1`);

  const foundCanonical = html.match(/<link rel="canonical" href="([^"]+)">/)?.[1];
  if (canonicals.has(foundCanonical)) fail(`${prefix} duplicate canonical`);
  canonicals.add(foundCanonical);

  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  if (!blocks.length) {
    fail(`${prefix} JSON-LD present`);
  } else {
    let valid = true;
    for (const block of blocks) {
      try { JSON.parse(block[1]); } catch (error) { valid = false; fail(`${prefix} JSON-LD: ${error.message}`); }
    }
    if (valid) pass(`${prefix} JSON-LD valid`);
  }
}

const sitemap = await readFile("sitemap.xml", "utf8");
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
for (const [, canonical] of pages) {
  sitemapUrls.includes(canonical) ? pass(`sitemap contains ${canonical}`) : fail(`sitemap missing ${canonical}`);
}
new Set(sitemapUrls).size === sitemapUrls.length ? pass("sitemap URLs are unique") : fail("sitemap has duplicate URLs");
const lastmods = [...sitemap.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((match) => match[1]);
lastmods.length === pages.length && lastmods.every((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))
  ? pass("sitemap has a valid lastmod for every URL")
  : fail("sitemap lastmod coverage");

const robots = await readFile("robots.txt", "utf8");
requireMatch(robots, /^User-agent: \*$/m, "robots applies to all crawlers");
requireMatch(robots, /^Sitemap: https:\/\/nautgate\.dev\/sitemap\.xml$/m, "robots advertises sitemap");
!/Disallow:\s*\/(privacy|terms)\.html/.test(robots)
  ? pass("robots permits crawlers to read legal-page noindex")
  : fail("robots blocks legal-page noindex");

for (const file of ["privacy.html", "terms.html"]) {
  const html = await readFile(file, "utf8");
  requireMatch(html, /<meta name="robots" content="noindex,follow">/, `${file} is noindex,follow`);
}

const feed = await readFile("feed.xml", "utf8");
requireMatch(feed, /<rss version="2\.0"/, "RSS 2.0 feed");
const feedItems = [...feed.matchAll(/<item>/g)].length;
feedItems === 4 ? pass("RSS contains all four articles") : fail(`RSS expected 4 articles, found ${feedItems}`);

const card = await readFile("assets/og-v2.png");
const png = card.subarray(1, 4).toString() === "PNG";
const width = png ? card.readUInt32BE(16) : 0;
const height = png ? card.readUInt32BE(20) : 0;
width === 1200 && height === 630 ? pass("share card is 1200×630 PNG") : fail(`share card is ${width}×${height}`);

const blog = await readFile("blog/index.html", "utf8");
const expectedOrder = [
  "tailscale-first-network-wide-nautgate.html",
  "prove-which-model-answered.html",
  "offline-means-no-egress.html",
  "why-i-built-nautgate.html",
];
const positions = expectedOrder.map((slug) => blog.indexOf(slug));
positions.every((position, i) => position >= 0 && (!i || position > positions[i - 1]))
  ? pass("blog is reverse chronological with founder post at the bottom")
  : fail("blog article order");

const homepage = await readFile("index.html", "utf8");
const releasesPage = await readFile("releases.html", "utf8");
!homepage.includes("data-gh-downloads") && !releasesPage.includes("data-gh-downloads")
  ? pass("unsupported download counter remains hidden")
  : fail("unsupported download counter is visible");

console.log(failed ? `\n${failed} SEO CHECK(S) FAILED` : "\nall SEO checks passed");
process.exit(failed ? 1 : 0);
