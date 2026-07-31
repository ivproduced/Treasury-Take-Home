# Proofmark

Proofmark is an AI-assisted alcohol label verification prototype for TTB compliance agents. It compares application values with visible label evidence, checks the statutory government warning, supports batch review, and keeps the final decision with the agent.

## Live application

[Open Proofmark](https://proofmark.ivproduced.com)

## Run locally

Requirements: Node.js 20.9 or newer and npm.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Without credentials, the complete workflow runs in clearly identified **demo simulation** mode. Filenames containing `review`, `mismatch`, or `fail` produce a sample ABV discrepancy so both outcomes are easy to evaluate.

To use real vision analysis:

```bash
cp .env.example .env.local
# Set OPENAI_API_KEY in .env.local
npm run dev
```

The key is read only by the server route and is never included in browser code. For an Azure/FedRAMP deployment, replace the provider adapter in `src/app/api/analyze/route.ts` with an approved Azure OpenAI private endpoint; the comparison and UI layers remain unchanged.

## Quality checks

```bash
npm run lint       # strict TypeScript validation
npm test           # deterministic comparison tests
npm run build      # production compilation
npm audit          # production and development dependencies
npm run sbom       # regenerate the CycloneDX runtime inventory
```

## Assurance artifacts

The repository includes a concise review package intended to make architecture, operational assumptions, risk, and evidence inspectable without turning the prototype into an acquisition binder.

| Artifact | Reviewer question answered |
|---|---|
| [Architecture](docs/architecture.md) | What are the components, boundaries, and data flows? |
| [Technical specification](docs/technical-specification.md) | What does the prototype do and what are its contracts and limits? |
| [Threat model](docs/threat-model.md) | How could the system be attacked, and what remains for production? |
| [AI system card and AIBOM](docs/ai-system-card.md) | Which AI components are used, for what purpose, and under what controls? |
| [CONOPS](docs/conops.md) | How would agents use the system in normal and degraded operations? |
| [Test report](docs/test-report.md) | What was tested, what passed, and what evidence is still missing? |
| [Future enhancements](docs/future-enhancements.md) | What is the risk-based path from prototype to operational capability? |
| [Architecture decisions](docs/adr/) | Why are rules deterministic, inference server-side, and decisions human? |
| [CycloneDX SBOM](sbom.cdx.json) | Which runtime packages and versions compose this build? |

The SBOM is generated from `package-lock.json` and should be regenerated for every release. [SECURITY.md](SECURITY.md) states the prototype security boundary and production prerequisites.

## Approach

1. The agent enters the authoritative application values and adds up to 20 JPEG, PNG, or WebP labels.
2. The server validates request size, MIME type, file signature, field lengths, and origin.
3. Vision AI extracts visible evidence into a strict schema. It does not make the compliance decision.
4. Deterministic code performs normalized field comparisons and the exact warning check.
5. The UI presents expected and observed evidence, confidence, and a recommendation for human review.

Sequential batch processing protects the five-second interaction target for each item and avoids overwhelming a model endpoint. A production system handling 200-300 files should use direct-to-approved-object-storage uploads, a durable queue, bounded workers, malware scanning, and progress events rather than increasing the in-request limit.

## Secure AI design

- **Prompt injection resistance:** image text is explicitly treated as untrusted data and never as instructions.
- **Constrained output:** model output is JSON-parsed and validated with Zod; unknown or malformed responses fail closed.
- **Grounded decisions:** AI extracts evidence only. Deterministic rules compare fields and exact statutory text.
- **Human oversight:** recommendations are advisory, evidence is visible, and unreadable or incomplete images route to manual review.
- **Data minimization:** uploads are held in memory for one request, sent only to the configured provider, and never persisted or logged.
- **Availability controls:** 4.5-second provider timeout, 8 MB file cap, request cap, sequential processing, and basic rate limiting.
- **Provider isolation:** credentials remain server-side; browser CSP allows network requests only to the application origin.

See [SECURITY.md](SECURITY.md) for the threat model and production requirements.

## WCAG 2.2 AA target

The interface uses semantic landmarks and heading order, explicit input labels, table headers and captions, a skip link, keyboard-operable controls, 44px targets, visible focus, text-plus-icon status indicators, an `aria-live` progress message, high-contrast tokens, responsive reflow, and reduced-motion support. Automated tooling cannot establish full conformance; production release still requires keyboard, screen-reader, zoom/reflow, and representative-user testing.

## Assumptions and limitations

- The statutory warning check compares normalized words and separately requires uppercase and bold heading signals. Font size and physical placement require human confirmation because image pixels do not establish printed dimensions reliably.
- A single application record applies to every file in a batch. A production importer flow should accept a manifest pairing each record to its artwork.
- In-memory throttling is prototype protection only. Production requires gateway-level distributed rate limits, authentication, authorization, audit events, retention enforcement, and malware scanning.
- Real AI latency and extraction quality depend on the approved model and network. Demo mode is deterministic and does not inspect pixels.
- This prototype does not integrate with COLA and does not issue legal approvals or rejections.

## Deploy

The repository includes a production container and an [AWS App Runner deployment guide](docs/aws-deployment.md). App Runner preserves the server-side analysis route, terminates TLS, and runs the application from a private ECR image. Configure `OPENAI_API_KEY` as an App Runner runtime secret; do not expose it through a `NEXT_PUBLIC_` variable.

Production deployment must also enforce authentication and configure provider egress allowlisting before accepting agency data.