import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const FIXED_NOW = new Date("2025-01-15T09:00:00Z");

describe("formatBillDate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
    vi.unmock("./formatDueDate");
  });

  it("returns a relative label when the due date is today", async () => {
    const { formatBillDate } = await import("./formatBillDate");
    expect(formatBillDate("2025-01-15T09:00:00Z")).toBe("Today");
  });

  it("returns a relative label when the due date is tomorrow", async () => {
    const { formatBillDate } = await import("./formatBillDate");
    expect(formatBillDate("2025-01-16T09:00:00Z")).toBe("Tomorrow");
  });

  it("returns empty string for invalid values", async () => {
    const { formatBillDate } = await import("./formatBillDate");
    expect(formatBillDate("not-a-real-date")).toBe("");
    expect(formatBillDate("")).toBe("");
  });
});

describe("formatBillDate fallback formatting", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unmock("./formatDueDate");
  });

  it("uses locale formatting when no relative label is available", async () => {
    const mockRelative = vi.fn(() => "");
    vi.doMock("./formatDueDate", () => ({ formatDueDate: mockRelative }));
    const { formatBillDate } = await import("./formatBillDate");

    const localeSpy = vi
      .spyOn(Date.prototype, "toLocaleDateString")
      .mockReturnValue("Jan 10");
    expect(formatBillDate("2025-01-10T00:00:00Z")).toBe("Jan 10");
    expect(mockRelative).toHaveBeenCalledWith("2025-01-10T00:00:00Z");
    localeSpy.mockRestore();
  });
});
