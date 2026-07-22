// Two small behaviours; everything else is HTML and CSS on purpose.

// 1. Version pill — resolved client-side so a release needs no site deploy.
const pill = document.getElementById("version-pill");
if (pill) {
  fetch("https://api.github.com/repos/48Nauts-Operator/NautGate/releases/latest")
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((rel) => { if (rel.tag_name) pill.textContent = rel.tag_name; else pill.remove(); })
    .catch(() => pill.remove());   // no release yet, or rate-limited — say nothing rather than lie
}

// 2. Glossary category filter.
const filters = document.getElementById("filters");
if (filters) {
  const terms = [...document.querySelectorAll("#terms .term")];
  filters.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-cat]");
    if (!btn) return;
    const cat = btn.dataset.cat;
    filters.querySelectorAll("button").forEach((b) =>
      b.setAttribute("aria-pressed", String(b === btn)));
    terms.forEach((t) => { t.hidden = cat !== "all" && t.dataset.cat !== cat; });
  });
}
