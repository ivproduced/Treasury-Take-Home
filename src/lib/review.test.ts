import { describe, expect, it } from "vitest";
import { APPLICATION_FIELD_LIMITS, applicationSchema, compareExtraction, createDemoExtraction, GOVERNMENT_WARNING, type ApplicationFields, type Extraction } from "./review";

const application: ApplicationFields = {
  brandName: "Stone's Throw",
  classType: "Kentucky Straight Bourbon Whiskey",
  alcoholContent: "45% Alc./Vol. (90 Proof)",
  netContents: "750 mL",
};

const compliantExtraction: Extraction = {
  brandName: "STONE'S THROW",
  classType: "Kentucky Straight Bourbon Whiskey",
  classTypeComplete: true,
  alcoholContent: "45% ALC/VOL - 90 PROOF",
  netContents: "750 ML",
  governmentWarning: GOVERNMENT_WARNING,
  governmentWarningComplete: true,
  warningHeadingAllCaps: true,
  warningHeadingBold: true,
  imageQuality: "good",
  notes: [],
};

describe("compareExtraction", () => {
  it("tolerates casing and punctuation without hiding material differences", () => {
    const result = compareExtraction(application, compliantExtraction);

    expect(result.recommendation).toBe("appears-compliant");
    expect(result.checks.every((check) => check.status === "pass")).toBe(true);
  });

  it("flags a conflicting alcohol value", () => {
    const result = compareExtraction(application, { ...compliantExtraction, alcoholContent: "40% Alc./Vol. (80 Proof)" });

    expect(result.recommendation).toBe("does-not-match");
    expect(result.checks.find((check) => check.field === "Alcohol content")?.status).toBe("fail");
  });

  it("abstains when readable class and warning transcriptions are incomplete", () => {
    const result = compareExtraction(application, {
      ...compliantExtraction,
      classType: "Whiskey",
      classTypeComplete: false,
      governmentWarning: "According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.",
      governmentWarningComplete: false,
    });

    expect(result.checks.find((check) => check.field === "Class / type")?.status).toBe("review");
    expect(result.checks.find((check) => check.field === "Government warning")?.status).toBe("review");
    expect(result.recommendation).toBe("manual-review");
    expect(result.confidence).toBe("medium");
  });

  it("detects structural truncation when completeness is overclaimed", () => {
    const result = compareExtraction(application, {
      ...compliantExtraction,
      classType: "Whiskey",
      classTypeComplete: true,
      governmentWarning: "According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects.",
      governmentWarningComplete: true,
    });

    expect(result.checks.find((check) => check.field === "Class / type")?.status).toBe("review");
    expect(result.checks.find((check) => check.field === "Government warning")?.status).toBe("review");
    expect(result.recommendation).toBe("manual-review");
  });

  it("keeps complete conflicting class evidence as a mismatch", () => {
    const result = compareExtraction(application, {
      ...compliantExtraction,
      classType: "Tennessee Whiskey",
      classTypeComplete: true,
    });

    expect(result.checks.find((check) => check.field === "Class / type")?.status).toBe("fail");
    expect(result.recommendation).toBe("does-not-match");
  });

  it("rejects alcohol content that omits the required percent symbol", () => {
    const result = compareExtraction(application, { ...compliantExtraction, alcoholContent: "45 Alc Vol 90 Proof" });

    expect(result.checks.find((check) => check.field === "Alcohol content")?.status).toBe("fail");
  });

  it("accepts equivalent alcohol notation with normalized units", () => {
    const result = compareExtraction(application, { ...compliantExtraction, alcoholContent: "45% ABV, 90 proof" });

    expect(result.checks.find((check) => check.field === "Alcohol content")?.status).toBe("pass");
  });

  it("accepts joined and converted net-content units", () => {
    const joined = compareExtraction(application, { ...compliantExtraction, netContents: "750mL" });
    const converted = compareExtraction(application, { ...compliantExtraction, netContents: "0.75 L" });

    expect(joined.checks.find((check) => check.field === "Net contents")?.status).toBe("pass");
    expect(converted.checks.find((check) => check.field === "Net contents")?.status).toBe("pass");
  });

  it("requires exact warning text and heading treatment", () => {
    const result = compareExtraction(application, { ...compliantExtraction, warningHeadingAllCaps: false });

    expect(result.recommendation).toBe("does-not-match");
    expect(result.checks.find((check) => check.field === "Government warning")?.status).toBe("fail");
  });

  it("rejects malformed statutory warning punctuation", () => {
    const malformedWarning = GOVERNMENT_WARNING.replace("WARNING:", "WARNING");
    const result = compareExtraction(application, { ...compliantExtraction, governmentWarning: malformedWarning });

    expect(result.recommendation).toBe("does-not-match");
    expect(result.checks.find((check) => check.field === "Government warning")?.status).toBe("fail");
  });

  it("accepts body casing differences when the warning heading treatment passes", () => {
    const result = compareExtraction(application, { ...compliantExtraction, governmentWarning: GOVERNMENT_WARNING.toLocaleUpperCase("en-US") });

    expect(result.checks.find((check) => check.field === "Government warning")?.status).toBe("pass");
  });

  it("routes unreadable evidence to human review", () => {
    const result = compareExtraction(application, { ...compliantExtraction, brandName: null, imageQuality: "unreadable" });

    expect(result.recommendation).toBe("manual-review");
    expect(result.confidence).toBe("low");
  });

  it("routes unreadable conflicting partial evidence to human review", () => {
    const result = compareExtraction(application, {
      ...compliantExtraction,
      alcoholContent: "40% Alc./Vol. (80 Proof)",
      imageQuality: "unreadable",
    });

    expect(result.checks.find((check) => check.field === "Alcohol content")?.status).toBe("fail");
    expect(result.recommendation).toBe("manual-review");
    expect(result.confidence).toBe("low");
  });
});

describe("createDemoExtraction", () => {
  it("always routes simulated evidence to manual review or mismatch", () => {
    const extraction = createDemoExtraction(application, "label.jpg");
    const result = compareExtraction(application, extraction);

    expect(result.recommendation).toBe("manual-review");
    expect(result.imageQuality).toBe("review");
  });
});

describe("applicationSchema", () => {
  it("uses the exported field limits", () => {
    expect(applicationSchema.safeParse({
      ...application,
      alcoholContent: "x".repeat(APPLICATION_FIELD_LIMITS.alcoholContent + 1),
    }).success).toBe(false);
    expect(applicationSchema.safeParse({
      ...application,
      netContents: "x".repeat(APPLICATION_FIELD_LIMITS.netContents),
    }).success).toBe(true);
  });
});