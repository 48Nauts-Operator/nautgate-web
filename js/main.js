// Small progressive enhancements; the site remains complete without JavaScript.

// 1. Version pill — resolved client-side so a release needs no site deploy.
const pill = document.getElementById("version-pill");
if (pill) {
  fetch("https://api.github.com/repos/48Nauts-Operator/NautGate/releases/latest")
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((rel) => { if (rel.tag_name) pill.textContent = rel.tag_name; else pill.remove(); })
    .catch(() => pill.remove());   // no release yet, or rate-limited — say nothing rather than lie
}

// Homepage/editorial release data. Downloads are release-asset downloads as
// reported by GitHub. NautGate also ships through Homebrew and GHCR; neither
// exposes a compatible public counter, so they are intentionally not guessed.
(async () => {
  const statNodes = document.querySelectorAll("[data-gh-downloads], [data-gh-releases]");
  const versionNodes = document.querySelectorAll("[data-version]");
  if (!statNodes.length && !versionNodes.length) return;

  try {
    const response = await fetch("https://api.github.com/repos/48Nauts-Operator/NautGate/releases?per_page=100");
    if (!response.ok) return;
    const releases = await response.json();
    if (!Array.isArray(releases) || !releases.length) return;

    const downloads = releases.reduce((total, release) =>
      total + (release.assets || []).reduce((sum, asset) => sum + (asset.download_count || 0), 0), 0);
    const format = (value) => value.toLocaleString("en-US");

    document.querySelectorAll("[data-gh-downloads]").forEach((node) => { node.textContent = format(downloads); });
    document.querySelectorAll("[data-gh-releases]").forEach((node) => { node.textContent = format(releases.length); });
    document.querySelectorAll("[data-version]").forEach((node) => { node.textContent = releases[0].tag_name; });
  } catch {
    // The current verified values remain visible if GitHub is unavailable.
  }
})();

// Copy-ready Homebrew command.
document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-copy]");
  if (!button) return;
  navigator.clipboard.writeText(button.dataset.copy).then(() => {
    const previous = button.textContent;
    button.textContent = "copied";
    button.classList.add("ok");
    setTimeout(() => { button.textContent = previous; button.classList.remove("ok"); }, 1200);
  }).catch(() => {});
});

// 2. Mobile menu: <details> handles open/close, but an in-page anchor doesn't
//    navigate, so the panel would stay open over the section you jumped to.
const menu = document.querySelector(".nav-menu");
if (menu) {
  menu.addEventListener("click", (e) => {
    if (e.target.closest("a")) menu.open = false;
  });
  document.addEventListener("click", (e) => {
    if (menu.open && !menu.contains(e.target)) menu.open = false;
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") menu.open = false;
  });
}

const siteMenu = document.querySelector(".site-menu");
if (siteMenu) {
  siteMenu.addEventListener("click", (event) => {
    if (event.target.closest("a")) siteMenu.open = false;
  });
  document.addEventListener("click", (event) => {
    if (siteMenu.open && !siteMenu.contains(event.target)) siteMenu.open = false;
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") siteMenu.open = false;
  });
}

// 3. Screenshot lightbox. <dialog> gives us Escape, focus trap and the
//    backdrop for free — the only JS here is swapping the src.
const box = document.getElementById("lightbox");
if (box) {
  const full = document.getElementById("lightbox-img");
  const label = document.getElementById("lightbox-label");

  document.querySelectorAll(".shot-frame img, .gallery-open img").forEach((thumb) => {
    thumb.closest("button")?.addEventListener("click", () => {
      full.src = thumb.dataset.full || thumb.src;
      full.alt = thumb.alt;
      label.textContent = thumb.alt;
      box.showModal();
    });
    if (!thumb.closest("button")) {
      thumb.addEventListener("click", () => {
        full.src = thumb.dataset.full || thumb.src;
        full.alt = thumb.alt;
        label.textContent = thumb.alt;
        box.showModal();
      });
    }
  });

  // Click the image, the ✕, or the backdrop (target is the dialog itself).
  box.addEventListener("click", (e) => {
    if (e.target === box || e.target === full || e.target.closest("button")) box.close();
  });
  box.addEventListener("close", () => { full.src = ""; });   // stop decoding a hidden image
}

// 4. Glossary: category chips + search, then a dialog per term.
const filters = document.getElementById("filters");
if (filters) {
  const terms = [...document.querySelectorAll("#terms .term")];
  const q = document.getElementById("q");
  const none = document.getElementById("no-results");
  let cat = "all";

  // Search matches the name, the full definition and the tags.
  const haystack = new Map(terms.map((t) => [t, t.textContent.toLowerCase()]));

  function apply() {
    const needle = q.value.trim().toLowerCase();
    let shown = 0;
    terms.forEach((t) => {
      const hit = (cat === "all" || t.dataset.cat === cat) &&
                  (!needle || haystack.get(t).includes(needle));
      t.hidden = !hit;
      if (hit) shown++;
    });
    none.hidden = shown > 0;
  }

  filters.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-cat]");
    if (!btn) return;
    cat = btn.dataset.cat;
    filters.querySelectorAll("button").forEach((b) =>
      b.setAttribute("aria-pressed", String(b === btn)));
    apply();
  });

  q.addEventListener("input", apply);
  document.getElementById("clear-q").addEventListener("click", () => {
    q.value = ""; apply(); q.focus();
  });

  // --- the term dialog ---
  const box = document.getElementById("termbox");
  const byId = new Map(terms.map((t) => [t.id, t]));

  function show(term) {
    document.getElementById("tb-cat").textContent = term.querySelector(".pill").textContent;
    document.getElementById("tb-name").textContent = term.querySelector("h2").textContent;
    document.getElementById("tb-def").innerHTML = term.querySelector(".def").innerHTML;
    document.getElementById("tb-tags").innerHTML = term.querySelector(".tags").innerHTML;

    const rel = document.getElementById("tb-related");
    rel.innerHTML = "";
    term.dataset.related.split(" ").forEach((id) => {
      const other = byId.get(id);
      if (!other) return;                       // relation points at a term we dropped
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.goto = id;
      b.innerHTML = `<strong>${other.querySelector("h2").textContent}</strong>` +
                    other.querySelector(".def").textContent.slice(0, 78).trim() + "…";
      rel.appendChild(b);
    });

    if (!box.open) box.showModal();
    box.scrollTop = 0;
  }

  terms.forEach((t) => {
    t.addEventListener("click", () => show(t));
    t.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); show(t); }
    });
  });

  box.addEventListener("click", (e) => {
    const jump = e.target.closest("button[data-goto]");
    if (jump) return show(byId.get(jump.dataset.goto));   // walk the graph in place
    if (e.target === box || e.target.closest(".bar button")) box.close();
  });
}
