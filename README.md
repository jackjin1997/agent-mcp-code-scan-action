# Agent MCP Code Scan Action

GitHub Action for free Agent/MCP security triage. It scans repository text files for MCP servers, tool registration, remote transports, write actions, credential paths, auth gates, redaction, tests, and CI signals.

Use it as a lightweight pre-launch check, or upload SARIF to GitHub Code Scanning and convert high-risk alerts into a fixed-price human audit.

## Quick Start: GitHub Code Scanning

Save this workflow as `.github/workflows/agent-mcp-code-scanning.yml`:

```yaml
name: Agent/MCP Code Scanning

on:
  workflow_dispatch:
  pull_request:
    paths:
      - "**/*.ts"
      - "**/*.tsx"
      - "**/*.js"
      - "**/*.mjs"
      - "**/*.py"
      - "**/*.go"
      - "**/*.rs"
      - "**/*.md"
      - "package.json"
      - ".github/workflows/**"

jobs:
  audit:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      security-events: write
    steps:
      - uses: actions/checkout@v4
      - uses: jackjin1997/agent-mcp-code-scan-action@v1
        with:
          path: "."
          sarif: "true"
          output: "agent-mcp-audit.sarif"
      - uses: github/codeql-action/upload-sarif@v4
        with:
          sarif_file: agent-mcp-audit.sarif
```

## Markdown Report

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: jackjin1997/agent-mcp-code-scan-action@v1
    with:
      path: "."
      output: "agent-mcp-audit.md"
  - uses: actions/upload-artifact@v4
    with:
      name: agent-mcp-audit
      path: agent-mcp-audit.md
```

## Inputs

| Input | Default | Description |
|---|---|---|
| `path` | `.` | Repository path to scan. |
| `json` | `false` | Emit JSON instead of Markdown. |
| `sarif` | `false` | Emit SARIF 2.1.0 for GitHub Code Scanning. |
| `output` | empty | Optional file path to write the report. |

Set only one of `json` or `sarif`.

## What It Checks

- MCP or agent tool surfaces
- Remote HTTP, SSE, StreamableHTTP, websocket, or listener exposure
- Write, destructive, shell, browser, database, cloud, and external API paths
- Credential and secret-bearing environment usage
- Auth, permission, role, session, token, and CSRF gates
- Redaction or secret-handling signals
- Tool safety annotations
- Tests, CI, and common quality scripts

The scanner is heuristic triage. It does not certify security.

## Safety Model

- No target dependencies are installed.
- No target code is executed.
- No live services are called.
- The action reads checked-out repository files on the runner.
- SARIF upload is handled by GitHub's official `github/codeql-action/upload-sarif` action.

## Human Audit Handoff

When Code Scanning findings show launch-blocking Agent/MCP risk, use the fixed USD $1,000 human review path:

- Service page: https://jackjin1997.github.io/agent-audit-sprint/mcp-security-audit-service.html
- Code Scanning workflow page: https://jackjin1997.github.io/agent-audit-sprint/mcp-code-scanning-github-action.html
- Dedicated SARIF/Code Scanning intake: https://github.com/jackjin1997/agent-audit-sprint/issues/new?template=code-scanning-audit.yml
- Fixed quote: https://jackjin1997.github.io/agent-audit-sprint/quote.html
- Terms: https://jackjin1997.github.io/agent-audit-sprint/terms.html

Do not send payment until scope is accepted in writing.

## Local CLI

```bash
node tools/agent-mcp-audit.mjs /path/to/repo
node tools/agent-mcp-audit.mjs /path/to/repo --json
node tools/agent-mcp-audit.mjs /path/to/repo --sarif > agent-mcp-audit.sarif
```

## License

MIT
