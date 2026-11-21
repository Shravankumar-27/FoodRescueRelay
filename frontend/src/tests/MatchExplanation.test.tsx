import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import MatchExplanation from "../components/rescue/MatchExplanation";
import type { MatchCandidate } from "../types/api";

afterEach(cleanup);

const candidates: MatchCandidate[] = [
  {
    receiver_name: "Hope Kitchen",
    locality: "North",
    feasible: true,
    rejection_reasons: [],
    distance_km: 3.2,
    travel_minutes: 12,
    score: 0.9,
    factors: {},
    why: ["Within 5 km", "Accepts chilled food"],
  },
  {
    receiver_name: "City Shelter",
    locality: "South",
    feasible: false,
    rejection_reasons: ["Over capacity"],
    distance_km: 18,
    travel_minutes: 40,
    score: 0.2,
    factors: {},
    why: [],
  },
];

describe("MatchExplanation", () => {
  it("renders the 'Why this match?' heading", () => {
    render(<MatchExplanation candidates={candidates} />);
    expect(screen.getByRole("heading", { name: "Why this match?" })).toBeInTheDocument();
  });

  it("renders each feasible reason line", () => {
    render(<MatchExplanation candidates={candidates} />);
    expect(screen.getByText("✓ Within 5 km")).toBeInTheDocument();
    expect(screen.getByText("✓ Accepts chilled food")).toBeInTheDocument();
  });

  it("renders infeasible candidates with their rejection reasons", () => {
    render(<MatchExplanation candidates={candidates} />);
    expect(screen.getByRole("heading", { name: "Not feasible" })).toBeInTheDocument();
    expect(screen.getByText("Over capacity")).toBeInTheDocument();
  });
});
