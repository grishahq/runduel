# Validation and reproducible evidence

Date: 25 October 2026. Experimental v0.1.0; no external model API credentials used.

## Baseline and compatibility

Agent UI upstream commit `6dad9593fca6756e1813e4f4b3b2620be6377691`, full history and
MIT license retained. Upstream README advertises Agno 2.x. We installed and ran
**Agno 2.5.9 / Python 3.12**, not an inferred latest-version guarantee. Official
version metadata: https://pypi.org/project/agno/2.5.9/. The installed implementation
provided the exact SSE contract; current docs can describe newer versions.

## Fixed suite

Expected fields live in `src/lib/duel/tasks.ts`, independently of the Python tool
implementation. Three synthetic invoices exercise USD, EUR decimal and GBP zero
amount. The baseline and candidate use the same deterministic model adapter,
input text and tool functions; `normalize=True/False` changes only whether the
normalization tool is selected. Agno's real tool dispatcher executes the calls.
The candidate deliberately drops the raw currency without replacing the required
normalized field. There are six actual HTTP streams, one pair per task.

`docs/evidence/fixed-suite.json` records prompt/fixture hashes, answers, checks,
ordered tools, capture time and methodology. `public/fixtures/*.sse` are actual
AgentOS streams. The documented transformation removes token counters from replay
metrics because no provider usage exists. All remaining events are preserved.

Observed result: baseline 9/9 checks and 3/3 tasks; candidate 6/9 checks and 0/3
tasks. All candidate failures are missing currency. This is a controlled injected
regression, not a statistical benchmark of model quality. No throughput, human
productivity, adoption, price or cost claim is established.

## Reproduce

Start the Python example as documented in README, then:

```sh
pnpm exec tsx scripts/record-fixtures.ts
pnpm validate
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

Capture regenerates evidence using fresh sessions and therefore changes IDs,
timestamps and fixture hashes. The experiment's expected outcomes stay fixed.
Run `python -m pip install matplotlib` and `python scripts/plot-evidence.py` to
regenerate the plotted check chart; this optional dependency is not needed to run
RunDuel or the Agno example.

## Checks and retained evidence

- Contract tests: fragmented UTF-8/CRLF SSE, multiline/comment frames, envelope
  compatibility, malformed/oversized/truncated data, missing terminal, HTTP errors,
  completion, tool updates, cancellation, timeout, missing/invalid usage, exact
  types/zero/false/null, custom task validation, redacted hostile content, fresh
  sessions, six real streams and terminal events on an open connection.
- Browser suite: offline scores and downloads; retained upstream chat discovers
  agents, sends a task, renders tool results and reloads its persisted session;
  live paired real AgentOS; mobile overflow; malformed live error; independent
  cancellation; custom identical input and result invalidation after config edit.
- Build, lint, formatting and TypeScript checks: `docs/evidence/*.log`.
- Browser readback: `docs/evidence/browser-results.json`, actual PNG captures and
  downloaded JSON/HTML exports. `campaign/assets/03-real-comparison.png` is a real
  screenshot; `04-fixed-suite-results.png` is plotted execution data.
- Independent review: `docs/evidence/independent-review.md` records the reproduced
  terminal/EOF defect, fix, recheck and review limitations.

Clean release-source/tag installation and public release verification are recorded
separately in `docs/evidence/release-verification.json` after publication.

## Limits

External provider credentials, production loads, Agno versions other than 2.5.9,
comparison teams/workflows and server-side cancellation are unverified. The demo
uses artificial streaming delays; capture or replay timing is not a fair speed
comparison. Google fonts are downloaded during Next's build; installation/build
requires network access. Browser cancellation cannot undo already executed tools.
