# Changelog

## 0.1.0 — experimental prerelease

- Preserves Agent UI chat, streaming, tool views and sessions at `/chat`.
- Adds paired concurrent Agno runs on identical text and isolated sessions.
- Displays ordered tool calls, explicit typed JSON checks, answers, terminal
  outcomes, errors and client-observed wall time.
- Adds custom live tasks, independent browser cancellation and bounded SSE
  parsing; missing usage/cost remains unknown.
- Adds allowlist-redacted JSON/HTML evidence summaries and prompt fingerprints.
- Includes actual Agno 2.5.9 offline agents, six recorded streams, three fixed
  synthetic extraction tasks and one deliberately regressed configuration.
- Documents attribution, compatibility, data boundaries and a measured-scope
  experiment; includes meaningful contract and browser tests.

Known limits: one tested Agno version, no batch/history yet, exact scalar JSON
checks only, no paused approvals or teams in comparison mode, and stopping the
browser stream does not guarantee cancellation of server-side effects.
