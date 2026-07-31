import { describe, expect, it } from "vitest";
import { APPLICATION_FIELD_LIMITS, applicationSchema, compareExtraction, GOVERNMENT_WARNING, type ApplicationFields, type Extraction } from "./review";

const application: ApplicationFields = {
  brandName: "Stone's Throw",
  classType: "Kentucky Straight Bourbon Whiskey",
  alcoholContent: "45% Alc./Vol. (90 Proof)",
  netContents: "750 mL",
};

const compliantExtraction: Extraction = {
  brandName: "STONE'S THROW",
  classType: "Kentucky Straight Bourbon Whiskey",
  alcoholContent: "45% ALC/VOL - 90 PROOF",
  netContents: "750 ML",
  governmentWarning: GOVERNMENT_WARNING,
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

  it("requires exact warning text and heading treatment", () => {
    const result = compareExtraction(application, { ...compliantExtraction, warningHeadingAllCaps: false });

    expect(result.recommendation).toBe("does-not-match");
    expect(result.checks.find((check) => check.field === "Government warning")?.status).toBe("fail");
  });

  it("routes unreadable evidence to human review", () => {
    const result = compareExtraction(application, { ...compliantExtraction, brandName: null, imageQuality: "unreadable" });

    expect(result.recommendation).toBe("manual-review");
    expect(result.confidence).toBe("low");
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