import { describe, expect, it } from "vitest";
import { assertAllowedNavigation, validateRunRequest } from "./engine.js";

describe("browser runner request validation", () => {
  it("accepts structured actions and defaults approval", () => {
    const request = validateRunRequest({ startUrl: "https://example.com", actions: [{ action: "click", target: "button" }] });
    expect(request.actions?.[0]).toMatchObject({ action: "click", target: "button", approved: true });
    expect(request.headless).toBe(true);
  });

  it("rejects non-http URLs and unknown actions", () => {
    expect(() => validateRunRequest({ startUrl: "file:///tmp/index.html" })).toThrow(/startUrl/);
    expect(() => validateRunRequest({ startUrl: "https://example.com", actions: [{ action: "eval" }] })).toThrow(/invalid/);
  });

  it("enforces the configured origin allowlist", () => {
    const previous = process.env.BROWSER_ALLOWED_ORIGINS;
    process.env.BROWSER_ALLOWED_ORIGINS = "https://webarena.example";
    expect(assertAllowedNavigation("https://webarena.example/task")).toContain("webarena.example");
    expect(() => assertAllowedNavigation("https://169.254.169.254/latest/meta-data")).toThrow(/outside/);
    if (previous === undefined) delete process.env.BROWSER_ALLOWED_ORIGINS;
    else process.env.BROWSER_ALLOWED_ORIGINS = previous;
  });
});
