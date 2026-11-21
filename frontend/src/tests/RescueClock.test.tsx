import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import RescueClock from "../components/rescue/RescueClock";

const NOW = new Date("2025-01-01T12:00:00Z").getTime();

function pickupIn(minutes: number): string {
  return new Date(NOW + minutes * 60000).toISOString();
}

describe("RescueClock", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows minutes left with no note above 60 minutes", () => {
    render(<RescueClock pickupBy={pickupIn(90)} />);
    expect(screen.getByText("90 min left")).toBeInTheDocument();
    expect(screen.queryByText("Closing soon")).not.toBeInTheDocument();
    expect(screen.queryByText("Very close to deadline")).not.toBeInTheDocument();
  });

  it("shows 'Closing soon' at exactly 60 minutes", () => {
    render(<RescueClock pickupBy={pickupIn(60)} />);
    expect(screen.getByText("60 min left")).toBeInTheDocument();
    expect(screen.getByText("Closing soon")).toBeInTheDocument();
  });

  it("shows 'Closing soon' at exactly 20 minutes", () => {
    render(<RescueClock pickupBy={pickupIn(20)} />);
    expect(screen.getByText("20 min left")).toBeInTheDocument();
    expect(screen.getByText("Closing soon")).toBeInTheDocument();
  });

  it("shows 'Very close to deadline' below 20 minutes", () => {
    render(<RescueClock pickupBy={pickupIn(19)} />);
    expect(screen.getByText("19 min left")).toBeInTheDocument();
    expect(screen.getByText("Very close to deadline")).toBeInTheDocument();
  });

  it("shows the window-ended text once the pickup time has passed", () => {
    render(<RescueClock pickupBy={pickupIn(-1)} />);
    expect(screen.getByText("Pickup window ended")).toBeInTheDocument();
  });
});
