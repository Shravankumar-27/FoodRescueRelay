import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { expect, it, vi } from "vitest";
import { AuthProvider } from "../features/auth/AuthContext";
import { ToastProvider } from "../features/toast/ToastContext";
import { ApiError, apiRequest } from "../lib/api";
import SignupPage from "../pages/SignupPage";

vi.mock("../lib/api", async (importOriginal) => ({
  ...await importOriginal<typeof import("../lib/api")>(),
  apiRequest: vi.fn(),
}));

it("keeps signup details after an error and opens the workspace after successful signup", async () => {
  const submitSignup = vi.fn()
    .mockRejectedValueOnce(new ApiError("EMAIL_IN_USE", "An account already uses this email.", 409))
    .mockResolvedValueOnce({ token: "new-session", user: { role: "RECEIVER" }, organization: {} });
  vi.mocked(apiRequest).mockImplementation((path, options) => {
    if (path === "/auth/signup/localities") return Promise.resolve(["Madhapur"]) as ReturnType<typeof apiRequest>;
    return submitSignup(path, options);
  });

  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={["/signup"]}>
        <ToastProvider>
          <AuthProvider>
            <Routes>
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/" element={<h1>Workspace</h1>} />
            </Routes>
          </AuthProvider>
        </ToastProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );

  await screen.findByText("Madhapur", { selector: "option" }, { timeout: 5000 });
  expect(screen.queryByLabelText("Latitude")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Longitude")).not.toBeInTheDocument();
  const values = {
    "Full name": "Priya Rao",
    "Work email": "used@example.com",
    Password: "test-passphrase",
    "Organization name": "Community Meals",
    "Organization type": "COMMUNITY_KITCHEN",
    "Street address": "Plot 12, Silicon Valley Road",
    "Hyderabad neighborhood": "Madhapur",
  };
  for (const [label, value] of Object.entries(values)) {
    fireEvent.change(screen.getByLabelText(label, { exact: true }), { target: { value } });
  }

  fireEvent.click(screen.getByRole("button", { name: "Create account" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("An account already uses this email.");
  expect(screen.getByLabelText("Street address")).toHaveValue("Plot 12, Silicon Valley Road");

  fireEvent.change(screen.getByLabelText("Work email"), { target: { value: "priya@example.com" } });
  fireEvent.click(screen.getByRole("button", { name: "Create account" }));
  expect(await screen.findByRole("heading", { name: "Workspace" })).toBeInTheDocument();
  expect(submitSignup).toHaveBeenLastCalledWith("/auth/signup", {
    method: "POST",
    body: {
      name: "Priya Rao",
      email: "priya@example.com",
      password: "test-passphrase",
      organization_name: "Community Meals",
      organization_type: "COMMUNITY_KITCHEN",
      locality: "Madhapur",
      street_address: "Plot 12, Silicon Valley Road",
    },
  });
  expect(JSON.parse(localStorage.getItem("rr.session") ?? "null")).toMatchObject({ token: "new-session" });
  localStorage.removeItem("rr.session");
});
