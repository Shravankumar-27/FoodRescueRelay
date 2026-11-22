import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import LoginPage from "../pages/LoginPage";
import { AuthProvider } from "../features/auth/AuthContext";
import { ToastProvider } from "../features/toast/ToastContext";
import { ApiError, apiRequest } from "../lib/api";

vi.mock("../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/api")>();
  return { ...actual, apiRequest: vi.fn() };
});

describe("LoginPage", () => {
  it("shows an error toast when sign-in is rejected", async () => {
    vi.mocked(apiRequest).mockRejectedValue(
      new ApiError("INVALID_CREDENTIALS", "Invalid email or password.", 401),
    );

    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <AuthProvider>
            <ToastProvider><LoginPage /></ToastProvider>
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Email"), "donor@rescuerelay.demo");
    await user.type(screen.getByLabelText("Password"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Invalid email or password.");
  });
});
