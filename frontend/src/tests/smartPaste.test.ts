import { describe, expect, it } from "vitest";
import { parseSurplus } from "../lib/smartPaste";

describe("smart paste", () => {
  it("infers an evening pickup from the cooked time", () => {
    expect(parseSurplus("200 plates veg biryani, cooked 9pm, pickup by 11:30", new Date(2026, 10, 22, 22))).toEqual({
      quantity: 200, food: "veg biryani", prepared: "2026-11-22T21:00", pickup: "2026-11-22T23:30",
    });
  });

  it("handles overnight pickup and rejects an impossible time", () => {
    const now = new Date(2026, 10, 23, 0, 15);
    expect(parseSurplus("20 meals dal, cooked 11:30pm, pickup by 12:45am", now)?.pickup).toBe("2026-11-23T00:45");
    expect(parseSurplus("20 meals dal, cooked 11:90pm, pickup by 12:45am", now)).toBeNull();
  });
});
