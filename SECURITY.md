# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| `v1` | Yes |

## Reporting Scanner Issues

Open an issue in this repository for scanner bugs, false positives, false negatives, or SARIF formatting problems.

Do not paste secrets, private keys, cookies, customer data, production logs, or proprietary source code into public issues. For private Agent/MCP audit work, use the scope-first intake and wait for written scope acceptance before sending payment:

https://github.com/jackjin1997/agent-audit-sprint/issues/new?template=code-scanning-audit.yml

## Scanner Safety

This action reads checked-out repository files on the GitHub runner. It does not install target dependencies, execute target code, or call target live services.
