import { describe, expect, it } from "vitest";
import { POST } from "./route";

const MAX_REQUEST_BYTES = 8 * 1024 * 1024 + 64 * 1024;

describe("POST /api/analyze", () => {
  it("rejects a lengthless multipart body that exceeds the request limit", async () => {
    const request = new Request("http://localhost/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "multipart/form-data; boundary=test" },
      body: "x".repeat(MAX_REQUEST_BYTES + 1),
    });

    expect(request.headers.get("content-length")).toBeNull();
    const response = await POST(request);

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({ error: "Upload is larger than the 8 MB limit." });
  });

  it("parses a valid multipart request without a declared content length", async () => {
    const formData = new FormData();
    formData.set("label", new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], "label.png", { type: "image/png" }));
    formData.set("application", JSON.stringify({
      brandName: "Old Tom Distillery",
      classType: "Kentucky Straight Bourbon Whiskey",
      alcoholContent: "45% Alc./Vol. (90 Proof)",
      netContents: "750 mL",
    }));
    const request = new Request("http://localhost/api/analyze", { method: "POST", body: formData });

    expect(request.headers.get("content-length")).toBeNull();
    const response = await POST(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ recommendation: "appears-compliant", mode: "demo" });
  });
});