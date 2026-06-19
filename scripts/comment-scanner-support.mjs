#!/usr/bin/env node

const MARKER = "<!-- agent-mcp-code-scan-support -->";
const ACTION_REPO_URL = "https://github.com/jackjin1997/agent-mcp-code-scan-action";
const CODE_SCANNING_PAGE_URL = "https://jackjin1997.github.io/agent-audit-sprint/mcp-code-scanning-github-action.html";
const SCANNER_URL = "https://jackjin1997.github.io/agent-audit-sprint/scan.html";
const PAID_AUDIT_URL = "https://github.com/jackjin1997/agent-audit-sprint/issues/new?template=code-scanning-audit.yml";
const QUOTE_URL = "https://jackjin1997.github.io/agent-audit-sprint/quote.html";
const TERMS_URL = "https://jackjin1997.github.io/agent-audit-sprint/terms.html";

function extractField(body = "", label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`###\\s+${escaped}\\s+([\\s\\S]*?)(?=\\n###\\s+|$)`, "i");
  const match = body.match(pattern);
  return match?.[1]?.trim().replace(/^_No response_$/i, "") || "";
}

function normalizeGitHubRepoUrl(value = "") {
  const match = value.match(/https?:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/);
  if (!match) return "";
  return `https://github.com/${match[1]}/${match[2].replace(/\.git$/i, "")}`;
}

function scannerLinkFor(value = "") {
  const repoUrl = normalizeGitHubRepoUrl(value);
  if (!repoUrl) return SCANNER_URL;
  return `${SCANNER_URL}?repo=${encodeURIComponent(repoUrl)}`;
}

function renderScannerSupportComment(issueBody = "") {
  const issueType = extractField(issueBody, "Issue type") || "not provided";
  const workflow = extractField(issueBody, "Workflow or command") || "not provided";
  const expected = extractField(issueBody, "Expected result") || "not provided";
  const actual = extractField(issueBody, "Actual result") || "not provided";
  const publicRepo = extractField(issueBody, "Public reproduction repo or file path") || "";
  const scannerLink = scannerLinkFor(publicRepo);

  return `${MARKER}
## Scanner support received

Thanks for the Agent/MCP Code Scan Action report.

| Field | Value |
|---|---|
| Issue type | ${issueType} |
| Public reproduction | ${publicRepo || "not provided"} |
| Expected | ${expected} |
| Actual | ${actual} |

### What helps next

Please keep this issue sanitized. Do not paste secrets, private keys, cookies, customer data, proprietary source code, or production logs.

If the target is public, this browser scanner link can produce a second no-execution signal:

${scannerLink}

If the target is private, attach only sanitized workflow snippets, SARIF excerpts, rule names, and filenames needed to reproduce the scanner behavior.

### Free scanner support scope

This repository covers scanner/action bugs, false positives, false negatives, SARIF formatting, and documentation gaps.

Workflow or command captured from the issue:

\`\`\`text
${workflow}
\`\`\`

### Paid audit path

If the scanner or GitHub Security tab is showing launch-blocking Agent/MCP risk, use the fixed USD $1,000 human audit intake:

${PAID_AUDIT_URL}

Do not send payment until scope is accepted in writing.

- Action repo: ${ACTION_REPO_URL}
- Code Scanning workflow page: ${CODE_SCANNING_PAGE_URL}
- Fixed quote: ${QUOTE_URL}
- Terms and payment/start rules: ${TERMS_URL}
`;
}

async function githubRequest(pathOrUrl, options = {}) {
  const token = process.env.GITHUB_TOKEN;
  const apiUrl = process.env.GITHUB_API_URL || "https://api.github.com";
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${apiUrl}${pathOrUrl}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API ${response.status}: ${text.slice(0, 300)}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

async function upsertIssueComment(body) {
  const repo = process.env.GITHUB_REPOSITORY;
  const issueNumber = process.env.ISSUE_NUMBER;
  const token = process.env.GITHUB_TOKEN;

  if (process.env.SCANNER_SUPPORT_DRY_RUN === "true" || !repo || !issueNumber || !token) {
    process.stdout.write(`${body}\n`);
    return;
  }

  const comments = await githubRequest(`/repos/${repo}/issues/${issueNumber}/comments?per_page=100`);
  const existing = comments.find((comment) => comment.body?.includes(MARKER));

  if (existing) {
    await githubRequest(existing.url, {
      method: "PATCH",
      body: JSON.stringify({ body }),
    });
    return;
  }

  await githubRequest(`/repos/${repo}/issues/${issueNumber}/comments`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

async function main() {
  const body = renderScannerSupportComment(process.env.ISSUE_BODY || "");
  await upsertIssueComment(body);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
