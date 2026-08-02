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
  imageQuality: Extraction["imageQuality"];
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

function canonicalizeWarning(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase("en-US").replace(/\s+/g, " ").trim();
}

function fieldCheck(field: string, expected: string, observed: string | null, matches = observed ? normalizeText(expected) === normalizeText(observed) : false, passDetail = "Matches after case and punctuation normalization."): ReviewCheck {
  if (!observed) {
    return { field, expected, observed: "Not detected", status: "review", detail: "Confirm this field manually." };
  }

  return {
    field,
    expected,
    observed,
    status: matches ? "pass" : "fail",
    detail: matches ? passDetail : "Application and label values differ or use invalid quantity notation.",
  };
}

function parseAlcoholContent(value: string) {
  const normalized = value.normalize("NFKC").toLocaleLowerCase("en-US");
  const percent = normalized.match(/(\d+(?:\.\d+)?)\s*%/);
  const hasAlcoholUnit = /\babv\b/.test(normalized) || /\balc(?:ohol)?[\s./-]*(?:by[\s./-]*)?vol(?:ume)?\b/.test(normalized);
  if (!percent || !hasAlcoholUnit) return null;

  const proof = normalized.match(/(\d+(?:\.\d+)?)\s*proof\b/);
  return { abv: Number(percent[1]), proof: proof ? Number(proof[1]) : null };
}

function alcoholContentMatches(expected: string, observed: string) {
  const expectedValue = parseAlcoholContent(expected);
  const observedValue = parseAlcoholContent(observed);
  if (!expectedValue || !observedValue || expectedValue.abv !== observedValue.abv) return false;
  return expectedValue.proof === null || expectedValue.proof === observedValue.proof;
}

function parseNetContents(value: string) {
  const match = value.normalize("NFKC").trim().match(/^(\d+(?:\.\d+)?)\s*(ml|millilit(?:er|re)s?|cl|centilit(?:er|re)s?|l|lit(?:er|re)s?)\.?$/i);
  if (!match) return null;

  const amount = Number(match[1]);
  const unit = match[2].toLocaleLowerCase("en-US");
  const multiplier = unit === "cl" || unit.startsWith("centilit") ? 10 : unit === "l" || unit.startsWith("lit") ? 1_000 : 1;
  return amount * multiplier;
}

function netContentsMatch(expected: string, observed: string) {
  const expectedMilliliters = parseNetContents(expected);
  const observedMilliliters = parseNetContents(observed);
  return expectedMilliliters !== null && observedMilliliters !== null && Math.abs(expectedMilliliters - observedMilliliters) < 0.001;
}

export function compareExtraction(application: ApplicationFields, extraction: Extraction): Omit<ReviewResult, "mode" | "durationMs"> {
  const warningTextMatches = extraction.governmentWarning
    ? canonicalizeWarning(extraction.governmentWarning) === canonicalizeWarning(GOVERNMENT_WARNING)
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
    fieldCheck("Alcohol content", application.alcoholContent, extraction.alcoholContent, extraction.alcoholContent ? alcoholContentMatches(application.alcoholContent, extraction.alcoholContent) : false, "Numeric ABV, percent symbol, units, and declared proof match."),
    fieldCheck("Net contents", application.netContents, extraction.netContents, extraction.netContents ? netContentsMatch(application.netContents, extraction.netContents) : false, "Numeric volume matches after unit normalization."),
    {
      field: "Government warning",
      expected: "Exact statutory text; heading uppercase and bold",
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
    recommendation: extraction.imageQuality === "unreadable" ? "manual-review" : hasFailure ? "does-not-match" : needsReview ? "manual-review" : "appears-compliant",
    confidence: extraction.imageQuality === "good" && !needsReview ? "high" : extraction.imageQuality === "unreadable" ? "low" : "medium",
    imageQuality: extraction.imageQuality,
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
    imageQuality: "review",
    notes: shouldFlag ? ["Demo fixture includes an alcohol-content discrepancy."] : ["Demo mode uses simulated extraction; configure a vision provider for real OCR."],
  };
}