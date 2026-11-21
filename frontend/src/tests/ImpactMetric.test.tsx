import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import ImpactMetric from "../components/impact/ImpactMetric";

afterEach(cleanup);

describe("ImpactMetric", () => {
  it("renders the label and value", () => {
    render(<ImpactMetric label="Servings rescued" value={132} />);
    expect(screen.getByText("Servings rescued")).toBeInTheDocument();
    expect(screen.getByText("132")).toBeInTheDocument();
  });
});
