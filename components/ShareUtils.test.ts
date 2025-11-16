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

  it("includes link and summary when sharing a pay link", () => {
    const shareText = generateShareText(
      {
        type: "pay_link",
        title: "Payment link",
        amount: 64,
        description: "January rent",
        paymentMethod: "Chase Bank • ••6789",
        payLinkUrl: "https://biltip.app/pay-links/example-token",
        recipientName: "Sam",
      },
      formatAmount,
      userProfile,
    );

    expect(shareText).toContain("example-token");
    expect(shareText).toContain("Sam");
    expect(shareText).toContain("Chase Bank");
  });
});
