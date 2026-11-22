import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, expect, it } from "vitest";
import BackButton from "../components/ui/BackButton";

afterEach(cleanup);

it("returns to the actual previous page", () => {
  render(<MemoryRouter initialEntries={["/history", "/detail"]}><Routes>
    <Route path="/history" element={<p>Your history</p>}/>
    <Route path="/detail" element={<BackButton fallback="/home"/>}/>
  </Routes></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "Back" }));
  expect(screen.getByText("Your history")).toBeInTheDocument();
});

it("uses the dashboard fallback when opened directly", () => {
  render(<MemoryRouter initialEntries={["/detail"]}><Routes>
    <Route path="/home" element={<p>Your dashboard</p>}/>
    <Route path="/detail" element={<BackButton fallback="/home"/>}/>
  </Routes></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "Back" }));
  expect(screen.getByText("Your dashboard")).toBeInTheDocument();
});
