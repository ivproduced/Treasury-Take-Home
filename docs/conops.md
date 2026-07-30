# Concept of Operations

## Mission need

TTB agents spend substantial time comparing routine application values with label artwork. Proofmark reduces repetitive visual matching while preserving expert judgment for ambiguity, warning presentation, and regulatory nuance.

## Users and roles

- **Compliance agent:** submits an application record and artwork, reviews evidence, and makes the final determination.
- **Supervisor:** monitors quality and workload in a future operational deployment.
- **System administrator:** configures identity, hosting, model endpoint, retention, and monitoring.
- **Model/system owner:** approves evaluated model, prompt, schema, and rule versions.

The prototype implements only the compliance-agent interaction.

## Normal operations

1. The agent opens a new private review session.
2. The agent enters the approved application values.
3. The agent selects up to 20 label images.
4. Proofmark validates and analyzes each image sequentially.
5. The agent reviews field-level expected and observed evidence.
6. The agent uses the recommendation as decision support and records the official outcome in the system of record outside Proofmark.
7. Closing or refreshing the session removes the in-browser queue; the server retains no application record.

## Result handling

| Recommendation | Meaning | Agent action |
|---|---|---|
| Appears compliant | Every extracted field matched and image quality was good | Verify evidence, then continue the official review process |
| Manual review | Evidence was missing, ambiguous, or image quality was degraded | Inspect artwork directly or request a better image |
| Does not match | At least one extracted value conflicts with the application | Confirm the discrepancy and follow established compliance procedure |

No recommendation authorizes automatic approval or rejection.

## Degraded and contingency operations

- **No model credential:** the application enters conspicuously labeled demo simulation; it must not be used for real review.
- **Provider unavailable or over 4.5 seconds:** the item reports an error and the image is not retained; the agent retries or reviews manually.
- **Unreadable image:** the item routes to manual review.
- **Security validation failure:** the item is rejected with a bounded error message.
- **Application unavailable:** agents use the existing review process; Proofmark is not the system of record.

## Operational constraints

The prototype applies one application record to all images in a batch and has a 20-image interactive limit. Operational 200-300 item submissions require a manifest that pairs records and images, asynchronous storage/queue processing, malware scanning, resumability, and supervisor-visible progress. Agency network restrictions require an approved private model endpoint and controlled egress.

## Security, privacy, and records

Only non-sensitive test labels should be used in the prototype. Production requires agency authentication, least privilege, approved encrypted temporary storage, documented retention/deletion, model-provider data protections, metadata-only auditing, and incident response. The official decision and record remain in the authorized system of record.

## Training and support

Training should explain recommendation meanings, how to inspect evidence, when to disregard the model, how to report suspected prompt injection or incorrect extraction, and how to use the manual fallback. Support documentation must avoid implying that confidence is a probability of legal compliance.

## Success measures

- Median and 95th-percentile time to evidence per label
- Agent review time compared with baseline
- False-compliant recommendation rate
- Manual-review/abstention rate
- Agent override rate and reason
- Warning-defect detection rate
- Accessibility and usability findings by representative users
- Provider availability, timeout rate, and cost per review
