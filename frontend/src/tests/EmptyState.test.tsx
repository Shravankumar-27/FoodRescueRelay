import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import EmptyState from "../components/ui/EmptyState";

afterEach(cleanup);

describe("EmptyState", () => {
  it("renders the title and description", () => {
    render(<EmptyState title="No offers yet" body="Check back in a few minutes." />);
    expect(screen.getByRole("heading", { name: "No offers yet" })).toBeInTheDocument();
    expect(screen.getByText("Check back in a few minutes.")).toBeInTheDocument();
  });
});
