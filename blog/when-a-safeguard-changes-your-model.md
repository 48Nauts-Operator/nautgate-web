---
title: "When a safeguard changes your model, keep the evidence"
description: "An Anthropic safeguard switched Fable 5.1 to Opus 4.8 during xNaut development. Explore NautGate's false-positive review, model fallback evidence and report."
seo_title: "Claude Code Safeguards: A False-Positive Review | NautGate"
keywords:
  - "Claude Code safeguard false positive"
  - "Anthropic safeguards"
  - "LLM model degradation"
  - "model fallback"
  - "AI agent observability"
  - "model failover"
  - "NautGate SafeGuard"
  - "xNaut harness"
  - "Fable's safeguards flagged this message. Our intentionally broad safeguards allow us to deliver more capabilities faster, but can sometimes flag legitimate coding, cybersecurity, and biology tasks."
date: 2026-09-06
published_at: "2026-09-06T19:35:12+02:00"
author: 48Nauts
author_type: Organization
category: "SafeGuard incident review"
status: published
---

# When a safeguard changes your model, keep the evidence

We had been unable to fix an issue, and I wanted a feature that would stop us
relying on a single model. If a provider goes down or a runtime cannot start,
another capable model should be able to pick up the same task. The notes and
code are already there. Why should the work have to wait?

On 6 September, we were implementing that continuity feature in xNaut. The
assistant's plan was to release the worktree when a session ends, put the task
back in the queue if its runtime cannot start, and let another runtime continue
from the notes and existing branch.

Then the assistant read part of a local Rust source file.

About seven seconds after the command was recorded, the client reported a
cyber-related safeguard refusal and switched models. The client identified
the switch as Fable 5.1 → Opus 4.8.

<div class="callout" role="note" aria-label="Client safeguard notice">
<p><strong>The message shown by the client</strong></p>
<p>Fable's safeguards flagged this message. Our intentionally broad safeguards allow us to deliver more capabilities faster, but can sometimes flag legitimate coding, cybersecurity, and biology tasks. Switched to Opus 4.8 (1M context). Send feedback with /feedback or learn more</p>
</div>

So far, Anthropic is the only provider where I have encountered this kind of
safeguard-driven model switch.

It reminds me of the early Microsoft days. You pay for the product, then help
find the problems that shipped with it. I wanted to build a feature. Instead,
I was investigating why my selected model had been replaced.

## Recording an Anthropic safeguard and model fallback

The warning was visible in the client, but the incident was missing from
NautGate's Safeguard view. We had no retained gateway response for the flagged
call. The client's own log did contain a structured refusal and fallback event.

Our capture had a gap. Looking at provider responses had missed an event the
client had already reported to me.

We extended SafeGuard to capture that client event, record the selected and
fallback models, and link it to the available message history. The report labels
it as client-reported evidence. We still don't have the original provider
refusal response.

NautGate already distinguishes [the model requested from the model that
answered](/blog/prove-which-model-answered.html). SafeGuard now adds the recorded reason for this
switch and the activity around it. NautGate observes the incident. Task
execution and model reassignment belong to xNaut.

## Assessing a possible Claude Code safeguard false positive

The first report gave me a backtrace. I also wanted to know whether the flag
made sense for the work we were doing.

The user request concerned continuing work across models. The implementation
plan covered missing binaries, expired logins and provider outages. The
commands we reviewed read local code. They did not execute an exploit, collect
credentials or target another system.

We found the plan and the final source-read command in the retained log, on the
message chain leading to the refusal. That gave the review more to work with
than my recollection of the incident.

The report's assessment is **likely false positive, with high confidence within
the reviewed task**. An assistant reviewed the evidence and assigned that
qualitative rating. There is no calculated probability behind it, and Anthropic
has not confirmed the finding.

I don't need Fable's private reasoning to see that this was a request for a
reliability feature. Explaining what activated the safeguard is harder. We are
missing the full provider input, the original refusal response and one
assistant message that the client says it retracted. The seven-second interval
establishes the sequence, not which content caused the flag.

The report includes those gaps alongside the evidence supporting the assessment.
It also preserves earlier reviews when new information changes the assessment.

![Public edition of NautGate's incident report, showing a likely false-positive assessment, high qualitative confidence and unconfirmed provider correction.](/assets/reports/safeguard-incident/report-preview.png)

*The public report omits private identifiers and internal source code. The
private copy keeps the source references needed for an investigation.*

[Read the public report](/assets/reports/safeguard-incident/public-report.html) or
[download the public report as PDF](/assets/reports/safeguard-incident/public-report.pdf).

## LLM observability with NautGate SafeGuard

This incident gave us a specific set of improvements to build:

- Capture the supported client refusal-and-fallback notice as a separate event.
- Trace the available activity before the flag and the response from the
  fallback model.
- Attach a review with its verdict, confidence, supporting evidence and gaps.
- Export HTML, Markdown or JSON, with a feedback draft in the readable report.

The workflow runs in our test environment. The new client observer currently
handles the supported Claude Code log event. We still need to extend coverage
to other desktop clients.

The review is a separate step. A captured event without an assessment says it
is awaiting review, and NautGate does not submit feedback automatically.

## Evidence makes feedback more useful

We call this model degradation because we lost the selected model. We have not
measured worse answers or found extra charges. Opus continuing the task does
not prove Fable's refusal was wrong.

But we can now give Anthropic something specific to investigate. Here is what
we asked for. Here is the plan and the activity before the flag. Here is why we
think the request was legitimate, and here is what we could not recover.

We also plan to send a degradation pulse to external systems such as xNaut.
When NautGate detects a supported event, it would notify the external harness.
If the task's policy and permissions allow it, that harness could choose another
eligible model and continue the same task from its saved state. NautGate sends
the signal. xNaut decides whether to switch and handles the handoff. This is on
the backlog, not enabled today.

That would let xNaut respond to the interruption while keeping a record of why
it changed the assignment.

<div class="callout" role="note" aria-label="Closing thought">
<p><strong>The model matters less when the harness can keep the work moving.</strong></p>
</div>
