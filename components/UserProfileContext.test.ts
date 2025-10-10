import { describe, it, expect, afterEach } from "vitest";
import { getSavedSettings } from "./UserProfileContext";

const originalLanguage = navigator.language;

afterEach(() => {
  Object.defineProperty(navigator, "language", {
    value: originalLanguage,
    configurable: true,
  });
  localStorage.clear();
});

describe("getSavedSettings locale detection", () => {
  it("returns Nigerian settings for Nigerian locales", () => {
    Object.defineProperty(navigator, "language", {
      value: "en-NG",
      configurable: true,
    });
    const settings = getSavedSettings();
    expect(settings).toEqual({ region: "NG", currency: "NGN" });
  });

  it("falls back to US settings for non-Nigerian locales", () => {
    Object.defineProperty(navigator, "language", {
      value: "en-US",
      configurable: true,
    });
    const settings = getSavedSettings();
    expect(settings).toEqual({ region: "US", currency: "USD" });
  });
});
