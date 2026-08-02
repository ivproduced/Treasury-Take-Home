# Technical Specification

## 1. Scope

Proofmark verifies whether visible label evidence corresponds to one application record. It supports a local queue of artworks for that record, not a distinct-record batch workflow, and does not integrate with COLA, persist records, authenticate users, or issue an approval or rejection. Bottler/producer name and address and imported-product country of origin are outside the current prototype schema.

## 2. Functional requirements

| ID | Requirement | Implementation |
|---|---|---|
| FR-01 | Capture authoritative application values | Brand, class/type, alcohol content, and net contents fields |
| FR-02 | Accept label artwork | JPEG, PNG, or WebP; up to 8 MiB each |
| FR-03 | Queue artwork for one record | Up to 20 local queue items, processed sequentially |
| FR-04 | Extract visible evidence | Optional vision model; explicit simulation when no key exists |
| FR-05 | Compare fields | Case/punctuation-normalized exact comparison |
| FR-06 | Check government warning | Exact case and punctuation with Unicode/whitespace canonicalization, plus uppercase and bold heading signals |
| FR-07 | Preserve judgment | Expected and observed evidence shown for agent review |
| FR-08 | Handle uncertainty | Missing/unreadable evidence routes to manual review |
| FR-09 | Report progress and errors | Per-file state, live completion message, API errors, and explicit upload-rejection reasons |

## 3. Quality requirements

| ID | Requirement | Prototype target or control |
|---|---|---|
| QR-01 | Responsiveness | Provider timeout at 4.5 seconds; demo mode typically completes locally in milliseconds |
| QR-02 | Accessibility | WCAG 2.2 AA target; semantics, keyboard operation, reflow, focus, live status, contrast, reduced motion |
| QR-03 | Confidentiality | Server-only API key, no application persistence, no-store responses, restrictive CSP |
| QR-04 | Integrity | MIME and magic-byte checks, Zod schemas, deterministic comparison |
| QR-05 | Availability | Bounded 8 MiB multipart parsing, per-client and process-wide in-memory throttles, sequential client processing |
| QR-06 | Explainability | Field-level expected/observed values, detail, status, source mode, and confidence |

## 4. Interface contract

### `POST /api/analyze`

Request: `multipart/form-data`

| Part | Type | Constraints |
|---|---|---|
| `label` | File | Non-empty JPEG/PNG/WebP, <= 8 MiB, matching magic bytes |
| `application` | JSON string | Must satisfy the application schema below |

Application shape:

```json
{
  "brandName": "Old Tom Distillery",
  "classType": "Kentucky Straight Bourbon Whiskey",
  "alcoholContent": "45% Alc./Vol. (90 Proof)",
  "netContents": "750 mL"
}
```

Successful response:

```json
{
  "checks": [
    {
      "field": "Brand name",
      "expected": "Old Tom Distillery",
      "observed": "OLD TOM DISTILLERY",
      "status": "pass",
      "detail": "Matches after case and punctuation normalization."
    }
  ],
  "recommendation": "appears-compliant",
  "confidence": "high",
  "imageQuality": "good",
  "notes": [],
  "mode": "ai",
  "durationMs": 820
}
```

Recommendation values are `appears-compliant`, `manual-review`, or `does-not-match`. They are advisory workflow states, not legal determinations.

Error responses use `{ "error": "human-readable message" }` and an appropriate `400`, `403`, `413`, `415`, `422`, `429`, or `502` status.

## 5. Comparison rules

General field normalization applies Unicode NFKC, US English lowercase conversion, replacement of non-alphanumeric runs with one space, and trimming. This intentionally tolerates casing and punctuation differences such as `STONE'S THROW` versus `Stone's Throw`; it does not perform fuzzy semantic matching. The statutory warning uses a separate canonical comparison that preserves case and punctuation while normalizing Unicode, whitespace runs, and surrounding whitespace.

Any observed conflicting value produces `does-not-match`. Missing evidence or degraded image quality produces `manual-review` unless another field already conflicts. An `appears-compliant` result requires all fields to pass and image quality to be `good`.

Demo simulation is always assigned `review` image quality, so it cannot produce `appears-compliant`.

## 6. Configuration

| Variable | Required | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | No | Enables real vision extraction; absence activates demo mode |
| `OPENAI_VISION_MODEL` | No | Model identifier; defaults to `gpt-4.1-mini` |

Secrets must be injected by the host and must not use a `NEXT_PUBLIC_` prefix.

## 7. Acceptance criteria

- Strict TypeScript validation, unit tests, production build, and dependency audit pass.
- A compliant extraction tolerates case/punctuation differences.
- A conflicting ABV is displayed as a mismatch.
- An incorrect warning heading is displayed as a mismatch.
- Unreadable evidence routes to manual review.
- Cross-origin API requests are rejected.
- Security headers include a request-specific nonce CSP.
- Keyboard users can operate all visible controls and status is not conveyed by color alone.
