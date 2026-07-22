// Two small behaviours; everything else is HTML and CSS on purpose.

// 1. Version pill — resolved client-side so a release needs no site deploy.
const pill = document.getElementById("version-pill");
if (pill) {
  fetch("https://api.github.com/repos/48Nauts-Operator/NautGate/releases/latest")
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((rel) => { if (rel.tag_name) pill.textContent = rel.tag_name; else pill.remove(); })
    .catch(() => pill.remove());   // no release yet, or rate-limited — say nothing rather than lie
}

// 2. Screenshot lightbox. <dialog> gives us Escape, focus trap and the
//    backdrop for free — the only JS here is swapping the src.
const box = document.getElementById("lightbox");
if (box) {
  const full = document.getElementById("lightbox-img");
  const label = document.getElementById("lightbox-label");

  document.querySelectorAll(".shot-frame img").forEach((thumb) => {
    thumb.addEventListener("click", () => {
      full.src = thumb.dataset.full || thumb.src;
      full.alt = thumb.alt;
      label.textContent = thumb.alt;
      box.showModal();
    });
  });

  // Click the image, the ✕, or the backdrop (target is the dialog itself).
  box.addEventListener("click", (e) => {
    if (e.target === box || e.target === full || e.target.closest("button")) box.close();
  });
  box.addEventListener("close", () => { full.src = ""; });   // stop decoding a hidden image
}

// 3. Glossary: category chips + search, then a dialog per term.
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
