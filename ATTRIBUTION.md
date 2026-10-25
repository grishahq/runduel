# Attribution and provenance

RunDuel is a derivative of [Agno Agent UI](https://github.com/agno-agi/agent-ui),
Copyright (c) 2025 Agno, under the MIT license. The original LICENSE is retained
verbatim and applies to this distribution. Original Git history is preserved.

- Immutable upstream baseline: `6dad9593fca6756e1813e4f4b3b2620be6377691`
- Upstream remote: `https://github.com/agno-agi/agent-ui.git`
- Original README snapshot: [docs/UPSTREAM-README.md](docs/UPSTREAM-README.md)
- RunDuel repository: https://github.com/grishahq/runduel
- RunDuel additions: comparison workspace, strict paired-run SSE reader,
  deterministic success checks, redacted exports, offline AgentOS example,
  captured fixtures, tests, evidence and campaign. Maintained by grishahq.

Upstream already implements chat, streaming, tool visualization, reasoning,
multimedia and sessions. RunDuel retains those in `/chat`; these are upstream
capabilities, not new RunDuel inventions. It is an independent experimental fork,
not an official Agno product or endorsed integration. Agno runtime is a separately
installed Apache-2.0 dependency, pinned to 2.5.9 for this compatibility test.

Campaign concept artwork is AI-generated using the built-in imagegen tool;
prompts and source paths are in campaign/provenance.json. Screenshots are actual
local browser captures. The outcome chart is plotted from checked execution data.
All demonstration documents are synthetic. Stars were only a project-selection
interest signal and are not represented as RunDuel adoption.
