import { describe, expect, it } from "vitest";
import { pollInterval } from "../hooks/usePolling";

describe("pollInterval", () => {
  it("polls every 3000 ms while OFFERED", () => {
    expect(pollInterval("OFFERED")).toBe(3000);
  });

  it("stops polling once DELIVERED", () => {
    expect(pollInterval("DELIVERED")).toBe(false);
  });

  it("polls every 3000 ms when status is unknown", () => {
    expect(pollInterval(undefined)).toBe(3000);
  });
});
