# Test Report

## Report status

Date: 2026-08-02
Scope: Proofmark prototype `0.1.0`  
Environment: macOS, Node.js production build, local browser at `http://localhost:3000`

This report records prototype verification performed during implementation. It is not an authorization-to-operate test package or a claim of full WCAG conformance.

## Automated results

| Check | Command | Result |
|---|---|---|
| Strict TypeScript | `npm run lint` | Pass |
| Unit tests | `npm test` | Pass: 16 tests across 2 files |
| Production compilation | `npm run build` | Pass |
| Multipart workflow smoke | `SMOKE_BASE_URL=http://localhost:3100 npm run smoke:production` | Pass: `200`, 5 checks, manual review |
| Bedrock image smoke | Nova Lite through production route | Pass: `200`, AI mode, 5 checks, 873 ms server duration |
| Dependency audit | `npm audit` | Pass: 0 known vulnerabilities at test time |
| Runtime SBOM | `npm run sbom` | Pass: CycloneDX 1.6, 24 runtime components |

Unit coverage verifies:

1. Case and punctuation differences are tolerated for brand and class/type values.
2. Conflicting alcohol content and notation missing `%` produce mismatches.
3. Equivalent ABV notation and net-content units compare successfully.
4. Incorrect government-warning heading treatment and malformed punctuation produce mismatches.
5. Warning body casing is tolerated when exact words, punctuation, and heading treatment match.
6. Unreadable evidence routes to manual review with low confidence, including conflicting partial OCR.
7. Demo simulation routes to manual review instead of appearing compliant.
8. Shared application field limits accept boundary values and reject oversized values.
9. A custom-domain origin reconstructed from deployment proxy headers is accepted.
10. A foreign origin behind the deployment proxy is rejected.
11. Lengthless multipart bodies over the request limit are rejected before parsing.
12. Valid lengthless multipart requests remain supported and fail safe in demo mode.

## Runtime security checks

| Test | Expected | Observed |
|---|---|---|
| Page headers | Nonce CSP, no-referrer, restricted permissions, nosniff, cross-origin isolation headers | Pass |
| Cross-origin analysis POST | `403` | Pass |
| Response caching | `Cache-Control: no-store` for analysis and dynamic page | Pass |
| Credential exposure | No provider key in client source or response | Pass by architecture/source inspection |
| Dependency tree | No known npm advisory | Pass at test time |

## Workflow checks

A valid synthetic PNG was uploaded and processed through the browser and multipart smoke script in demo mode. It produced `manual review`, exposed `image quality: review`, showed the simulation note, and returned a five-row comparison table. An unsupported text file stayed out of the queue and displayed its filename and rejection reason.

After the Bedrock migration, the 1x1 synthetic PNG completed through Amazon Nova Lite in `873 ms` and returned five schema-validated checks with `unreadable` image quality. This confirms the live provider path and conservative degraded-image handling, but it is not representative latency or extraction-quality evidence.

Changing an application field after analysis cleared the stale result and caused the label to be analyzed again. Browser field limits matched the server schema at 120, 160, 40, and 40 characters.

## Accessibility checks

| Area | Result |
|---|---|
| Accessibility tree | One main landmark, named regions, ordered H1/H2 headings, labeled fields, table caption/headers |
| Keyboard | Visible controls reachable in logical order with 3px focus outline |
| Target size | No visible interactive target below 44px in tested desktop/mobile states |
| Reflow | No page-level horizontal overflow at 390px width, including an expanded result table |
| Status communication | Text and icon accompany color; progress uses `aria-live` |
| Motion | Reduced-motion media query disables sustained animation |
| Contrast | Tested critical pairs ranged from 6.0:1 to 15.0:1 |
| Browser console | No runtime errors during tested workflow |

Manual screen-reader testing with VoiceOver/NVDA, 200-400% zoom, high-contrast/forced-colors testing, speech input, and testing by representative users remain required before claiming WCAG 2.2 AA conformance.

## Tests not yet performed

- Representative real-provider extraction accuracy and latency
- Representative beer, wine, spirits, and imported-label dataset evaluation
- Glare, curvature, rotation, blur, low-light, and multilingual stress tests
- Adversarial prompt-injection image suite
- Malware, decompression-bomb, and image-decoder sandbox tests
- Distributed rate limiting, load, soak, failover, and disaster recovery
- Authentication, authorization, audit, retention, and privacy controls
- Independent penetration test and accessibility assessment

## Release assessment

The build is suitable for a prototype demonstration using non-sensitive test labels. It is not suitable for operational agency data or automated regulatory decisions until the production controls and evaluation gates in the threat model and AI system card are complete.
