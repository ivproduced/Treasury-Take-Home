const baseUrl = process.env.SMOKE_BASE_URL ?? "https://proofmark.ivproduced.com";
const origin = new URL(baseUrl).origin;
const endpoint = new URL("/api/analyze", origin);
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

const formData = new FormData();
formData.set("label", new Blob([png], { type: "image/png" }), "production-smoke.png");
formData.set("application", JSON.stringify({
  brandName: "Production Smoke Test",
  classType: "Distilled Spirits Specialty",
  alcoholContent: "40% Alc./Vol. (80 Proof)",
  netContents: "750 mL",
}));

const response = await fetch(endpoint, {
  method: "POST",
  headers: { Origin: origin },
  body: formData,
});
const payload = await response.json();

if (!response.ok) throw new Error(`Production upload failed with ${response.status}: ${JSON.stringify(payload)}`);
if (!Array.isArray(payload.checks) || payload.checks.length === 0) throw new Error("Production response contained no comparison checks.");
if (!["appears-compliant", "manual-review", "does-not-match"].includes(payload.recommendation)) throw new Error("Production response contained an invalid recommendation.");
if (payload.mode === "demo" && payload.recommendation === "appears-compliant") throw new Error("Demo mode returned an unsafe appears-compliant recommendation.");

console.log(JSON.stringify({
  endpoint: endpoint.href,
  status: response.status,
  mode: payload.mode,
  recommendation: payload.recommendation,
  imageQuality: payload.imageQuality,
  checks: payload.checks.length,
  durationMs: payload.durationMs,
}, null, 2));