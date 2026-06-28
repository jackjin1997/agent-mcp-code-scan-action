# Agent MCP Code Scan Action

[![Smoke Action v1](https://github.com/jackjin1997/agent-mcp-code-scan-action/actions/workflows/smoke-action-v1.yml/badge.svg)](https://github.com/jackjin1997/agent-mcp-code-scan-action/actions/workflows/smoke-action-v1.yml)
[![Release](https://img.shields.io/github/v/release/jackjin1997/agent-mcp-code-scan-action)](https://github.com/jackjin1997/agent-mcp-code-scan-action/releases/latest)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

Free GitHub Action for MCP security scanning, AI agent security triage, and SARIF upload to GitHub Code Scanning. It scans repository text files for MCP servers, tool registration, remote transports, write actions, credential paths, auth gates, dynamic URL fetch/SSRF surfaces, redaction, tests, and CI signals.

Use it as a lightweight pre-launch MCP security check, or upload SARIF to GitHub Code Scanning and convert high-risk alerts into a fixed-price human audit. Auth-heavy scanner output routes token, cookie, session, OAuth, Bearer, API key, and credential-boundary signals to the USD $299 Agent Auth focused review. Dynamic URL fetch, pagination URL, callback URL, redirect URL, webhook, proxy fetch, and MCP SSRF signals route to the USD $299 MCP SSRF focused review path.

Install directly from GitHub Actions with:

```yaml
- uses: jackjin1997/agent-mcp-code-scan-action@v1
```

The stable `v1` tag is smoke-tested against both Markdown and SARIF output.

Best first use cases:

- Add Agent/MCP findings to the GitHub Security tab before a hosted MCP launch.
- Check browser automation, cloud, database, workspace, trading, or shell-capable tools for review signals.
- Route token/cookie/session/OAuth findings to the USD $299 Agent Auth Focused Review intake, and dynamic URL fetch / MCP SSRF findings to the USD $299 MCP SSRF Focused Review intake.
- Turn broader high-risk SARIF findings into a scoped USD $1,000 human audit after written scope acceptance.

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
- Agent auth or credential-boundary signals: token, cookie, session, OAuth, Bearer, API key, and credential paths
- Dynamic URL fetch/SSRF surfaces: `fetch_pagination_url`, pagination URL, callback URL, redirect URL, webhook, proxy fetch, and user-controlled fetch targets
- Auth, permission, role, session, token, and CSRF gates
- Redaction or secret-handling signals
- Tool safety annotations
- Tests, CI, and common quality scripts

The scanner is heuristic triage. It does not certify security.

## Good Fit

- MCP servers moving from local-only stdio to remote HTTP, SSE, StreamableHTTP, or hosted deployments
- Agent tools that can write, delete, publish, send messages, execute shell commands, browse, query databases, or mutate cloud resources
- Repos that want Agent/MCP findings in the GitHub Security tab before launch
- Teams that need a quick pre-audit signal without granting private repo access to a vendor

## Limits

- This is not a penetration test or compliance certification.
- It uses static text heuristics and can miss project-specific auth or runtime behavior.
- It does not understand every framework-specific permission model.
- Treat results as a launch-review queue, then verify high-impact items with human review and tests.

## Safety Model

- No target dependencies are installed.
- No target code is executed.
- No live services are called.
- The action reads checked-out repository files on the runner.
- SARIF upload is handled by GitHub's official `github/codeql-action/upload-sarif` action.

## Human Audit Handoff

When Code Scanning findings show launch-blocking Agent/MCP risk, pick the smallest useful human review path. For dynamic URL fetch, pagination, callback, redirect, webhook, proxy, or SSRF-with-credentials findings, use the USD $299 MCP SSRF Focused Review. For token brokers, cookie vaults, site_login/site_logout, OAuth/HITL consent, authenticated scraping, MCP gateway auth, or read/write token separation, use the USD $299 Agent Auth Focused Review. For broader repo/product-slice launch risk, use the fixed USD $1,000 human review path:

- Service page: https://jackjin1997.github.io/agent-audit-sprint/mcp-security-audit-service.html
- Code Scanning workflow page: https://jackjin1997.github.io/agent-audit-sprint/mcp-code-scanning-github-action.html
- Browser automation audit page: https://jackjin1997.github.io/agent-audit-sprint/browser-automation-mcp-security-audit.html
- Browserbase MCP sample audit: https://jackjin1997.github.io/agent-audit-sprint/reports/browserbase-mcp-sample-audit.html
- MCP SSRF review page: https://jackjin1997.github.io/agent-audit-sprint/mcp-ssrf-security-review.html
- USD $299 MCP SSRF focused intake: https://github.com/jackjin1997/agent-audit-sprint/issues/new?template=mcp-ssrf-review.yml
- Agent Auth review page: https://jackjin1997.github.io/agent-audit-sprint/agent-auth-security-review.html
- USD $299 Agent Auth focused intake: https://github.com/jackjin1997/agent-audit-sprint/issues/new?template=agent-auth-review.yml
- Dedicated SARIF/Code Scanning intake: https://github.com/jackjin1997/agent-audit-sprint/issues/new?template=code-scanning-audit.yml
- Fixed quote: https://jackjin1997.github.io/agent-audit-sprint/quote.html
- Terms: https://jackjin1997.github.io/agent-audit-sprint/terms.html

Do not send payment until scope is accepted in writing.

The GitHub issue chooser in this repository links directly to the paid audit intake, browser scanner, and terms page.

Upgrade when the SARIF results point to remote transport exposure, write-capable tools, credential paths, weak redaction evidence, missing tests around tool gates, or a launch decision that needs a ranked fix plan.

Scanner bug and false-positive issues receive an automated support comment with sanitization rules, a shareable browser scanner link for public repos, and the paid audit path for launch-blocking Agent/MCP risk.

## Local CLI

```bash
node tools/agent-mcp-audit.mjs /path/to/repo
node tools/agent-mcp-audit.mjs /path/to/repo --json
node tools/agent-mcp-audit.mjs /path/to/repo --sarif > agent-mcp-audit.sarif
```

## License

MIT
