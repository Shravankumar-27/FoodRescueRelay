import { useEffect } from "react";
import { isCancelledError, useQueryClient } from "@tanstack/react-query";
import { useToast } from "./ToastContext";

export default function ApiErrorToasts() {
  const client = useQueryClient();
  const { error: toastError } = useToast();

  useEffect(() => {
    const shown = new Map<string, number>();
    const queries = client.getQueryCache().subscribe(event => {
      if (event.type !== "updated" || event.action.type !== "error" || event.query.meta?.silent || event.query.meta?.errorDisplay === "inline") return;
      if (isCancelledError(event.action.error)) return;
      const message = event.action.error.message;
      const now = Date.now();
      for (const [key, at] of shown) {
        if (now - at >= 15000) shown.delete(key);
      }
      if (shown.has(message)) return;
      shown.set(message, now);
      toastError(message);
    });
    const mutations = client.getMutationCache().subscribe(event => {
      if (event.type === "updated" && event.action.type === "error" && !event.mutation.meta?.silent && event.mutation.meta?.errorDisplay !== "inline" && !isCancelledError(event.action.error)) {
        toastError(event.action.error.message);
      }
    });
    return () => { queries(); mutations(); };
  }, [client, toastError]);

  return null;
}
