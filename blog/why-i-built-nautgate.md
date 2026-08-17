---
title: "Why I built NautGate"
description: "A year of watching routing, context, latency, drift, and model substitution changed how I think about privacy—and why I am opening NautGate to everyone now."
date: 2026-08-16
author: André
author_type: Person
category: Founder's note
status: published
---

# Why I built NautGate

NautGate did not begin as a product launch. It began as a tool I built for
myself more than a year ago because I wanted to understand what was actually
happening between an AI client and a model.

I was using these systems every day, but too much of the interaction was hidden.
I could see the question I typed and the answer that appeared. I could not
easily see the route between them: what the client added, which provider
received it, which model actually answered, what metadata came back, how many
tokens were used, or why the same model sometimes felt different from one week
to the next.

I wanted to learn how the systems worked, not just use them. So I put a gateway
in the middle and started observing.

## A prompt is rarely just the question you typed

Privacy was one of the first reasons I kept building.

The first time I inspected a complete request leaving my machine, I was
surprised by how much more it contained than the sentence I had written. An AI
coding harness can add system instructions, tool definitions, environment and
workspace context, conversation history, identifiers, and other metadata before
the request reaches a provider.

When I looked at requests being sent to providers such as Anthropic, the
difference between *what I typed* and *what left the computer* was much larger
than I had expected. Some of that context is necessary for the tool to work.
Some of it is valuable. The important realization was that I had never been
able to see it as one complete record.

That changed how I think about privacy. Privacy is not only a policy page or a
promise that a company makes. It is also a practical question:

- What exactly left the machine?
- Which service received it?
- Which credentials and routing rules were involved?
- What was stored locally afterwards?
- Can I run the same workflow without any external connection at all?

NautGate gave me a place to answer those questions from the traffic itself.
Capture is policy-controlled because visibility should not become a second
privacy problem. When prompts and responses are stored, they remain in the
database you operate, under the rules you configure.

## The model name in the request is not proof

Routing created another problem. A request contains the model the client asked
for, but that does not prove which model generated the response. Aliases,
overrides, fallbacks, provider routing, and substitutions can all change what
happens after the request leaves the client.

Asking the model who it is does not solve this. A model will usually repeat the
identity it was given in its system prompt. That is useful behavior for a
conversation, but it is not evidence.

NautGate therefore keeps the requested model beside the model reported in the
provider's response. It records the route between them and highlights when they
do not match. That small distinction—requested versus served—became the basis
for everything else: cost accounting, model comparisons, audit history, and
confidence that I was measuring the system that actually answered.

## When a familiar model starts to feel different

After using the same models heavily, I developed an intuition for their
behavior. Sometimes a model would suddenly feel off. It might respond more
slowly, require more tokens to reach a useful answer, use tools differently, or
produce a different quality of result for work that had previously been
predictable.

Intuition is a useful signal, but it is not a measurement. I built a drift
service so that I could compare that feeling with data.

The service tracked changes in latency, token use, response patterns, quality
signals, and tool behavior over time. On several occasions I saw measurable
shifts in an older model around the period when a provider was preparing a new
model or discontinuing an existing one. Sometimes latency increased. Sometimes
the model appeared to need more tokens for the same kind of answer. Sometimes
the behavior changed before any announcement I had seen.

The data could show that something changed. It could not prove why it changed,
or whether the provider made an intentional adjustment. That distinction
matters. NautGate is designed to expose the evidence, not invent a story around
it.

Being able to see the change was still valuable. Instead of arguing with my own
memory, I could compare the same workloads, inspect the control charts, and
decide whether to change a route or test another model.

## Separating the harness from the model

NautGate now sits inside my wider development flow. It captures and accounts
for requests, but it also acts as the proxy that relays them.

That makes the client harness and the model two separate choices. I can keep the
workflow, tools, and interface of a harness such as Claude Code while routing a
metered key to Kimi K2.6 or another OpenRouter model. The harness still manages
the coding session; a different model generates the tokens.

This has been useful for more than cost. It lets me compare models on the work I
actually do, with the same tools and approximately the same context, rather
than relying only on benchmark scores. It also makes the boundaries visible:
what behavior comes from the harness, what comes from the model, and what comes
from the route between them.

The same gateway can pass subscription traffic through untouched, route other
keys to metered or local models, and keep one audit record across the whole
flow. For local work, offline mode stands down the background services that
would otherwise make outbound calls. Local inference is useful; being able to
verify the network boundary is better.

## Why release it now

For more than a year, NautGate was primarily something I used to understand my
own systems. It accumulated the features I needed: attested model identity,
routing evidence, capture policies, cost and subscription accounting, model
override, drift detection, head-to-head comparisons, and local routing.

It has reached the point where I think that visibility can be useful to other
people too. You should be able to see what your AI tools are sending, which
model actually answered, what the call cost, and when familiar behavior begins
to move.

NautGate is now available as a public alpha. It is free to use and the source is
available under AGPL-3.0-or-later. You can inspect it, run it, modify it, and
self-host it. If you distribute a modified version or offer one as a network
service, read the licence and understand the source-sharing obligations that
apply. A separate commercial licence is available for situations where AGPL is
not a fit.

This is an early release, not a claim that the work is finished. More services
will join the package, and the most useful direction will come from real use.
Feedback, bug reports, ideas, and contributors are welcome.

I built NautGate because I wanted to stop guessing what was happening inside my
own AI workflow. Now I want other people to have the same visibility.

Check it out, run it on your own infrastructure, and tell me what you see.
