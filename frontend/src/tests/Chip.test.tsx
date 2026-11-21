import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import Chip from "../components/ui/Chip";

afterEach(cleanup);

describe("Chip", () => {
  it("renders its text content", () => {
    render(<Chip tone="warn">Peanuts</Chip>);
    expect(screen.getByText("Peanuts")).toBeInTheDocument();
  });
});
