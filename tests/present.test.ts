import { describe, it, expect } from "vitest";
import { presentCtfProgress } from "@shared/present";

describe("presentCtfProgress", () => {
  it("marks level 1 as current on a fresh run", () => {
    const view = presentCtfProgress(1, []);
    expect(view.mission.visible).toBe(true);
    expect(view.ladder[0]?.state).toBe("current");
    expect(view.ladder[1]?.state).toBe("locked");
  });

  it("shows completion when level is zero", () => {
    const view = presentCtfProgress(0, [1, 2, 3, 4, 5]);
    expect(view.mission.visible).toBe(false);
    expect(view.completeMessage).toMatch(/All levels solved/);
  });

  it("includes lessons for solved rows", () => {
    const view = presentCtfProgress(2, [1]);
    expect(view.ladder[0]?.state).toBe("solved");
    expect(view.ladder[0]?.lesson).toBeTruthy();
  });
});
