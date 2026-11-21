import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import SafetyNotice from "../components/rescue/SafetyNotice";

afterEach(cleanup);

describe("SafetyNotice", () => {
  it("shows the handling and verification sentence", () => {
    render(<SafetyNotice />);
    expect(
      screen.getByText(
        "Handling information provided by donor. Receiver must independently verify suitability before accepting or distributing the food.",
      ),
    ).toBeInTheDocument();
  });

  it("is exposed as a note landmark", () => {
    render(<SafetyNotice />);
    expect(screen.getByRole("note")).toBeInTheDocument();
  });
});
