import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import SafetyNotice from "../components/rescue/SafetyNotice";

afterEach(cleanup);

describe("SafetyNotice", () => {
  it("shows the handling and verification sentence", () => {
    render(<SafetyNotice />);
    expect(
      screen.getByText(
        "Check storage, packaging, and allergens before pickup.",
      ),
    ).toBeInTheDocument();
  });

  it("is exposed as a note landmark", () => {
    render(<SafetyNotice />);
    expect(screen.getByRole("note")).toBeInTheDocument();
  });
});
