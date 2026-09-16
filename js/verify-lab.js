import { verifyBundle, importPublicKey } from "/js/verify.js";

const $ = (s, r = document) => r.querySelector(s);
const lab = $("#verify-lab");
if (lab) init();

async function init() {
  const fingerprint = lab.dataset.fingerprint;
  const [bundle, pem, decoyPem] = await Promise.all([
    fetch(lab.dataset.bundle).then((r) => r.json()),
    fetch(lab.dataset.key).then((r) => r.text()),
    fetch(lab.dataset.decoy).then((r) => r.text()),
  ]);
  const flip = $("#lab-flip"), swap = $("#lab-swap");
  const run = async () => {
    const b = structuredClone(bundle);
    if (flip.checked) b.receipt.routing.observed_model = b.receipt.routing.observed_model.replace(/.$/, (c) => (c === "h" ? "g" : "h"));
    await animate(b, swap.checked ? decoyPem : pem, { expectedKeyId: "NAUTGATE_AUDIT_KEY", expectedFingerprint: fingerprint }, $("#lab-live"));
  };
  flip.addEventListener("change", run);
  swap.addEventListener("change", run);
  $("#lab-rerun").addEventListener("click", run);

  // First run when the lab scrolls into view.
  const io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) { io.disconnect(); run(); } }, { threshold: 0.25 });
  io.observe(lab);

  // Paste your own.
  $("#lab-own-run").addEventListener("click", async () => {
    const out = $("#lab-own"); const host = $("#lab-own-steps");
    host.hidden = false;
    let b;
    try { b = JSON.parse($("#lab-own-bundle").value); } catch { renderResult(host, { verified: false, steps: [{ id: "error", label: "bundle", ok: false, value: "", detail: "that is not JSON" }] }); return; }
    const ownPem = $("#lab-own-key").value.trim();
    const fp = $("#lab-own-fp").value.trim().toLowerCase().replace(/^sha256:/, "") || undefined;
    await animate(b, ownPem, { expectedFingerprint: fp }, host);
  });
}

const STEPS = [["receipt", "1 · Hash the receipt"], ["merkle", "2 · Walk the Merkle path"], ["checkpoint", "3 · Rebuild the checkpoint bytes"], ["signature", "4 · Check the HSM signature"]];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

async function animate(bundle, pem, opts, host) {
  renderSkeleton(host);
  const result = await verifyBundle(bundle, pem, opts);
  // Reveal one step at a time so the chain reads as a chain.
  const rows = [...host.querySelectorAll(".lab-step")];
  for (let i = 0; i < STEPS.length; i++) {
    const s = result.steps.find((x) => x.id === STEPS[i][0]);
    const row = rows[i];
    row.classList.add("running");
    if (!reduced) await wait(420);
    row.classList.remove("running");
    if (!s) { row.classList.add("skipped"); row.querySelector(".lab-pill").textContent = "not reached"; continue; }
    row.classList.add(s.ok ? "ok" : "fail");
    row.querySelector(".lab-pill").textContent = s.ok ? "matches" : "broken";
    row.querySelector(".lab-hex").textContent = s.value || "";
    row.querySelector(".lab-detail").textContent = s.detail;
    if (!s.ok) { rows.slice(i + 1).forEach((r) => { r.classList.add("skipped"); r.querySelector(".lab-pill").textContent = "not reached"; }); break; }
  }
  const err = result.steps.find((x) => x.id === "error" || x.id === "schema");
  if (err && !result.verified) { const r = rows[0]; r.classList.add("fail"); r.querySelector(".lab-pill").textContent = "broken"; r.querySelector(".lab-detail").textContent = err.detail; }
  renderVerdict(host, result);
}

function renderSkeleton(host) {
  host.innerHTML = STEPS.map(([id, label]) => `<div class="lab-step" data-step="${id}">
      <div class="lab-step-head"><span class="lab-label">${label}</span><span class="lab-pill">waiting</span></div>
      <code class="lab-hex"></code><span class="lab-detail"></span></div>`).join("") + `<div class="lab-verdict" hidden></div>`;
}
function renderVerdict(host, result) {
  const v = host.querySelector(".lab-verdict"); v.hidden = false;
  v.className = "lab-verdict " + (result.verified ? "ok" : "fail");
  v.innerHTML = result.verified
    ? `<strong>Verified.</strong> ${esc(result.claim)} <span class="dim">Receipt ${esc(result.receipt_id)}, sequence ${result.sequence}, checkpoint ${esc(result.checkpoint_id)}.</span>`
    : `<strong>Refused.</strong> The chain breaks at the first red step. Nothing after it is trusted, and no part of NautGate was asked.`;
}
function renderResult(host, result) { renderSkeleton(host); renderVerdict(host, result); }
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
