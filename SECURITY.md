# Security

## Prototype threat model

Protected assets are uploaded label artwork, application values, AWS workload identity, and the integrity of review evidence. Relevant threats include oversized or disguised uploads, cross-site submissions, XSS, prompt injection embedded in artwork, malformed model output, credential exposure, denial of service, and automation bias.

Implemented controls include file size and magic-byte validation, same-origin enforcement, schema and length validation, request throttling, provider timeout, inference-profile-bound Bedrock IAM permissions, no-store responses, no upload persistence, a nonce-based Content Security Policy, restrictive browser permissions, deterministic comparisons, visible source evidence, and required human review.

The detailed data-flow, STRIDE analysis, abuse cases, and accepted prototype risks are documented in the [threat model](docs/threat-model.md). AI-specific components, limitations, evaluation needs, and governance are documented in the [AI system card](docs/ai-system-card.md).

## Production controls still required

- Agency identity integration, least-privilege roles, session expiry, and MFA
- Gateway-enforced request limits and distributed rate limiting
- Malware scanning and approved encrypted temporary storage
- Bedrock private networking, approved model/region policy, egress controls, and reviewed service terms
- Immutable audit events without label contents or unnecessary PII
- Document retention and deletion rules approved by records and privacy teams
- Central secret management and automated rotation
- SAST, DAST, dependency monitoring, model red-team tests, and incident response procedures
- Model and prompt versioning, extraction-quality evaluation by beverage type, drift monitoring, and rollback

## Reporting

Do not open a public issue for a vulnerability involving real agency data or credentials. Use the repository owner's private security reporting channel. Do not include label artwork, secrets, or personal data in a report.