import { render, screen, cleanup } from "@testing-library/react";
import { describe, test, it, expect, afterEach } from "vitest";
import { TransactionCard } from "./TransactionCard";
import type {
  TransactionType,
  TransactionStatus,
} from "../shared/transactions";

describe("TransactionCard", () => {
  const base = {
    id: "1",
    amount: 10,
    description: "Test",
    date: new Date().toISOString(),
    user: { name: "Alice" },
  };

  afterEach(() => {
    cleanup();
  });

  const typeCases: [TransactionType, string][] = [
    ["sent", "Sent"],
    ["received", "Received"],
    ["split", "Bill Split"],
    ["bill_split", "Bill Split"],
    ["request", "Request"],
  ];

  test.each(typeCases)("renders label for %s", (type, label) => {
    render(
      <TransactionCard transaction={{ ...base, type, status: "completed" }} />,
    );
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  const statusCases: [TransactionStatus, string][] = [
    ["pending", "Pending"],
    ["failed", "Failed"],
  ];

  test.each(statusCases)("shows badge for %s status", (status, label) => {
    render(<TransactionCard transaction={{ ...base, type: "sent", status }} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("hides status badge when completed", () => {
    render(
      <TransactionCard
        transaction={{ ...base, type: "sent", status: "completed" }}
      />,
    );
    expect(screen.queryByText("Pending")).not.toBeInTheDocument();
    expect(screen.queryByText("Failed")).not.toBeInTheDocument();
  });
});
