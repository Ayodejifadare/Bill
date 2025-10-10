export const devAuthConfig = {
  // Toggle OTP debug in dev via localStorage or env if available
  shouldShowOTPDebug(): boolean {
    if (typeof window === "undefined") return false;
    try {
      const v = localStorage.getItem("VITE_SHOW_OTP_DEBUG");
      return (
        (v ?? "").toLowerCase() === "true" ||
        import.meta.env?.MODE === "development"
      );
    } catch {
      return import.meta.env?.MODE === "development";
    }
  },
  // Optional fixed mock OTP for demos
  getMockOTP(): string {
    if (typeof window === "undefined") return "000000";
    try {
      return localStorage.getItem("VITE_MOCK_OTP") || "000000";
    } catch {
      return "000000";
    }
  },
  log(message: string, ...args: any[]) {
    if (this.shouldShowOTPDebug()) {
      console.debug(`[OTP DEBUG] ${message}`, ...args);
    }
  },
  logError(message: string, error: unknown) {
    if (this.shouldShowOTPDebug()) {
      console.error(`[OTP DEBUG] ${message}`, error);
    }
  },
};
