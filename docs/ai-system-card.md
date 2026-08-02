# AI System Card and AI Bill of Materials

## System summary

| Item | Value |
|---|---|
| System | Proofmark alcohol label evidence extraction |
| Version | Prototype `0.1.0` |
| Intended user | TTB compliance agent |
| Intended use | Extract visible label fields to accelerate human comparison |
| Prohibited use | Autonomous approval/rejection, enforcement action, identity decisions, or use without evidence review |
| Decision authority | Human compliance agent |
| AI mode | Optional server-side multimodal inference |
| Fallback | Explicit deterministic demo simulation when no Bedrock model is configured |

## AI bill of materials

| Component | Identifier | Function | Location / owner | Data received | Notes |
|---|---|---|---|---|---|
| Vision model | `BEDROCK_MODEL_ID`, default `us.amazon.nova-lite-v1:0` | Extract label text and visual heading signals | Amazon Bedrock | Complete uploaded label image and extraction instruction | US cross-region inference profile configured by Terraform |
| Inference API | Amazon Bedrock Converse API | Transport prompt/image and return a forced tool input | AWS | Image bytes, system instruction, user instruction | App Runner authenticates with its IAM instance role |
| System instruction | Inline in `src/app/api/analyze/route.ts` | Constrain task, resist image prompt injection, define output keys | Proofmark source | No separate user data | Must be versioned and evaluated in production |
| Output validator | Zod `extractionSchema` | Enforce types, enums, lengths, and nullable fields | Proofmark server | Model JSON | Rejects malformed output before business logic |
| Comparison engine | `compareExtraction` | Compare extracted evidence with application record | Proofmark server | Validated extraction and application values | Deterministic, not an ML component |
| Demo simulator | `createDemoExtraction` | Support credential-free workflow demonstration | Proofmark server | Application fields and filename | Does not inspect image pixels; always labeled `demo` and routed to manual review or mismatch |

No embeddings, vector database, fine-tuned weights, autonomous agents, retrieval corpus, or model-accessible tools are used.

## Inputs and outputs

Inputs are one JPEG/PNG/WebP label and four application fields. AI output is limited to five nullable evidence fields, two warning-heading signals, an image-quality enum, and up to four short notes. The model does not directly assign pass/fail status or call other systems.

## Safety and security controls

- Treat all image text as untrusted data, never as instructions.
- Tell the model not to infer missing evidence.
- Use temperature zero and force the schema-described extraction tool.
- Parse and validate the complete response before use.
- Keep field comparison outside the model.
- Show expected and observed values to the agent.
- Route missing/unreadable evidence to manual review.
- Apply a 4.5-second timeout and fail closed on provider/schema errors.
- Use IAM workload identity and keep model traffic on the server.

## Known limitations

- Visual extraction can fail with glare, curvature, occlusion, unusual typography, low resolution, or adversarial text.
- `warningHeadingBold` and image quality are model judgments, not physical-print measurements.
- Normalized exact matching does not recognize all semantically equivalent values and may require agent judgment.
- Provider behavior can change; record the configured inference profile and evaluated model revision with each release.
- Demo mode is a workflow fixture and is not evidence of extraction accuracy.
- The current prototype has no representative labeled evaluation dataset and therefore makes no accuracy, fairness, or error-rate claim.

## Evaluation plan

Before production, establish a versioned, rights-cleared dataset stratified by beverage type, image quality, label layout, warning defect, and mismatch type. Measure field-level precision/recall, exact warning detection, abstention/manual-review rate, false-compliant rate, latency percentiles, and performance by image-quality slice. Treat false-compliant recommendations as the highest-cost error. Include prompt-injection, malformed-output, provider-failure, and regression suites. Require compliance-owner acceptance thresholds before deployment and after every model or prompt change.

## Governance and change control

Record the model deployment/version, prompt hash, schema version, rule version, and evaluation report with each release. Material changes require security review, privacy review, accessibility review where UI behavior changes, and compliance-owner approval. Production must support rollback to a previously evaluated combination.

## Data governance

The prototype stores no files, but Amazon Bedrock receives the image for inference and a US cross-region profile may route it among supported US Regions. Operational use requires an approved privacy impact assessment, geographic processing decision, retention configuration, incident process, and confirmation that the selected Bedrock model and regions meet agency policy.
