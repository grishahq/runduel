# RunDuel 0.1.0 — experimental prerelease

Compare two Agno agent configurations on the same task and check required output
fields before choosing a result. This release preserves Agno Agent UI's useful
chat, streaming, tool views and sessions, and adds an integrated paired-run page.

- Concurrent baseline/candidate requests receive identical text and fresh sessions.
- Compare answers, ordered tool calls, typed exact JSON checks, terminal outcomes,
  errors and client-observed wall time. Supply your own live task and expected fields.
- Export redacted JSON/HTML summaries; free text, payloads, endpoint identifiers
  and credentials are omitted. Unknown cost remains null.
- Replay six genuine streams from a real Agno 2.5.9 offline example without API keys.
- Fixed synthetic experiment: 9/9 baseline fields vs 6/9 candidate fields; the
  candidate intentionally skips currency normalization. This detects that injected
  regression, not general model quality, speed or cost improvements.

## Try it

Node.js 22+, pnpm 9.12.0:

```sh
git clone --branch v0.1.0 https://github.com/grishahq/runduel.git
cd runduel
pnpm install --frozen-lockfile
pnpm dev
```

Open http://localhost:3000 and choose Compare runs. For actual local agent/tool
execution, follow the pinned Python 3.12 / Agno 2.5.9 example in README. The source
archive contains the complete application, offline fixtures and documented setup.
The evidence bundle contains checked results, redacted sample exports and captures.

## Maturity and limits

Experimental developer tooling. Only Agno 2.5.9 is tested; exact scalar JSON checks
are deliberately narrow. Batch/history are future work. Stopping the browser
stream does not guarantee server-side cancellation. No external model/API, human
productivity, adoption or unknown-price claim is made.

Built on Agno Agent UI at `6dad9593fca6756e1813e4f4b3b2620be6377691`.
Original MIT license and Git history retained. Independent fork maintained by
grishahq; not an official Agno product. See ATTRIBUTION.md and docs/VALIDATION.md.
