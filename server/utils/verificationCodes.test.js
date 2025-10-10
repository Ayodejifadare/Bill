/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("crypto", () => ({
  randomInt: vi.fn(),
}));

import { randomInt } from "crypto";
import { generateCode, cleanupExpiredCodes } from "./verificationCodes.js";

afterEach(() => {
  vi.clearAllMocks();
});

describe("generateCode", () => {
  it("returns six digits even when randomInt yields values needing leading zeros", () => {
    randomInt.mockReturnValueOnce(7).mockReturnValueOnce(999999);

    const firstCode = generateCode();
    const secondCode = generateCode();

    expect(randomInt).toHaveBeenCalledTimes(2);
    expect(randomInt).toHaveBeenNthCalledWith(1, 0, 1_000_000);
    expect(randomInt).toHaveBeenNthCalledWith(2, 0, 1_000_000);
    expect(firstCode).toBe("000007");
    expect(firstCode).toHaveLength(6);
    expect(secondCode).toBe("999999");
    expect(secondCode).toHaveLength(6);
  });
});

describe("cleanupExpiredCodes", () => {
  const fixedDate = new Date("2024-01-01T00:00:00.000Z");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("deletes verification codes older than the current timestamp", async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 1 });
    const prisma = { verificationCode: { deleteMany } };
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    try {
      await cleanupExpiredCodes(prisma);

      expect(deleteMany).toHaveBeenCalledTimes(1);
      expect(deleteMany).toHaveBeenCalledWith({
        where: { expiresAt: { lt: new Date(fixedDate) } },
      });
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it("logs and swallows errors thrown during deletion", async () => {
    const error = new Error("database failure");
    const deleteMany = vi.fn().mockRejectedValue(error);
    const prisma = { verificationCode: { deleteMany } };
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    try {
      await expect(cleanupExpiredCodes(prisma)).resolves.toBeUndefined();

      expect(deleteMany).toHaveBeenCalledWith({
        where: { expiresAt: { lt: new Date(fixedDate) } },
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Cleanup verification codes error:",
        error,
      );
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});
