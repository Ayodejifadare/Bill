import { render, screen, act, waitFor, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NotificationBell } from "./notification-bell";
import { apiClient } from "../../utils/apiClient";
import userEvent from "@testing-library/user-event";

describe("NotificationBell", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it("polls for unread notifications", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ count: 0 }) });
    global.fetch = fetchMock as any;

    render(<NotificationBell onClick={() => {}} />);

    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(60000);
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("displays error when fetch fails", async () => {
    vi.useRealTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    global.fetch = fetchMock as any;

    render(<NotificationBell onClick={() => {}} />);

    expect(
      await screen.findByText(
        /Request failed with status 500/,
        {},
        { timeout: 10000 },
      ),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: /retry/i }, { timeout: 10000 }),
    ).toBeInTheDocument();
  });

  it("updates unread count after marking notifications as read", async () => {
    vi.useRealTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ count: 2 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ count: 0 }) });
    global.fetch = fetchMock as any;

    render(<NotificationBell onClick={() => {}} />);

    expect(await screen.findByText("2")).toBeInTheDocument();

    await act(async () => {
      await apiClient("/api/notifications/mark-all-read", { method: "PATCH" });
    });

    await act(async () => {
      await userEvent.click(screen.getByRole("button"));
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);

    await waitFor(() => {
      expect(screen.queryByText("2")).not.toBeInTheDocument();
    });
  });
});
