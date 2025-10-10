import { describe, expect, it } from "vitest";
import { resolveRegionForSignup } from "./regions";

describe("resolveRegionForSignup", () => {
  it("prioritizes explicit country codes", () => {
    expect(resolveRegionForSignup("GB", "+447123456789")).toBe("GB");
    expect(resolveRegionForSignup("ca", "+14165551234")).toBe("CA");
  });

  it("falls back to phone parsing when country is missing", () => {
    expect(resolveRegionForSignup(undefined, "+2348012345678")).toBe("NG");
    expect(resolveRegionForSignup(undefined, "+447123456789")).toBe("GB");
    expect(resolveRegionForSignup(undefined, "+16135551234")).toBe("US");
  });

  it("defaults to Nigeria when no hints are available", () => {
    expect(resolveRegionForSignup(undefined, undefined)).toBe("NG");
  });
});
