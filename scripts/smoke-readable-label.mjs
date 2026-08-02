import sharp from "sharp";

const baseUrl = process.env.SMOKE_BASE_URL ?? "https://proofmark.ivproduced.com";
const origin = new URL(baseUrl).origin;
const endpoint = new URL("/api/analyze", origin);
const application = {
  brandName: "Old Tom Distillery",
  classType: "Kentucky Straight Bourbon Whiskey",
  alcoholContent: "45% Alc./Vol. (90 Proof)",
  netContents: "750 mL",
};
const warning = "GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.";

function escapeXml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function wrapWords(value, maxCharacters) {
  const lines = [];
  let line = "";
  for (const word of value.split(" ")) {
    if (line && `${line} ${word}`.length > maxCharacters) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

const warningBody = warning.slice("GOVERNMENT WARNING: ".length);
const warningLines = wrapWords(warningBody, 74);
const warningSvg = warningLines
  .map((line, index) => `<text x="110" y="${1160 + index * 58}" font-size="44">${escapeXml(line)}</text>`)
  .join("");
const svg = `
<svg width="1600" height="2000" viewBox="0 0 1600 2000" xmlns="http://www.w3.org/2000/svg">
  <rect width="1600" height="2000" fill="#fffdf7"/>
  <rect x="48" y="48" width="1504" height="1904" fill="none" stroke="#1f2933" stroke-width="8"/>
  <g fill="#111827" font-family="Arial, Helvetica, sans-serif" text-anchor="middle">
    <text x="800" y="245" font-size="108" font-weight="700">OLD TOM DISTILLERY</text>
    <text x="800" y="410" font-size="66" font-weight="700">KENTUCKY STRAIGHT BOURBON WHISKEY</text>
    <line x1="180" y1="485" x2="1420" y2="485" stroke="#111827" stroke-width="4"/>
    <text x="800" y="635" font-size="58">45% Alc./Vol. (90 Proof)</text>
    <text x="800" y="755" font-size="58">750 mL</text>
  </g>
  <g fill="#111827" font-family="Arial, Helvetica, sans-serif" text-anchor="start">
    <text x="110" y="1050" font-size="48" font-weight="700">GOVERNMENT WARNING:</text>
    ${warningSvg}
  </g>
</svg>`;
const png = await sharp(Buffer.from(svg)).png().toBuffer();

async function analyze(iteration) {
  const formData = new FormData();
  formData.set("label", new Blob([png], { type: "image/png" }), "readable-matching-label.png");
  formData.set("application", JSON.stringify(application));

  const response = await fetch(endpoint, { method: "POST", headers: { Origin: origin }, body: formData });
  const payload = await response.json();
  if (!response.ok) throw new Error(`Readable-label run ${iteration} failed with ${response.status}: ${JSON.stringify(payload)}`);
  if (payload.mode !== "ai") throw new Error(`Readable-label run ${iteration} did not use AI mode.`);

  const classCheck = payload.checks?.find((check) => check.field === "Class / type");
  const warningCheck = payload.checks?.find((check) => check.field === "Government warning");
  if (!classCheck || !warningCheck) throw new Error(`Readable-label run ${iteration} omitted required checks.`);
  if (classCheck.status === "fail" || warningCheck.status === "fail" || payload.recommendation === "does-not-match") {
    throw new Error(`Readable-label run ${iteration} produced a false mismatch: ${JSON.stringify({ classCheck, warningCheck, recommendation: payload.recommendation })}`);
  }
  if (payload.recommendation === "manual-review" && payload.confidence === "high") {
    throw new Error(`Readable-label run ${iteration} assigned high confidence to an abstention.`);
  }

  return {
    iteration,
    recommendation: payload.recommendation,
    confidence: payload.confidence,
    imageQuality: payload.imageQuality,
    classStatus: classCheck.status,
    warningStatus: warningCheck.status,
    durationMs: payload.durationMs,
  };
}

const results = [];
for (let iteration = 1; iteration <= 2; iteration += 1) results.push(await analyze(iteration));
console.log(JSON.stringify({ endpoint: endpoint.href, results }, null, 2));
