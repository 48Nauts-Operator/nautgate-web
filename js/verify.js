// Browser port of NautGate's offline evidence verifier (core/app/audit_verify.py,
// audit_evidence.py, audit-v1). Same bytes, same domains, same claim; WebCrypto only.
const enc = new TextEncoder();
const DOMAINS = {
  receipt: "NAUTGATE-DECISION-RECEIPT-V1\0",
  control: "NAUTGATE-MAX-GUARD-CONTROL-RECEIPT-V1\0",
  leaf: "NAUTGATE-MERKLE-LEAF-V1\0",
  node: "NAUTGATE-MERKLE-NODE-V1\0",
  checkpoint: "NAUTGATE-AUDIT-CHECKPOINT-V1\0",
};
const RECEIPT_DOMAIN = {
  "dev.nautgate.decision-receipt/v1": DOMAINS.receipt,
  "dev.nautgate.max-guard-control-receipt/v1": DOMAINS.control,
};

// Strict v1 JCS profile: sorted keys (UTF-16 order, which is JS string order),
// no whitespace, integers only, JSON string escaping.
export function canonical(value) {
  if (value === null || value === undefined) return "null";
  if (value === true) return "true";
  if (value === false) return "false";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) throw new Error("floats are forbidden in v1 evidence");
    return String(value);
  }
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (typeof value === "object") {
    return "{" + Object.keys(value).sort().map((k) => JSON.stringify(k) + ":" + canonical(value[k])).join(",") + "}";
  }
  throw new Error("unsupported value type " + typeof value);
}

const cat = (...parts) => {
  const bufs = parts.map((p) => (typeof p === "string" ? enc.encode(p) : p));
  const out = new Uint8Array(bufs.reduce((n, b) => n + b.length, 0));
  let o = 0; for (const b of bufs) { out.set(b, o); o += b.length; }
  return out;
};
const sha256 = async (bytes) => new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
export const hex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
const unhex = (s) => { if (!/^[0-9a-f]{64}$/.test(s)) throw new Error("bad hex"); return Uint8Array.from(s.match(/../g), (h) => parseInt(h, 16)); };
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function importPublicKey(pem) {
  const body = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  if (!body) throw new Error("no PEM body");
  const der = unb64(body);
  const key = await crypto.subtle.importKey("spki", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, true, ["verify"]);
  return { key, fingerprint: hex(await sha256(der)) };
}

// Runs the four checks and reports each one, stopping at the first failure.
// Returns { verified, steps: [{id, label, ok, detail, value}], claim }.
export async function verifyBundle(bundle, pem, { expectedKeyId, expectedFingerprint } = {}) {
  const steps = [];
  const step = (id, label, ok, value, detail) => { steps.push({ id, label, ok, value, detail }); if (!ok) throw new Fail(); };
  class Fail extends Error {}
  try {
    if (bundle?.bundle_schema !== "dev.nautgate.evidence-bundle/v1") step("schema", "bundle schema", false, bundle?.bundle_schema, "unsupported evidence bundle schema");
    const { receipt, checkpoint, signature } = bundle;
    if (![receipt, checkpoint, signature].every((v) => v && typeof v === "object")) step("schema", "bundle shape", false, "", "bundle is missing receipt, checkpoint, or signature");

    // 1. receipt hash
    const domain = RECEIPT_DOMAIN[receipt.schema];
    if (!domain) step("receipt", "receipt hash", false, receipt.schema, "unsupported receipt schema");
    const receiptHash = await sha256(cat(domain, canonical(receipt)));
    step("receipt", "receipt hash", hex(receiptHash) === bundle.receipt_hash, hex(receiptHash),
      hex(receiptHash) === bundle.receipt_hash ? "SHA-256 over the domain tag and the canonical receipt matches the bundle" : "receipt content hash mismatch");

    // 2. Merkle inclusion
    if (!Array.isArray(bundle.merkle_proof)) step("merkle", "Merkle path", false, "", "Merkle proof must be an array");
    let node = await sha256(cat(DOMAINS.leaf, receiptHash));
    for (const item of bundle.merkle_proof) {
      const sib = unhex(item.hash);
      if (item.side !== "left" && item.side !== "right") step("merkle", "Merkle path", false, "", "invalid Merkle proof sibling");
      node = await sha256(item.side === "left" ? cat(DOMAINS.node, sib, node) : cat(DOMAINS.node, node, sib));
    }
    step("merkle", "Merkle path", hex(node) === checkpoint.merkle_root, hex(node),
      hex(node) === checkpoint.merkle_root ? `${bundle.merkle_proof.length} siblings up to the checkpoint root` : "Merkle inclusion proof does not reach checkpoint root");

    // 3. checkpoint bytes and key binding
    if (checkpoint.schema !== "dev.nautgate.audit-checkpoint/v1") step("checkpoint", "checkpoint", false, checkpoint.schema, "unsupported checkpoint schema");
    const payload = cat(DOMAINS.checkpoint, canonical(checkpoint));
    const payloadHash = hex(await sha256(payload));
    if (signature.key_id !== checkpoint.signing_key_id) step("checkpoint", "checkpoint", false, payloadHash, "signature key does not match checkpoint key");
    if (expectedKeyId && signature.key_id !== expectedKeyId) step("checkpoint", "checkpoint", false, payloadHash, "bundle was signed by an unexpected key");
    if (signature.algorithm !== "SHA256_WITH_RSA" || signature.encoding !== "base64-der") step("checkpoint", "checkpoint", false, payloadHash, "unsupported signature algorithm or encoding");
    step("checkpoint", "checkpoint", true, payloadHash, `${checkpoint.receipt_count} receipts, sequence ${checkpoint.first_sequence} to ${checkpoint.last_sequence}, key ${checkpoint.signing_key_id}`);

    // 4. HSM signature against the pinned key
    const { key, fingerprint } = await importPublicKey(pem);
    if (expectedFingerprint && fingerprint !== expectedFingerprint) step("signature", "HSM signature", false, fingerprint, "public key fingerprint does not match the pinned fingerprint");
    if (signature.public_key_fingerprint !== fingerprint) step("signature", "HSM signature", false, fingerprint, "bundle names a different public key than the one supplied");
    const ok = await crypto.subtle.verify({ name: "RSASSA-PKCS1-v1_5" }, key, unb64(signature.value), payload);
    step("signature", "HSM signature", ok, fingerprint, ok ? "RSA/SHA-256 signature over the checkpoint bytes verifies under the pinned key" : "checkpoint signature is invalid");

    return { verified: true, steps, receipt_id: receipt.receipt_id, checkpoint_id: checkpoint.checkpoint_id, sequence: receipt.sequence,
      claim: "The disclosed NautGate decision receipt is included in the hardware-signed checkpoint and has not been modified." };
  } catch (e) {
    if (!(e instanceof Fail)) steps.push({ id: "error", label: "verifier", ok: false, value: "", detail: e.message || String(e) });
    return { verified: false, steps, claim: null };
  }
}
