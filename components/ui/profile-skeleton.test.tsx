import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { ProfileSkeleton } from "./profile-skeleton";

describe("ProfileSkeleton", () => {
  it("renders multiple skeleton placeholders", () => {
    const html = renderToString(<ProfileSkeleton />);
    const count = (html.match(/data-slot="skeleton"/g) || []).length;
    expect(count).toBeGreaterThan(5);
  });
});
