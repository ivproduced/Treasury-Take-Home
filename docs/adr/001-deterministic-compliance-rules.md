# ADR-001: Use Deterministic Compliance Rules

- Status: Accepted
- Date: 2026-07-30

## Context

Vision models are useful for extracting text and visual signals but are probabilistic, can hallucinate missing content, and can change across model versions. Regulatory comparisons need repeatable behavior and inspectable reasons.

## Decision

The model extracts evidence into a strict schema. Application code, not the model, normalizes and compares values, enforces the government-warning rule, and assigns one of three advisory recommendation states.

## Consequences

- The same validated input produces the same comparison result.
- Rules are unit-testable and can be reviewed independently of the provider.
- Model prompt injection cannot directly redefine pass/fail logic.
- The current exact-normalized matching rule may route legitimate semantic equivalents to mismatch; an agent must apply judgment.
- Beverage-specific regulatory rules will require versioned rule packs rather than prompt-only changes.

## Alternatives considered

- **Ask the model for a compliance verdict:** rejected because it is less reproducible, less explainable, and gives untrusted content too much influence.
- **Raw character equality:** rejected because harmless casing and punctuation differences would create excessive false mismatches.
- **Fuzzy matching for all fields:** deferred because thresholds could hide material numerical or wording differences without a representative evaluation set.
