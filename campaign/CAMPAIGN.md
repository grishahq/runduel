# RunDuel English launch campaign

Repository: https://github.com/grishahq/runduel
Verified release: https://github.com/grishahq/runduel/releases/tag/v0.1.0

Prepared copy is not evidence of scheduling or publication. Canonical scheduling readback belongs in campaign/schedule.json.

## Beat 1: A response can look plausible and still omit the field your next step requires.

**Audience:** Agent application developers and existing Agno users building extraction workflows
**Evidence:** src/lib/duel/tasks.ts, docs/evidence/fixed-suite.json, public/fixtures/invoice-usd-candidate.sse
**Image:** assets/01-missing-field.png
**Alt text:** AI-generated conceptual illustration: one synthetic invoice branches toward two glass forms. A coral form has an empty field; a mint form is complete. Text: A convincing answer can still miss a field. RunDuel. This is concept art, not a software screenshot.
**Call to action:** Run the recorded invoice task and inspect the missing currency check.

### LinkedIn

The invoice ID is right. The amount is right. The response is valid JSON. The workflow still has a regression.

In a small extraction example, I deliberately removed the currency-normalization step from an Agno agent configuration. It still returned a plausible result: invoice INV-104, total 120. The required currency field disappeared.

That is an easy defect to miss when the review process is “read the answer and see if it looks reasonable.” A downstream consumer needs a specific contract, not a general impression.

I built RunDuel to put two configurations on the same task and show the answer, tool sequence and explicit outcome checks together. In this task, the baseline passes 3/3 fields; the deliberately regressed candidate passes 2/3. Currency is the concrete failure.

You can reproduce it without an API key. The recorded demo comes from real Agno 2.5.9 execution with a deterministic offline model adapter and synthetic documents. This is a controlled regression example, not a claim about any language model's quality.

Run the invoice task and open the success criteria: https://github.com/grishahq/runduel

The first question I would ask of an extraction change is: which required fields can disappear while the output still looks reasonable?

### X thread

1/4 A valid JSON response can still break your extraction workflow. My controlled example returns the right invoice ID and amount, but drops the required currency field after one tool step is removed.

2/4 Same synthetic invoice, two Agno configurations. Baseline: 3/3 exact field checks. Intentionally regressed candidate: 2/3. The failed check names the missing currency; valid JSON alone would not catch it.

3/4 RunDuel shows paired answers, ordered tools and explicit checks. The demo uses actual Agno 2.5.9 execution with a deterministic offline model. No API key, model-quality claim or invented cost.

4/4 Reproduce the missing-field failure: https://github.com/grishahq/runduel
Choose Recorded demo → Compare runs. Which required field would your current review process miss?

## Beat 2: A diff tells you what changed. It does not decide whether the change is acceptable.

**Audience:** Agent engineers deciding between output diffs, exact checks and model-based judges
**Evidence:** src/lib/duel/report.ts, src/lib/duel/custom.ts, docs/evidence/independent-review.md
**Image:** assets/02-check-the-outcome.png
**Alt text:** AI-generated conceptual illustration of parallel paper-and-glass document workflows on an engineering workbench. A magnifying lens highlights a missing square in a coral output form. Text: Compare the behavior. Check the outcome. RunDuel. No UI or measured results are depicted.
**Call to action:** Try an exact check with a wrong type or missing field; propose a concrete next checker.

### LinkedIn

A text diff is useful evidence. It is not an acceptance criterion.

For document extraction, an output can change for harmless reasons: key order, whitespace or wording. It can also change in a way that matters immediately: a number becomes a string, or currency disappears. Reading two outputs side by side leaves that decision implicit.

RunDuel v0.1 makes one deliberate tradeoff: exact, typed checks on JSON fields. You supply expected scalar values, including nested fields through dotted paths. A total of 120 does not equal the string "120". Zero, false and null remain valid values.

This is narrow. It does not judge good prose or understand every semantically equivalent answer. It also gives the extraction demo an inspectable decision rule without another model call or an unexplained judge score.

The tool trace answers a different question: what behavior produced the result? In the controlled regression, the candidate skips normalization and the currency check fails. Both pieces belong in the review.

A separate engineering review also caught a protocol bug: a completed stream could wait for EOF and later turn into a timeout. That is fixed, with an open-connection regression test. Evidence tools need tests of their own.

Try changing a field type in your own live task: https://github.com/grishahq/runduel

If this checker is too narrow for your workflow, bring a concrete counterexample. That is more useful input for the next version than adding a vague overall score.

### X thread

1/4 A diff says what changed. It does not say whether the change is acceptable. For extraction, reordered keys may be harmless; a missing currency or a number becoming a string may break the next step.

2/4 RunDuel v0.1 uses explicit typed JSON field checks. You declare exact scalar values; dotted paths handle nested fields. 120 differs from "120". Zero, false and null are valid expectations.

3/4 Tradeoff: this checker is inspectable and needs no judge-model call, but it cannot grade prose or every semantically equivalent answer. Tool traces explain behavior; checks state the required outcome.

4/4 Try a custom live task and bring a case exact checks cannot express: https://github.com/grishahq/runduel
The implementation and tests are public, including a fixed terminal-stream timeout bug.

## Beat 3: The demo runs real Agno tools, even when no model credentials are available.

**Audience:** Agno developers who want to reproduce the working comparison and connect their agents
**Evidence:** examples/offline_agentos.py, scripts/record-fixtures.ts, tests/browser/compare.spec.ts, docs/evidence/live-agentos.png
**Image:** assets/03-real-comparison.png
**Alt text:** Actual RunDuel browser screenshot of a recorded Agno comparison. The baseline answer contains invoice_id INV-104, total 120 and currency USD, passing 3/3 checks with two tools. The candidate omits currency, passes 2/3 checks and has one tool. Replay timing is labeled and costs are unknown.
**Call to action:** Run recorded mode, then connect the pinned offline AgentOS and compare live.

### LinkedIn

Here is the working RunDuel comparison, with the failing field visible.

Start with Recorded demo, click Compare runs, then inspect three things: the answers, the currency criterion and the ordered tool calls. The baseline executes extraction followed by normalization. The intentionally regressed candidate stops after extraction and omits currency.

The recorded events were captured from a real local AgentOS running Agno 2.5.9. A deterministic model adapter chooses the sequence; Agno executes the actual Python tools. No external model API is called. That makes the example repeatable without pretending an offline fixture proves a hosted model works.

For the live path, start the pinned Python example from the README and switch to Live AgentOS. The same browser page sends concurrent requests to the baseline and candidate with identical text and fresh, independent sessions. You can then replace the agent IDs and use your own task with expected JSON fields.

The upstream Agno Agent UI remains available at /chat. Its chat, streaming, tools and sessions are upstream capabilities retained by this fork, not things I am claiming to have invented.

There are also explicit limits: browser Stop closes the stream but cannot guarantee that server-side tool effects stop. Redacted exports keep outcomes, counts and timings while omitting task content, tool payloads and credentials.

Try the two modes: https://github.com/grishahq/runduel

If you already use Agno, I would value a reproducible issue from your integration more than a generic feature request.

### X thread

1/4 Working demo: compare the same invoice, inspect the missing currency, then expand the tool sequence. Baseline runs extraction + normalization. The deliberately regressed candidate runs extraction only.

2/4 These are real Agno 2.5.9 AgentOS events. A deterministic offline model selects the tools; Agno actually executes them. The recorded mode replays those captures without model keys. Replay time is not model latency.

3/4 Live mode sends identical task text to two agent IDs with fresh independent sessions. Answers, tool sequences and exact checks appear side by side. Upstream Agent UI chat and sessions remain at /chat.

4/4 Run recorded mode, then the pinned offline AgentOS: https://github.com/grishahq/runduel
Stop closes the browser stream; it cannot undo tool effects. Exports omit private content by an allowlist.

## Beat 4: The result is small and specific: removing normalization caused three currency failures.

**Audience:** Agent developers and QA engineers assessing the strength of benchmark evidence
**Evidence:** docs/evidence/fixed-suite.json, src/lib/duel/tasks.ts, scripts/plot-evidence.py, public/fixtures
**Image:** assets/04-fixed-suite-results.png
**Alt text:** Data plot from six actual deterministic Agno runs. Across USD, EUR and a zero-value GBP invoice, baseline passes 3/3 exact field checks per task and the intentionally regressed candidate passes 2/3. All three failures are missing currency. The figure explicitly states three synthetic tasks, one pair each, and no model benchmark claim.
**Call to action:** Reproduce the fixed suite and inspect the declared checks and raw streams.

### LinkedIn

I wanted the RunDuel demo to make a claim that someone else could check.

The experiment is intentionally small: three synthetic invoices, one baseline/candidate pair per invoice, and three exact typed fields declared before capturing the runs. The cases cover USD, a decimal EUR amount and a zero-value GBP amount.

Both configurations use the same deterministic offline model adapter, task text and Python tool functions. The controlled change is whether the adapter selects the currency-normalization tool. Agno 2.5.9 executes the real tool calls in both cases.

Result: the baseline passes 9/9 field checks and all 3 tasks. The deliberately regressed candidate passes 6/9 field checks and no complete task. Every failed criterion is the missing currency field. ID and numeric amount still match.

That is the whole claim. It demonstrates that the report identifies this injected contract failure and the changed tool sequence. It does not estimate production error rates, rank models or establish faster human debugging. There is one pair per task, no statistical inference and no paid model usage. Artificial demo delays also make these timings unsuitable for a speed comparison.

The checked results include prompt and fixture hashes, expected/actual fields, ordered tools and the capture method. The chart is plotted from that file; it is not generated artwork.

Reproduce and inspect the raw evidence: https://github.com/grishahq/runduel/blob/main/docs/VALIDATION.md

A useful next contribution would be another independently specified task with a regression that exact field checks should catch.

### X thread

1/4 Small, reproducible experiment: 3 synthetic invoices, 1 baseline/candidate pair each, 3 typed field checks declared before capture. USD, decimal EUR and zero-value GBP. Real Agno 2.5.9 tool execution.

2/4 Controlled change: the candidate skips currency normalization. Baseline: 9/9 fields, 3/3 tasks. Candidate: 6/9 fields, 0/3 tasks. All three failures are missing currency; invoice IDs and amounts still match.

3/4 Limits matter: deterministic offline model, injected regression, no repeated statistical trial. This does not rank models, estimate production failures or measure faster debugging. Demo delays rule out speed claims.

4/4 The chart comes from checked JSON results, with prompt/fixture hashes and raw streams. Reproduce the method: https://github.com/grishahq/runduel/blob/main/docs/VALIDATION.md
Contribute a task with an independently defined expected outcome.

## Beat 5: RunDuel v0.1.0 is available as an experimental GitHub release.

**Audience:** Agno developers evaluating an experimental open-source tool and potential contributors
**Evidence:** docs/evidence/release-verification.json, docs/RELEASE-NOTES-v0.1.0.md, ATTRIBUTION.md, PLAN.md
**Image:** assets/05-release-quickstart.png
**Alt text:** RunDuel v0.1.0 quickstart card typeset from the verified release instructions. Clone grishahq/runduel at v0.1.0, install with pnpm using the frozen lockfile, run pnpm dev, open localhost:3000 and choose Compare runs. Marked experimental, with Agno Agent UI attribution. It is an instruction card, not a screenshot.
**Call to action:** Install the immutable release, run the no-key demo and report one reproducible issue.

### LinkedIn

RunDuel v0.1.0 is available as an experimental GitHub release.

It is an attributed MIT-licensed fork of Agno Agent UI, with upstream history and license preserved. The addition is a focused comparison workspace: two agent configurations, identical task text, independent sessions, side-by-side answers and tool sequences, explicit JSON field checks, and redacted JSON/HTML evidence summaries.

The fastest way to inspect it needs no model key:

git clone --branch v0.1.0 https://github.com/grishahq/runduel.git
cd runduel
pnpm install --frozen-lockfile
pnpm dev

Open localhost:3000 and click Compare runs. The recorded invoice example shows a deliberately removed normalization step and the resulting missing currency. A pinned Python 3.12 / Agno 2.5.9 example also runs the real tools locally.

The release includes source and evidence downloads. The public tag and clean source installation are checked in the release-verification record. The validation covers protocol failure/cancellation paths, redaction, the preserved chat/session workflow and real browser rendering.

This is v0.1 developer tooling: exact scalar JSON checks, one documented Agno version, no batch history yet. The next milestone is batch task suites and saved comparisons. A second backend should follow evidence of actual demand.

Release and quickstart: https://github.com/grishahq/runduel/releases/tag/v0.1.0

If you build on Agno, try one real task and report a reproducible issue with redacted metadata. Useful contracts and clear failure cases are the contributions I would most like to see.

### X thread

1/4 RunDuel v0.1.0 is released as experimental developer tooling. Paired Agno runs, explicit JSON field checks, ordered tools and redacted evidence exports. Built on Agno Agent UI with its MIT license and history preserved.

2/4 No-key quickstart: clone grishahq/runduel at tag v0.1.0, run pnpm install --frozen-lockfile, then pnpm dev. Open localhost:3000 → Compare runs. The recorded example exposes a deliberately missing currency field.

3/4 Source and evidence downloads are included. Clean source installation and public tag verification are recorded. Agno 2.5.9 is the tested target. Batch/history are next; stopping a browser stream cannot guarantee server-side cancellation.

4/4 Release: https://github.com/grishahq/runduel/releases/tag/v0.1.0
Try one task, inspect its checks and report a reproducible issue with redacted metadata. No model-quality, adoption or human-productivity claim is implied.

