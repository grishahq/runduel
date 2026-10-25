# RunDuel implementation plan

RunDuel is an attributed fork of Agno Agent UI. Preserve its chat, streaming,
tool rendering and session workflows; add an integrated comparison workspace.
Upstream baseline: `6dad9593fca6756e1813e4f4b3b2620be6377691` (MIT).

## Stages and v0.1 acceptance

1. Inspect upstream contracts and pin one real Agno 2.x version. Keep upstream
   history, LICENSE and remote. Record the compatibility boundary.
2. Implement paired baseline/candidate runs with identical task text and explicit
   deterministic JSON field checks. Show answers, ordered tool calls, errors,
   terminal status and observed wall latency. Unknown usage/cost stays unknown.
3. Implement strict incremental SSE parsing, independent cancellation, isolated
   session IDs, and redacted JSON/HTML exports (content omitted by default).
4. Ship a fixed synthetic document-extraction suite and intentionally regressed
   offline Agno agents; exercise the actual AgentOS endpoint without model keys.
   Include deterministic replay so the UI also works without Python/credentials.
5. Validate parser/runner/export contracts, failure/cancellation/malformed input,
   retained upstream chat rendering, clean install, production build and browser
   rendering. Conduct a separate evidence-driven review and resolve findings.
6. Publish grishahq/runduel v0.1.0 as an experimental prerelease with source and
   reproducible demo/evidence assets. Verify the public tag and clean install.
7. Prepare five LinkedIn posts and five X threads with source references and
   original concept art plus real screenshots/charts. Inspect available social
   access, coordinate slots under the portfolio lock, record real states only.

## Roadmap

- v0.1: paired Agno runs, explicit checks, offline demo, evidence exports.
- v0.2: batch task suites, saved comparison history and reviewed check editing.
- v0.3: a second backend only after user feedback justifies its contract.

## Maintenance

Track upstream SHA changes in ATTRIBUTION.md; merge upstream deliberately and run
chat/comparison smoke checks. Pin the tested Agno version and JS lockfile. Review
dependencies monthly and reproduce reported issues from exported metadata (never
request secrets). Version the record/export schema; do not silently change check
semantics. This is an experimental developer tool, not a hosted service or a
statistical model leaderboard. Controlled synthetic results are not model quality
or human productivity claims.
