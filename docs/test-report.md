# Test Report

## Report status

Date: 2026-07-30  
Scope: Proofmark prototype `0.1.0`  
Environment: macOS, Node.js production build, local browser at `http://localhost:3000`

This report records prototype verification performed during implementation. It is not an authorization-to-operate test package or a claim of full WCAG conformance.

## Automated results

| Check | Command | Result |
|---|---|---|
| Strict TypeScript | `npm run lint` | Pass |
| Unit tests | `npm test` | Pass: 4 tests |
| Production compilation | `npm run build` | Pass |
| Dependency audit | `npm audit` | Pass: 0 known vulnerabilities at test time |
| Runtime SBOM | `npm run sbom` | Pass: CycloneDX 1.6, 24 runtime components |

Unit coverage verifies:

1. Case and punctuation differences are tolerated for otherwise equal values.
2. A conflicting alcohol-content value produces a mismatch.
3. Incorrect government-warning heading treatment produces a mismatch.
4. Missing evidence in an unreadable image routes to manual review with low confidence.

## Runtime security checks

| Test | Expected | Observed |
|---|---|---|
| Page headers | Nonce CSP, no-referrer, restricted permissions, nosniff, cross-origin isolation headers | Pass |
| Cross-origin analysis POST | `403` | Pass |
| Response caching | `Cache-Control: no-store` for analysis and dynamic page | Pass |
| Credential exposure | No provider key in client source or response | Pass by architecture/source inspection |
| Dependency tree | No known npm advisory | Pass at test time |

## Workflow checks

Two valid synthetic PNG fixtures were queued and processed in demo mode. The standard filename produced `appears compliant`; a filename containing `mismatch` produced `does not match`. The live region announced `2 of 2 labels analyzed`, and both items exposed five-row comparison tables.

## Accessibility checks

| Area | Result |
|---|---|
| Accessibility tree | One main landmark, named regions, ordered H1/H2 headings, labeled fields, table caption/headers |
| Keyboard | Visible controls reachable in logical order with 3px focus outline |
| Target size | No visible interactive target below 44px in tested desktop/mobile states |
| Reflow | No page-level horizontal overflow at 390px width |
| Status communication | Text and icon accompany color; progress uses `aria-live` |
| Motion | Reduced-motion media query disables sustained animation |
| Contrast | Tested critical pairs ranged from 6.0:1 to 15.0:1 |
| Browser console | No runtime errors during tested workflow |

Manual screen-reader testing with VoiceOver/NVDA, 200-400% zoom, high-contrast/forced-colors testing, speech input, and testing by representative users remain required before claiming WCAG 2.2 AA conformance.

## Tests not yet performed

- Real-provider extraction accuracy or latency
- Representative beer, wine, spirits, and imported-label dataset evaluation
- Glare, curvature, rotation, blur, low-light, and multilingual stress tests
- Adversarial prompt-injection image suite
- Malware, decompression-bomb, and image-decoder sandbox tests
- Distributed rate limiting, load, soak, failover, and disaster recovery
- Authentication, authorization, audit, retention, and privacy controls
- Independent penetration test and accessibility assessment

## Release assessment

The build is suitable for a prototype demonstration using non-sensitive test labels. It is not suitable for operational agency data or automated regulatory decisions until the production controls and evaluation gates in the threat model and AI system card are complete.
