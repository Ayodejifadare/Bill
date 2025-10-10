import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../utils/apiClient", () => ({
  apiClient: vi.fn(),
}));

vi.mock("../utils/auth-dev-config", () => ({
  devAuthConfig: {
    log: vi.fn(),
  },
}));

import { authService } from "./auth";
import { apiClient } from "../utils/apiClient";
import { devAuthConfig } from "../utils/auth-dev-config";

const apiClientMock = vi.mocked(apiClient);
const logMock = vi.mocked(devAuthConfig.log);

describe("authService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("sendOTP", () => {
    it("normalizes phone numbers and forwards them in the request body", async () => {
      apiClientMock.mockResolvedValueOnce({ otp: "111222" });

      const result = await authService.sendOTP("+1 (234) 567-8900");

      expect(apiClientMock).toHaveBeenCalledWith("/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: "+12345678900" }),
      });
      expect(logMock).toHaveBeenCalledWith("sendOTP -> normalized", {
        phone: "+1 (234) 567-8900",
        normalized: "+12345678900",
        region: undefined,
      });
      expect(result).toEqual({ success: true, otp: "111222" });
    });

    it("returns a failure response when the request errors", async () => {
      const error = new Error("Server down");
      apiClientMock.mockRejectedValueOnce(error);

      const result = await authService.sendOTP("234 567 8900");

      expect(result).toEqual({ success: false, error: "Server down" });
    });
  });

  describe("verifyOTP", () => {
    it("posts normalized numbers with the otp and returns auth data", async () => {
      const response = {
        token: "token-123",
        user: { id: "user-1", name: "Alice" },
      };
      apiClientMock.mockResolvedValueOnce(response);

      const result = await authService.verifyOTP(
        "0049 123 456",
        "654321",
        "Alice",
        true,
      );

      expect(apiClientMock).toHaveBeenCalledWith("/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: "+49123456", otp: "654321" }),
      });
      expect(logMock).toHaveBeenCalledWith("verifyOTP -> normalized", {
        phone: "0049 123 456",
        normalized: "+49123456",
        isNewUser: true,
        namePresent: true,
      });
      expect(result).toEqual({
        success: true,
        token: "token-123",
        user: { id: "user-1", name: "Alice" },
      });
    });

    it("returns a failure response when verification errors", async () => {
      const error = new Error("Wrong code");
      apiClientMock.mockRejectedValueOnce(error);

      const result = await authService.verifyOTP("1234567890", "000000");

      expect(result).toEqual({ success: false, error: "Wrong code" });
    });
  });
});
