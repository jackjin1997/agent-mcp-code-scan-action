# GitHub Action Listing Copy

Use this copy when publishing the Action through GitHub's release UI.

## Name

Agent MCP Code Scan

## Short Description

MCP and AI agent security scan with SARIF for GitHub Code Scanning.

## Full Description

Free GitHub Action for MCP security scanning, AI agent security triage, and SARIF upload to GitHub Code Scanning. The action scans repository text files for MCP servers, tool registration, remote transports, write actions, credential paths, auth gates, redaction, tests, and CI signals.

It can emit Markdown for a workflow artifact or SARIF 2.1.0 for upload to GitHub Code Scanning with `github/codeql-action/upload-sarif`.

Safety model:

- No target dependencies are installed.
- No target code is executed.
- No live target services are called.
- The action reads checked-out repository files on the runner.

Recommended use:

- Add a pre-launch Agent/MCP check.
- Upload SARIF findings to the GitHub Security tab.
- Scan browser automation, cloud, database, workspace, trading, shell, and API-mutating tool surfaces.
- Use results as a launch-review queue before hosted MCP rollout.
- Convert high-risk SARIF findings into the fixed USD $1,000 human Agent/MCP Audit Sprint after written scope acceptance.

## Primary Workflow

```yaml
- uses: jackjin1997/agent-mcp-code-scan-action@v1
  with:
    path: "."
    sarif: "true"
    output: "agent-mcp-audit.sarif"
- uses: github/codeql-action/upload-sarif@v4
  with:
    sarif_file: agent-mcp-audit.sarif
```

## Support Links

- Action repository: https://github.com/jackjin1997/agent-mcp-code-scan-action
- Workflow page: https://jackjin1997.github.io/agent-audit-sprint/mcp-code-scanning-github-action.html
- Browser automation audit page: https://jackjin1997.github.io/agent-audit-sprint/browser-automation-mcp-security-audit.html
- Browserbase MCP sample audit: https://jackjin1997.github.io/agent-audit-sprint/reports/browserbase-mcp-sample-audit.html
- Paid SARIF/Code Scanning audit intake: https://github.com/jackjin1997/agent-audit-sprint/issues/new?template=code-scanning-audit.yml
