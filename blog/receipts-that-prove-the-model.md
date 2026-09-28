---
title: "Receipts that prove the model"
description: "NautGate's audit receipts now carry weight-manifest digests, sampling settings and an environment block, recorded on every call; hardware-signed in the enterprise tier. And the next step: catching silent model swaps behind vendor APIs."
date: 2026-09-28
author: André
author_type: Person
category: Release notes
status: published
---

# Receipts that prove the model

At a recent security event, a solution architect from
[Securosys](https://www.securosys.com) described NautGate on stage as a tool that tracks what your AI client is
sending outside of your machine to the model. And then the part that made my
week: they had suggested that if NautGate produces audit logs and reports, it
should sign them. The release that does exactly that shipped within a day of
that conversation.

Their framing, [in the talk itself](https://www.youtube.com/watch?v=UjdORkATA0Q), is the cleanest description of where the pieces sit. Their demo
gateway sits between the human and the client. NautGate sits between the client
and the model. Everything NautGate records can now be signed through Merkle
checkpoints against a Securosys CloudsHSM.

That was the signing story. Today's release is about what the receipts actually
say. Three new fields, and one feature on deck that I think is the real point
of all of this.

## What a receipt now proves

NautGate has always kept [the requested model beside the model that
answered](/blog/prove-which-model-answered.html). A receipt answered who, what
and when. It now also answers which model, under which settings, in which
environment.

**Model integrity.** For models you serve yourself, every receipt records the
weight-manifest digest of the model that answered. "Which model answered"
upgrades from a label in a response header to a cryptographic claim about the
weights on disk.

Concretely: you run Qwen3 at [Infomaniak](https://www.infomaniak.com) and a backup route at a second
datacenter with the same model. The gateway switches on cost, load or
availability, and every receipt carries the weight digest of whichever site
answered. Two sites, one digest: provable. And because the gateway only holds
routes to your approved deployments, a rogue agent asking for some other model
has nowhere to go; the request dies at the gateway, before a single datapoint
leaves your perimeter. The receipt records the attempt either way.

**Sampling capture.** The receipt records temperature, top_p and seed for
every call, and states whether a call ran under deterministic settings. The obvious question came up at that event: same context, same answer? Now
the receipt can say whether that was even a fair expectation for a given call.

**Environment block.** Which harness made the call (the User-Agent), a
declared sandbox id, and the capture path. That last one matters more than it
looks: an in-path gateway saw the bytes itself; a sidecar ingest is
self-reported by the client. Auditors treat those as different grades of
evidence, and the receipt now says which one it is.

## Signing is the enterprise line

One thing to be direct about. Everything NautGate records can be signed, and
that signing is an enterprise feature. It is not in the open-source version,
for a simple reason: the signature chain ends in a hardware security module,
and an HSM is expensive. The open-source gateway records everything: the
receipts, the digests, the sampling settings, the environment. The enterprise
tier seals those records with hardware-backed signatures and
gives you the attested evidence packages below.

## The evidence package

An attested receipt exports as a single zip: a human-readable PDF, the
byte-exact canonical bundle, and a VERIFY.txt with the steps.

The PDF is a rendering. The canonical JSON stays the signed evidence. To keep
those two from drifting apart, the PDF embeds the JSON as an attachment and
carries a QR code that opens a signature-check verdict page.

For verification without trusting anyone's server:

```bash
nautgate receipt verify evidence-<id>.json --public-key <trusted.pem>
```

The trust-grade path never requires trusting the NautGate instance that issued
the receipt. You verify offline, against a public key you obtained out of band.

Here is [a full example receipt report](/assets/reports/decision-receipt-example/receipt-report.html),
generated from a real receipt on my test instance (client identifiers swapped
for neutral ones, everything else exactly as the gateway rendered it).


## The flow, drawn

<figure>
<svg viewBox="0 0 860 290" role="img" aria-label="Every call through the gateway produces a receipt that is folded into a Merkle checkpoint and signed by the HSM; the receipt exports as an evidence package verifiable offline." style="max-width:100%;height:auto">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <g fill="none" stroke="currentColor" stroke-width="1.4">
    <rect x="20" y="30" width="130" height="46" rx="4"/>
    <rect x="240" y="30" width="150" height="46" rx="4"/>
    <rect x="480" y="30" width="130" height="46" rx="4"/>
    <line x1="150" y1="53" x2="238" y2="53" marker-end="url(#arr)"/>
    <line x1="390" y1="53" x2="478" y2="53" marker-end="url(#arr)"/>
    <line x1="315" y1="76" x2="315" y2="128" marker-end="url(#arr)"/>
    <rect x="205" y="130" width="220" height="64" rx="4"/>
    <line x1="425" y1="162" x2="518" y2="162" marker-end="url(#arr)"/>
    <rect x="520" y="138" width="150" height="46" rx="4" stroke="#808000" stroke-width="2"/>
    <line x1="670" y1="162" x2="738" y2="162" marker-end="url(#arr)"/>
    <rect x="740" y="138" width="100" height="46" rx="4" stroke="#808000" stroke-width="2"/>
    <line x1="315" y1="194" x2="315" y2="240" marker-end="url(#arr)"/>
    <rect x="185" y="242" width="260" height="40" rx="4"/>
  </g>
  <g font-size="12.5" fill="currentColor" text-anchor="middle" font-family="ui-monospace,Menlo,monospace">
    <text x="85" y="58">agent</text>
    <text x="315" y="58">NautGate</text>
    <text x="545" y="58">model</text>
    <text x="315" y="152">receipt</text>
    <text x="315" y="168" font-size="10.5" opacity="0.75">who · what · when · digest</text>
    <text x="315" y="182" font-size="10.5" opacity="0.75">settings · environment</text>
    <text x="595" y="164">Merkle</text>
    <text x="595" y="178" font-size="10.5" opacity="0.75">checkpoint</text>
    <text x="790" y="166">HSM sign</text>
    <text x="315" y="266" font-size="11.5">evidence package · verify offline</text>
  </g>
  <g font-size="10.5" fill="currentColor" opacity="0.7" text-anchor="middle" font-family="ui-monospace,Menlo,monospace">
    <text x="194" y="44">request</text>
    <text x="434" y="44">forwards</text>
    <text x="332" y="106" text-anchor="start">records</text>
    <text x="471" y="152">batched</text>
    <text x="704" y="152">signs</text>
    <text x="332" y="222" text-anchor="start">exports</text>
  </g>
</svg>
<figcaption>Every call produces a receipt; receipts fold into Merkle checkpoints signed by the HSM (olive: the enterprise signing chain); any receipt exports as an evidence package you verify offline.</figcaption>
</figure>

<figure>
<svg viewBox="0 0 860 250" role="img" aria-label="The gateway routes the same model between two approved datacenters and both answers carry the same weight digest; a request for an unapproved model has no route and dies at the gateway." style="max-width:100%;height:auto">
  <defs><marker id="arr2" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <g fill="none" stroke="currentColor" stroke-width="1.4">
    <rect x="20" y="90" width="120" height="46" rx="4"/>
    <rect x="250" y="90" width="150" height="46" rx="4"/>
    <line x1="140" y1="113" x2="248" y2="113" marker-end="url(#arr2)"/>
    <line x1="400" y1="102" x2="548" y2="52" marker-end="url(#arr2)"/>
    <line x1="400" y1="124" x2="548" y2="174" marker-end="url(#arr2)"/>
    <rect x="550" y="26" width="230" height="50" rx="4"/>
    <rect x="550" y="150" width="230" height="50" rx="4"/>
    <line x1="325" y1="136" x2="325" y2="196" stroke="#E5484D" marker-end="url(#arr2)"/>
  </g>
  <g font-size="12.5" fill="currentColor" text-anchor="middle" font-family="ui-monospace,Menlo,monospace">
    <text x="80" y="118">agent</text>
    <text x="325" y="118">NautGate</text>
    <text x="665" y="46">Infomaniak · Qwen3</text>
    <text x="665" y="64" font-size="10.5" opacity="0.75">weights sha256:ab12…</text>
    <text x="665" y="170">backup DC · Qwen3</text>
    <text x="665" y="188" font-size="10.5" opacity="0.75">weights sha256:ab12…</text>
  </g>
  <g font-size="10.5" fill="currentColor" opacity="0.7" font-family="ui-monospace,Menlo,monospace">
    <text x="194" y="104" text-anchor="middle">any request</text>
    <text x="452" y="62">route: primary</text>
    <text x="430" y="182">route: cost / failover</text>
  </g>
  <g font-size="11" fill="#E5484D" font-family="ui-monospace,Menlo,monospace">
    <text x="340" y="218" text-anchor="start">request for model X: no route.</text>
    <text x="340" y="233" text-anchor="start">dies here; recorded, refused.</text>
  </g>
</svg>
<figcaption>Two approved deployments, one weight digest on every receipt. A request for anything outside the approved set has no route; it dies at the gateway before a datapoint leaves, and the attempt is recorded.</figcaption>
</figure>

## Next: catching the silent model swap

Here is where the seed and temperature fields stop being bookkeeping.

There is a documented industry problem: providers serving quantized or
distilled variants of a model while billing for the full one. Do not take my
word for it. OpenRouter's own engineering blog
[calls quantization the hidden quality variable](https://openrouter.ai/blog/insights/evaluate-llm-provider-performance/)
and states plainly that when a provider serves lower-precision weights,
"nothing in your logs tells you why." An independent investigation found that
for the same Llama 3.3 70B listing,
[the most expensive endpoint served fp8 while a cheaper one served the original bf16](https://www.lesswrong.com/posts/KsyoSAyBRXtwzSugg/not-pinning-your-openrouter-provider-might-invalidate-your);
price does not track fidelity. You cannot weight-pin a vendor API. Providers
do not sign their models. And asking the model who it is proves nothing; it
repeats whatever its system prompt told it.

I reproduced this on my own gateway before publishing. Ten identical calls to
one model listing, temperature 0, seed 7, same prompt, same token budget. They
were served by five different sub-providers. One of them returned the answer.
Three others spent the entire token budget on reasoning and returned empty
content. Same request, same settings, and whether my application got an answer
at all depended on which provider happened to serve the call. Every one of
those ten calls has a signed receipt recording the requested model, the
observed model, the serving provider and the sampling settings. That is not a
benchmark claim; it is evidence I can hand you. Asking the model
who it is proves nothing; it repeats whatever its system prompt told it.

But behavior can be checked. Because receipts now record seed and temperature,
NautGate can replay a sample of requests that ran under deterministic settings
and compare the answers. Same input, same seed, different answer means the
provider changed the model underneath you, silently.

I call this behavioral attestation. It ships next, not today. I am stating it plainly because as far as I can tell, no other
tool even claims to detect this. The fields landing today are what
make it possible.

## What this does not claim

- Watermarks prove origin class. Receipts prove the specific exchange. They
  are different claims and I will not blur them.
- Vendor models cannot be weight-pinned. They can only be behaviorally
  checked. Local models get the digest; remote models get the replay.
- The QR verdict page is a convenience check performed by the issuing
  instance. The offline CLI against an out-of-band key is the trust-grade
  path. Use it when it matters.

## Try it

If you need to show an auditor, a client or yourself which model answered,
under which settings, from which environment, and prove none of it was edited
afterwards: that is now one zip file.

NautGate is source-available under AGPL-3.0-or-later. Run it on your own
infrastructure, export a receipt, verify it offline, and tell me where the
evidence falls short. That feedback is how the last three fields got here.
