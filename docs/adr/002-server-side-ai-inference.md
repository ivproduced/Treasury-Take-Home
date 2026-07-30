# ADR-002: Keep AI Inference Server-Side

- Status: Accepted
- Date: 2026-07-30

## Context

The browser needs to submit images for extraction, but provider credentials, prompt controls, output validation, request limits, and provider routing must not be controlled by an untrusted client.

## Decision

The browser sends a same-origin multipart request to a Next.js server route. The server validates the request, calls the configured provider, validates the model output, applies deterministic rules, and returns a no-store result. Provider credentials never enter browser code.

## Consequences

- Secrets and the authoritative prompt remain on the server.
- The browser CSP can restrict connections to the application origin.
- The server can consistently apply timeout, schema, origin, type, size, and signature controls.
- The server temporarily handles complete image bytes and becomes a privacy, capacity, and availability boundary.
- Operational scale requires approved temporary object storage and asynchronous workers rather than large synchronous requests.

## Alternatives considered

- **Direct browser-to-model requests:** rejected because they expose or delegate credentials and bypass authoritative controls.
- **Run a vision model entirely in the browser:** deferred due to model size, performance, update governance, device variability, and extraction-quality uncertainty.
- **Synchronous provider integration inside COLA:** out of scope for the standalone prototype and would introduce authorization and system-of-record coupling.
