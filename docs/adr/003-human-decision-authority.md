# ADR-003: Preserve Human Decision Authority

- Status: Accepted
- Date: 2026-07-30

## Context

Label review contains visual and regulatory nuance. Extraction can fail, warning presentation requires judgment, and a prototype has neither authority nor evidence to make autonomous regulatory decisions.

## Decision

Proofmark produces advisory workflow states only. It displays field-level expected and observed evidence, identifies uncertainty, and routes missing or unreadable evidence to manual review. A compliance agent makes and records the official determination outside Proofmark.

## Consequences

- The interface supports inspection rather than presenting an opaque score.
- `appears-compliant` is intentionally not called `approved`.
- There is no automated COLA write-back or enforcement action.
- Human review limits automation speed but reduces automation-bias and due-process risk.
- Production governance must measure overrides, false-compliant recommendations, and agent reliance without turning the model into the de facto decision-maker.

## Alternatives considered

- **Automatic approval above a confidence threshold:** rejected because confidence is not legal correctness and no calibrated evaluation supports such a threshold.
- **Binary pass/fail output:** rejected because missing and unreadable evidence require an explicit abstention/manual-review state.
- **Hide extracted evidence and show only a recommendation:** rejected because agents need provenance and a basis for disagreement.
