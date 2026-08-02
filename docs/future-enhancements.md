# Future Enhancements

## Prioritization principles

Future work should first reduce the risk of incorrect compliant recommendations, then make the workflow operationally scalable, and only then expand convenience features.

## Near term: production foundations

1. Add a Bedrock VPC endpoint, model invocation logging policy, and evaluated model-version release gate.
2. Add agency SSO, role-based authorization, session expiry, and gateway rate/body limits.
3. Add malware scanning, image-decompression limits, encrypted temporary storage, and retention deletion jobs.
4. Build a rights-cleared evaluation set and establish compliance-owner acceptance thresholds.
5. Add model/prompt/schema/rule version metadata and immutable audit events without storing unnecessary label content.
6. Add provider contract tests, adversarial image tests, and end-to-end accessibility automation plus manual assessment.

## Next: operational workflow

1. Support CSV/JSON manifests pairing 200-300 application records with artwork.
2. Move batch work to a durable queue with bounded workers, retries, resumability, and progress events.
3. Add supervisor views for queue health, sampled quality review, override reasons, and drift signals.
4. Export evidence packages to an approved integration boundary without making Proofmark the system of record.
5. Add image-quality guidance and pre-processing for rotation, perspective, glare, and contrast while preserving original evidence.

## Later: capability expansion

1. Beverage-specific rule packs and country-of-origin checks.
2. Evidence localization using bounding boxes so agents can jump to the exact label region.
3. Calibrated abstention using field-level confidence and extraction agreement, not an ungrounded single score.
4. Multilingual label support with compliance-approved translations and separate evaluation slices.
5. Privacy-preserving analytics for review time, error categories, overrides, and model drift.

## Explicitly deferred

- Automatic approval or rejection
- Autonomous COLA updates
- General-purpose model chat over agency records
- Training provider models on submitted labels
- Increasing batch limits without asynchronous backpressure and operational controls
