import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "../lib/api";

function deferredResponse() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((done) => { resolve = done; });
  return { promise, resolve: (data: unknown) => resolve(new Response(JSON.stringify({ success: true, data }))) };
}

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("API request sharing", () => {
  it("shares simultaneous reads but never caches settled responses", async () => {
    const response = deferredResponse();
    const fetch = vi.fn().mockReturnValue(response.promise);
    vi.stubGlobal("fetch", fetch);
    const first = apiRequest("/nearby", { token: "donor-a" });
    const duplicate = apiRequest("/nearby", { token: "donor-a" });
    expect(first).toBe(duplicate);
    response.resolve(["receiver"]);
    expect(await first).toEqual(["receiver"]);
    fetch.mockResolvedValue(new Response(JSON.stringify({ success: true, data: ["updated"] })));
    expect(await apiRequest("/nearby", { token: "donor-a" })).toEqual(["updated"]);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("isolates accounts and URLs", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => new Response(JSON.stringify({ success: true, data: [] }))));
    await Promise.all([
      apiRequest("/nearby", { token: "a" }), apiRequest("/nearby", { token: "b" }),
      apiRequest("/nearby?diet=VEG", { token: "a" }),
    ]);
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("refreshes after writes even when an older read is still pending", async () => {
    const before = deferredResponse(), write = deferredResponse(), during = deferredResponse();
    const fetch = vi.fn().mockReturnValueOnce(before.promise).mockReturnValueOnce(write.promise)
      .mockReturnValueOnce(during.promise).mockImplementation(async () => new Response(JSON.stringify({ success: true, data: "new" })));
    vi.stubGlobal("fetch", fetch);
    const oldRead = apiRequest("/capacity");
    const mutation = apiRequest("/capacity", { method: "PUT", body: {} });
    const duringRead = apiRequest("/capacity");
    write.resolve("saved");
    await mutation;
    expect(await apiRequest("/capacity")).toBe("new");
    before.resolve("old"); during.resolve("old");
    await Promise.all([oldRead, duringRead]);
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it("retries a failed read and never coalesces mutations", async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new TypeError("network"))
      .mockImplementation(async () => new Response(JSON.stringify({ success: true, data: "ok" })));
    vi.stubGlobal("fetch", fetch);
    await expect(apiRequest("/retry")).rejects.toMatchObject({ code: "OFFLINE" });
    expect(await apiRequest("/retry")).toBe("ok");
    await Promise.all([apiRequest("/save", { method: "POST" }), apiRequest("/save", { method: "POST" })]);
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it("times out stalled reads and allows retry", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn().mockImplementation((_url, options: RequestInit) => new Promise((_resolve, reject) => {
      options.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    })));
    const expectation = expect(apiRequest("/stalled")).rejects.toMatchObject({ code: "TIMEOUT" });
    await vi.advanceTimersByTimeAsync(20000);
    await expectation;
    expect(vi.getTimerCount()).toBe(0);
  });
});
