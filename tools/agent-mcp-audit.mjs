#!/usr/bin/env node
import { promises as fs } from "node:fs";
import { resolve, relative, join, extname, basename } from "node:path";

const IGNORE_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  ".next",
  ".turbo",
  "coverage",
  "private-notes",
  ".venv",
  "venv",
  "__pycache__",
]);

const TEXT_EXTENSIONS = new Set([
  ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs",
  ".py", ".go", ".rs", ".java", ".kt", ".rb", ".php",
  ".json", ".jsonc", ".yaml", ".yml", ".toml", ".env", ".md",
  ".sh", ".bash", ".zsh", ".Dockerfile", "",
]);

const SIGNALS = [
  {
    id: "mcp_surface",
    label: "MCP or agent tool surface",
    pattern: /\b(McpServer|registerTool|tools\/list|mcpServers|Model Context Protocol|tool_call|function_call|ToolMessage)\b/i,
  },
  {
    id: "remote_transport",
    label: "Remote transport or listener",
    pattern: /\b(SSEServerTransport|StreamableHTTP|http\.createServer|app\.listen|server\.listen|0\.0\.0\.0|localhost|PORT|--port|websocket|WebSocket)\b/i,
  },
  {
    id: "write_action",
    label: "Write or destructive action",
    pattern: /\b(writeFile|appendFile|rm\(|unlink|mkdir|rmdir|rename|exec\(|spawn\(|execa|child_process|axios\.(post|put|patch|delete)|fetch\([^)]*,\s*\{[^}]*method:\s*['"`](POST|PUT|PATCH|DELETE)|DELETE FROM|INSERT INTO|UPDATE\s+\w+)\b/i,
  },
  {
    id: "secret_env",
    label: "Secret-bearing environment or credential path",
    pattern: /\b(process\.env|API[_-]?KEY|SECRET|TOKEN|PRIVATE[_-]?KEY|COOKIE|PASSWORD|AUTHORIZATION|Bearer|SESSION)\b/i,
  },
  {
    id: "auth_gate",
    label: "Auth or permission gate",
    pattern: /\b(auth|authorize|permission|scope|role|login|session|cookie|csrf|jwt|token|requireAuth|requiresAuth)\b/i,
  },
  {
    id: "redaction",
    label: "Redaction or secret handling",
    pattern: /\b(redact|redaction|censor|mask|sanitize|scrub|REDACTED|redacted)\b/i,
  },
  {
    id: "tool_annotations",
    label: "Tool safety annotations",
    pattern: /\b(readOnlyHint|destructiveHint|idempotentHint|openWorldHint|requiresAuth|readOnly|dangerous|destructive)\b/i,
  },
  {
    id: "tests",
    label: "Tests",
    pattern: /\b(describe\(|it\(|test\(|pytest|unittest|cargo test|go test|vitest|jest|bun:test)\b/i,
  },
  {
    id: "ci",
    label: "CI or release automation",
    pattern: /\b(github\/workflows|ci\.yml|ci\.yaml|release\.yml|release\.yaml|CircleCI|Buildkite|GitLab CI)\b/i,
  },
];

function usage() {
  console.error("Usage: node tools/agent-mcp-audit.mjs <repo-dir> [--json|--sarif]");
}

function isTextCandidate(file) {
  if (basename(file) === "Dockerfile") return true;
  return TEXT_EXTENSIONS.has(extname(file));
}

async function walk(dir, root, files = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!IGNORE_DIRS.has(entry.name)) await walk(join(dir, entry.name), root, files);
      continue;
    }
    if (!entry.isFile()) continue;
    const file = join(dir, entry.name);
    if (isTextCandidate(file)) files.push(file);
  }
  return files;
}

async function readLimited(file) {
  const stat = await fs.stat(file);
  if (stat.size > 700_000) return "";
  return fs.readFile(file, "utf8").catch(() => "");
}

function addFinding(findings, severity, title, evidence, why, fix) {
  findings.push({ severity, title, evidence, why, fix });
}

function severityRank(severity) {
  return { High: 0, Medium: 1, Low: 2, Info: 3 }[severity] ?? 9;
}

function score(findings) {
  let value = 100;
  for (const finding of findings) {
    if (finding.severity === "High") value -= 18;
    if (finding.severity === "Medium") value -= 10;
    if (finding.severity === "Low") value -= 4;
  }
  return Math.max(0, value);
}

function compactEvidence(files, root, max = 5) {
  return files.slice(0, max).map((file) => relative(root, file));
}

async function analyze(targetDir) {
  const root = resolve(targetDir);
  const allFiles = await walk(root, root);
  const signals = Object.fromEntries(SIGNALS.map((signal) => [signal.id, { ...signal, files: [] }]));
  const packageJsonPath = join(root, "package.json");
  let packageJson = null;

  for (const file of allFiles) {
    const text = await readLimited(file);
    if (!text) continue;
    for (const signal of SIGNALS) {
      if (signal.pattern.test(text) || (signal.id === "ci" && relative(root, file).includes(".github/workflows"))) {
        signals[signal.id].files.push(file);
      }
    }
  }

  try {
    packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf8"));
  } catch {
    packageJson = null;
  }

  const findings = [];
  const hasMcp = signals.mcp_surface.files.length > 0;
  const hasRemote = signals.remote_transport.files.length > 0;
  const hasWrite = signals.write_action.files.length > 0;
  const hasSecrets = signals.secret_env.files.length > 0;
  const hasAuth = signals.auth_gate.files.length > 0;
  const hasRedaction = signals.redaction.files.length > 0;
  const hasAnnotations = signals.tool_annotations.files.length > 0;
  const hasTests = signals.tests.files.length > 0 || allFiles.some((file) => /(^|\/)(__tests__|tests?|spec)\//i.test(relative(root, file)));
  const hasCi = signals.ci.files.length > 0 || allFiles.some((file) => relative(root, file).startsWith(".github/workflows/"));

  if (!hasMcp) {
    addFinding(
      findings,
      "Info",
      "No obvious MCP or tool-calling surface detected",
      [],
      "The scanner is tuned for agent and MCP projects. A low signal here may mean the target is outside scope or uses different naming.",
      "Point the scanner at the package or service that registers tools, not only at docs or a monorepo root."
    );
  }

  if (hasRemote && !hasAuth) {
    addFinding(
      findings,
      "High",
      "Remote listener detected without nearby auth/permission signals",
      compactEvidence(signals.remote_transport.files, root),
      "Agent tool transports are high leverage. If a listener is reachable beyond localhost, tool access needs explicit network and auth assumptions.",
      "Document bind address, trusted clients, proxy/auth layer, and safe defaults. Add a deployment check that fails if write tools are exposed remotely without protection."
    );
  } else if (hasRemote) {
    addFinding(
      findings,
      "Medium",
      "Remote listener needs an explicit exposure policy",
      compactEvidence(signals.remote_transport.files, root),
      "Auth-related code exists, but launch docs should still state whether the transport is local-only, proxy-protected, or safe for remote use.",
      "Add transport docs covering bind address, allowed clients, auth layer, CORS/origin assumptions, and write-mode behavior."
    );
  }

  if (hasWrite && !hasAnnotations) {
    addFinding(
      findings,
      "High",
      "Write actions detected without obvious tool safety annotations",
      compactEvidence(signals.write_action.files, root),
      "Agents need machine-readable hints and operator-facing warnings around write, destructive, and privileged tool calls.",
      "Add read-only/destructive annotations where the SDK supports them, and test that write tools are absent unless explicitly enabled."
    );
  } else if (hasWrite) {
    addFinding(
      findings,
      "Medium",
      "Write actions should have confirmation and test coverage",
      compactEvidence(signals.write_action.files, root),
      "Write paths exist and annotations or gating signals are present. The next risk is proving those gates stay in place across CLI, MCP, and remote transports.",
      "Add tests for disabled-by-default write tools, auth failures, dry-run behavior, and post-risk-control lockout."
    );
  }

  if (hasSecrets && !hasRedaction) {
    addFinding(
      findings,
      "High",
      "Credential signals detected without redaction signals",
      compactEvidence(signals.secret_env.files, root),
      "Secrets often leak through thrown errors, debug logs, telemetry payloads, and agent-readable tool output.",
      "Add redaction at logger, error-boundary, and tool-output layers. Include tests for env vars, cookies, Authorization headers, and provider keys."
    );
  } else if (hasSecrets) {
    addFinding(
      findings,
      "Low",
      "Credential paths detected; redaction appears present",
      compactEvidence(signals.secret_env.files, root),
      "This is a positive sign, but secret handling should be tested against real object shapes used by HTTP clients and loggers.",
      "Keep redaction tests for request config, response config, serialized errors, and plain strings."
    );
  }

  if (!hasTests) {
    addFinding(
      findings,
      "High",
      "No obvious tests found",
      [],
      "Agent-facing bugs often sit at protocol boundaries and error paths. Without tests, write gates and tool schemas can regress silently.",
      "Add focused tests for tool registration, schema parsing, auth failures, read/write mode selection, and transport startup."
    );
  }

  if (!hasCi) {
    addFinding(
      findings,
      "Low",
      "No obvious CI workflow detected",
      [],
      "CI is not required for a private prototype, but public agent tools need repeatable validation before users connect accounts or secrets.",
      "Add a minimal workflow for install, typecheck, lint, and focused tests."
    );
  }

  if (packageJson?.scripts) {
    const scripts = packageJson.scripts;
    const missing = ["test", "typecheck", "lint"].filter((name) => !scripts[name]);
    if (missing.length > 0) {
      addFinding(
        findings,
        "Low",
        `package.json is missing common quality scripts: ${missing.join(", ")}`,
        ["package.json"],
        "A predictable audit handoff depends on obvious commands for maintainers and CI.",
        "Add or document equivalent commands for tests, type checking, linting, and build validation."
      );
    }
  }

  findings.sort((a, b) => severityRank(a.severity) - severityRank(b.severity));

  return {
    target: root,
    filesScanned: allFiles.length,
    score: score(findings),
    signals: Object.fromEntries(
      Object.entries(signals).map(([id, signal]) => [
        id,
        {
          label: signal.label,
          count: signal.files.length,
          files: compactEvidence(signal.files, root),
        },
      ])
    ),
    findings,
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Agent/MCP Audit Heuristic Report", "");
  lines.push(`Target: \`${report.target}\``);
  lines.push(`Files scanned: ${report.filesScanned}`);
  lines.push(`Heuristic score: ${report.score}/100`, "");
  lines.push("> This scanner is a triage helper, not a security certification. Use it to find review areas quickly before a human audit.", "");
  lines.push("## Signals", "");
  lines.push("| Signal | Count | Example files |");
  lines.push("|---|---:|---|");
  for (const signal of Object.values(report.signals)) {
    lines.push(`| ${signal.label} | ${signal.count} | ${signal.files.map((file) => `\`${file}\``).join("<br>") || "-"} |`);
  }
  lines.push("", "## Findings", "");
  if (report.findings.length === 0) {
    lines.push("No findings generated by this heuristic pass.");
  } else {
    for (const finding of report.findings) {
      lines.push(`### ${finding.severity}: ${finding.title}`, "");
      if (finding.evidence.length) lines.push(`Evidence: ${finding.evidence.map((item) => `\`${item}\``).join(", ")}`, "");
      lines.push(`Why it matters: ${finding.why}`, "");
      lines.push(`Suggested fix: ${finding.fix}`, "");
    }
  }
  lines.push("## Paid 48-hour review", "");
  lines.push("This heuristic output is the starting point for the fixed-price Agent/MCP Audit Sprint.");
  lines.push("Price: USD $1,000 for one repo or product slice.");
  lines.push("Request: https://github.com/jackjin1997/agent-audit-sprint/issues/new?template=audit-request.yml");
  lines.push("Terms: https://jackjin1997.github.io/agent-audit-sprint/terms.html", "");
  lines.push("Include this report, the repo/product URL, delivery visibility, payment network, and the highest-risk launch concern.");
  return lines.join("\n");
}

function slugFor(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "finding";
}

function sarifLevel(severity) {
  return {
    High: "error",
    Medium: "warning",
    Low: "note",
    Info: "note",
  }[severity] || "note";
}

function sarifSecuritySeverity(severity) {
  return {
    High: "8.0",
    Medium: "5.0",
    Low: "2.5",
    Info: "1.0",
  }[severity] || "1.0";
}

function sarifUri(path) {
  return path.replaceAll("\\", "/");
}

function renderSarif(report) {
  const rulesById = new Map();
  const results = report.findings.map((finding) => {
    const ruleId = `agent-mcp-audit/${slugFor(finding.title)}`;
    if (!rulesById.has(ruleId)) {
      rulesById.set(ruleId, {
        id: ruleId,
        name: finding.title,
        shortDescription: {
          text: finding.title,
        },
        fullDescription: {
          text: finding.why,
        },
        help: {
          text: `${finding.why}\n\nSuggested fix: ${finding.fix}\n\nFor a fixed USD $1,000 human review, use https://jackjin1997.github.io/agent-audit-sprint/quote.html after written scope acceptance.`,
        },
        helpUri: "https://jackjin1997.github.io/agent-audit-sprint/mcp-server-security-scan.html",
        properties: {
          tags: ["agent", "mcp", "security", "heuristic"],
          precision: "medium",
          "security-severity": sarifSecuritySeverity(finding.severity),
        },
      });
    }
    return {
      ruleId,
      level: sarifLevel(finding.severity),
      message: {
        text: `${finding.title}. ${finding.why} Suggested fix: ${finding.fix}`,
      },
      locations: finding.evidence.map((path) => ({
        physicalLocation: {
          artifactLocation: {
            uri: sarifUri(path),
            uriBaseId: "%SRCROOT%",
          },
          region: {
            startLine: 1,
          },
        },
      })),
      properties: {
        severity: finding.severity,
      },
    };
  });

  return {
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    version: "2.1.0",
    runs: [
      {
        tool: {
          driver: {
            name: "Agent/MCP Audit Heuristic",
            informationUri: "https://jackjin1997.github.io/agent-audit-sprint/mcp-server-security-scan.html",
            version: "1.0.0",
            rules: Array.from(rulesById.values()),
          },
        },
        originalUriBaseIds: {
          "%SRCROOT%": {
            uri: `file://${sarifUri(report.target).replace(/\/?$/, "/")}`,
          },
        },
        invocations: [
          {
            executionSuccessful: true,
            toolExecutionNotifications: [
              {
                level: "note",
                message: {
                  text: `Scanned ${report.filesScanned} files. Heuristic score: ${report.score}/100. This is triage, not a security certification.`,
                },
              },
            ],
          },
        ],
        results,
      },
    ],
  };
}

const args = process.argv.slice(2);
const json = args.includes("--json");
const sarif = args.includes("--sarif");
const target = args.find((arg) => !arg.startsWith("--")) ?? ".";
if (args.includes("--help")) {
  usage();
  process.exit(0);
}
if (json && sarif) {
  console.error("Choose only one output format: --json or --sarif.");
  usage();
  process.exit(1);
}

try {
  const report = await analyze(target);
  const output = sarif ? renderSarif(report) : report;
  if (sarif || json) {
    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  } else {
    process.stdout.write(`${renderMarkdown(report)}\n`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  usage();
  process.exit(1);
}
