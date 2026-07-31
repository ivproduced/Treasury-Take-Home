import { z } from "zod";

export const GOVERNMENT_WARNING =
  "GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.";

export const APPLICATION_FIELD_LIMITS = {
  brandName: 120,
  classType: 160,
  alcoholContent: 40,
  netContents: 40,
} as const;

export const applicationSchema = z.object({
  brandName: z.string().trim().min(1).max(APPLICATION_FIELD_LIMITS.brandName),
  classType: z.string().trim().min(1).max(APPLICATION_FIELD_LIMITS.classType),
  alcoholContent: z.string().trim().min(1).max(APPLICATION_FIELD_LIMITS.alcoholContent),
  netContents: z.string().trim().min(1).max(APPLICATION_FIELD_LIMITS.netContents),
});

export const extractionSchema = z.object({
  brandName: z.string().max(120).nullable(),
  classType: z.string().max(160).nullable(),
  alcoholContent: z.string().max(40).nullable(),
  netContents: z.string().max(40).nullable(),
  governmentWarning: z.string().max(700).nullable(),
  warningHeadingAllCaps: z.boolean(),
  warningHeadingBold: z.boolean().nullable(),
  imageQuality: z.enum(["good", "review", "unreadable"]),
  notes: z.array(z.string().max(180)).max(4),
});

export type ApplicationFields = z.infer<typeof applicationSchema>;
export type Extraction = z.infer<typeof extractionSchema>;
export type CheckStatus = "pass" | "review" | "fail";

export type ReviewCheck = {
  field: string;
  expected: string;
  observed: string;
  status: CheckStatus;
  detail: string;
};

export type ReviewResult = {
  checks: ReviewCheck[];
  recommendation: "appears-compliant" | "manual-review" | "does-not-match";
  confidence: "high" | "medium" | "low";
  notes: string[];
  mode: "ai" | "demo";
  durationMs: number;
};

function normalizeText(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function fieldCheck(field: string, expected: string, observed: string | null): ReviewCheck {
  if (!observed) {
    return { field, expected, observed: "Not detected", status: "review", detail: "Confirm this field manually." };
  }

  const matches = normalizeText(expected) === normalizeText(observed);
  return {
    field,
    expected,
    observed,
    status: matches ? "pass" : "fail",
    detail: matches ? "Matches after case and punctuation normalization." : "Application and label values differ.",
  };
}

export function compareExtraction(application: ApplicationFields, extraction: Extraction): Omit<ReviewResult, "mode" | "durationMs"> {
  const warningTextMatches = extraction.governmentWarning
    ? normalizeText(extraction.governmentWarning) === normalizeText(GOVERNMENT_WARNING)
    : false;
  const warningPasses = warningTextMatches && extraction.warningHeadingAllCaps && extraction.warningHeadingBold === true;
  const warningStatus: CheckStatus = warningPasses
    ? "pass"
    : extraction.governmentWarning && extraction.warningHeadingBold !== null
      ? "fail"
      : "review";

  const checks = [
    fieldCheck("Brand name", application.brandName, extraction.brandName),
    fieldCheck("Class / type", application.classType, extraction.classType),
    fieldCheck("Alcohol content", application.alcoholContent, extraction.alcoholContent),
    fieldCheck("Net contents", application.netContents, extraction.netContents),
    {
      field: "Government warning",
      expected: "Normalized statutory text; heading uppercase and bold",
      observed: extraction.governmentWarning ?? "Not detected",
      status: warningStatus,
      detail: warningPasses
        ? "Text and heading treatment appear compliant."
        : "An agent must verify exact text, uppercase heading, bold weight, and legibility.",
    },
  ];

  const hasFailure = checks.some((check) => check.status === "fail");
  const needsReview = checks.some((check) => check.status === "review") || extraction.imageQuality !== "good";

  return {
    checks,
    recommendation: hasFailure ? "does-not-match" : needsReview ? "manual-review" : "appears-compliant",
    confidence: extraction.imageQuality === "good" && !needsReview ? "high" : extraction.imageQuality === "unreadable" ? "low" : "medium",
    notes: extraction.notes,
  };
}

export function createDemoExtraction(application: ApplicationFields, fileName: string): Extraction {
  const shouldFlag = /review|mismatch|fail/i.test(fileName);
  return {
    ...application,
    alcoholContent: shouldFlag ? "40% Alc./Vol. (80 Proof)" : application.alcoholContent,
    governmentWarning: GOVERNMENT_WARNING,
    warningHeadingAllCaps: true,
    warningHeadingBold: true,
    imageQuality: "good",
    notes: shouldFlag ? ["Demo fixture includes an alcohol-content discrepancy."] : ["Demo mode uses simulated extraction; configure a vision provider for real OCR."],
  };
}