import { QueryClient, QueryClientProvider, useMutation, useQuery } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import ApiErrorToasts from "../features/toast/ApiErrorToasts";
import { ToastProvider } from "../features/toast/ToastContext";

afterEach(cleanup);

function ErrorExample({ inline, mutation = false }: { inline: boolean; mutation?: boolean }) {
  const meta = inline ? { errorDisplay: "inline" } : undefined;
  const fail = async () => { throw new Error("Please check the servings."); };
  const query = useQuery({ queryKey: ["example"], queryFn: fail, meta, enabled: !mutation });
  const save = useMutation({ mutationFn: fail, meta });
  const error = mutation ? save.error : query.error;
  return <><button onClick={() => save.mutate()}>Save</button>{inline && error && <p role="alert">{error.message}</p>}</>;
}

it.each([false, true])("shows an inline error once, without a toast (mutation=%s)", async mutation => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><ToastProvider><ApiErrorToasts/><ErrorExample inline mutation={mutation}/></ToastProvider></QueryClientProvider>);
  if (mutation) fireEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Please check the servings.");
  expect(screen.getAllByText("Please check the servings.")).toHaveLength(1);
  expect(screen.queryByRole("button", { name: "Dismiss notification" })).not.toBeInTheDocument();
  client.clear();
});

it("keeps a toast for errors that have no inline message", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><ToastProvider><ApiErrorToasts/><ErrorExample inline={false}/></ToastProvider></QueryClientProvider>);
  expect(await screen.findByRole("alert")).toHaveTextContent("Please check the servings.");
  expect(screen.getByRole("button", { name: "Dismiss notification" })).toBeInTheDocument();
  client.clear();
});
