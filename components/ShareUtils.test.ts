import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { generateShareText } from "./ShareUtils";

describe("generateShareText", () => {
  const formatAmount = (n: number) => `$${n.toFixed(2)}`;
  const userProfile = { name: "Alex" };

  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-15T10:00:00Z"));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it("formats ISO due dates into relative text", () => {
    const shareText = generateShareText(
      {
        type: "bill_split",
        title: "Team Lunch",
        amount: 48.5,
        participantNames: ["Alex", "Sam"],
        dueDate: "2025-01-15T09:00:00Z",
      },
      formatAmount,
      userProfile,
    );

    expect(shareText).toContain("📅 Due: Today");
  });

  it("preserves pre-formatted due date strings", () => {
    const shareText = generateShareText(
      {
        type: "bill_split",
        title: "Weekend Trip",
        amount: 120,
        participantNames: ["Alex", "Sam"],
        dueDate: "This weekend",
      },
      formatAmount,
      userProfile,
    );

    expect(shareText).toContain("📅 Due: This weekend");
  });
});
